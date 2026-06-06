import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    
    if (!phoneNumber || !/^\+?\d{10,15}$/.test(phoneNumber.replace(/\s/g, ''))) {
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
      .eq('phone_number', phoneNumber)
      .gte('created_at', tenMinAgo);

    if (recentAttempts && recentAttempts.length >= 3) {
      return new Response(JSON.stringify({ error: 'Too many OTP requests. Try again in 10 minutes.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + 'cifraa_otp_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashedOtp = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store in database
    const expiryTime = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabase.from('otp_records').insert({
      phone_number: phoneNumber,
      hashed_otp: hashedOtp,
      expires_at: expiryTime,
      attempt_count: 0,
      verified: false,
    });

    // Send OTP via RapidAPI
    const response = await fetch('https://sms-verify3.p.rapidapi.com/send-numeric-verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      body: JSON.stringify({
        phoneNumber: phoneNumber,
        otpLength: 6,
        channel: 'sms',
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('RapidAPI error:', errBody);
      throw new Error(`SMS send failed [${response.status}]`);
    }

    return new Response(JSON.stringify({ success: true, message: 'OTP sent successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('send-otp error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Failed to send OTP' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
