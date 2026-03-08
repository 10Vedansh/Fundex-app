import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const normalizePhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+91${digits}`; // default India for local 10-digit input
  return raw.startsWith('+') ? `+${digits}` : `+${digits}`;
};

const candidateTargets = (normalizedE164: string) => {
  const digits = normalizedE164.replace(/\D/g, '');
  const list = [normalizedE164, digits, digits.startsWith('91') ? digits.slice(2) : digits];
  return [...new Set(list.filter(Boolean))];
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
    const RAPIDAPI_HOST = Deno.env.get('RAPIDAPI_HOST') || 'sms-verify3.p.rapidapi.com';

    if (!RAPIDAPI_KEY) {
      throw new Error('RAPIDAPI_KEY not configured');
    }

    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return new Response(JSON.stringify({ error: 'Phone number is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const normalizedPhone = normalizePhone(phoneNumber);
    if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
      return new Response(JSON.stringify({ error: 'Invalid phone number format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Rate limiting: max 3 OTP requests per 10 minutes per number
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentAttempts } = await supabase
      .from('otp_records')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .gte('created_at', tenMinAgo);

    if (recentAttempts && recentAttempts.length >= 3) {
      return new Response(JSON.stringify({ error: 'Too many OTP requests. Try again in 10 minutes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit OTP (stored for local verification)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const encoder = new TextEncoder();
    const data = encoder.encode(otp + 'cifraa_otp_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashedOtp = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Persist OTP before attempting SMS
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { data: insertedOtp, error: insertError } = await supabase
      .from('otp_records')
      .insert({
        phone_number: normalizedPhone,
        hashed_otp: hashedOtp,
        expires_at: expiryTime,
        attempt_count: 0,
        verified: false,
      })
      .select('id')
      .single();

    if (insertError || !insertedOtp?.id) {
      throw new Error('Failed to persist OTP request');
    }

    // Try multiple target formats because provider may reject one format with estimate_cost_error
    const targets = candidateTargets(normalizedPhone);
    let sent = false;
    let lastStatus = 0;
    let lastBody = '';

    for (const target of targets) {
      const response = await fetch(`https://${RAPIDAPI_HOST}/send-numeric-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-rapidapi-key': RAPIDAPI_KEY,
          'x-rapidapi-host': RAPIDAPI_HOST,
        },
        body: JSON.stringify({
          target,
          code: otp,
        }),
      });

      const body = await response.text();
      console.log('RapidAPI try target:', target, 'status:', response.status, 'body:', body);
      lastStatus = response.status;
      lastBody = body;

      if (response.ok) {
        sent = true;
        break;
      }
    }

    if (!sent) {
      // Cleanup inserted OTP if SMS was not sent
      await supabase.from('otp_records').delete().eq('id', insertedOtp.id);

      let userMessage = 'Unable to send OTP right now. Please try again.';
      if (lastBody.includes('estimate_cost_error')) {
        userMessage = 'OTP provider could not process this number/country right now. Try format +91XXXXXXXXXX or try again later.';
      }

      return new Response(
        JSON.stringify({
          error: userMessage,
          provider_error: `SMS send failed [${lastStatus}]: ${lastBody}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ success: true, message: 'OTP sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-otp error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send OTP' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
