import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: file, error: dErr } = await sb.storage.from('data-files').download('funds.json');
    if (dErr || !file) throw new Error(dErr?.message || 'no file');
    const text = await file.text();
    const funds = JSON.parse(text);
    const now = new Date();
    const exp = new Date(now.getTime() + 365 * 86400000);
    for (const k of ['workbook_data', 'mf_data']) {
      await sb.from('fund_cache').delete().eq('cache_key', k);
      const { error } = await sb.from('fund_cache').insert({
        cache_key: k, data: funds, last_updated: now.toISOString(), expires_at: exp.toISOString(),
      });
      if (error) throw new Error(`${k}: ${error.message}`);
    }
    return new Response(JSON.stringify({ success: true, total: funds.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
