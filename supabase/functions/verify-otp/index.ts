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
    const { phoneNumber, otp } = await req.json();

    if (!phoneNumber || !otp) {
      return new Response(JSON.stringify({ error: 'Phone number and OTP are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch latest OTP record for this phone
    const { data: record, error: fetchErr } = await supabase
      .from('otp_records')
      .select('*')
      .eq('phone_number', phoneNumber)
      .eq('verified', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !record) {
      return new Response(JSON.stringify({ error: 'No OTP found. Please request a new one.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check expiry
    if (new Date(record.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'OTP expired. Please request a new one.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check attempt count
    if (record.attempt_count >= 5) {
      return new Response(JSON.stringify({ error: 'Too many failed attempts. Please request a new OTP.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Hash the provided OTP and compare
    const encoder = new TextEncoder();
    const data = encoder.encode(otp + 'cifraa_otp_salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashedOtp = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    if (hashedOtp !== record.hashed_otp) {
      // Increment attempt count
      await supabase
        .from('otp_records')
        .update({ attempt_count: record.attempt_count + 1 })
        .eq('id', record.id);

      return new Response(JSON.stringify({ error: 'Incorrect OTP. Please try again.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Success - mark as verified and delete record
    await supabase.from('otp_records').delete().eq('id', record.id);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Phone number verified successfully',
      phoneNumber 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('verify-otp error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Verification failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
