import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt";
const INSERT_BATCH_SIZE = 500;

interface NavRecord {
  scheme_code: string;
  scheme_name: string;
  nav: number | null;
  nav_date: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Fetching AMFI NAV data...");
    const response = await fetch(AMFI_NAV_URL);
    if (!response.ok) {
      throw new Error(`AMFI fetch failed: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.split("\n");
    console.log(`Downloaded ${lines.length} lines from AMFI`);

    const records: NavRecord[] = [];
    // Track distinct schemes for logging
    const schemeCodes = new Set<string>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      const parts = trimmed.split(";");
      if (parts.length < 6) continue;

      const schemeCode = parts[0]?.trim();
      if (!schemeCode || schemeCode === "Scheme Code") continue;
      if (!/^\d+$/.test(schemeCode)) continue;

      const schemeName = parts[3]?.trim();
      const navStr = parts[4]?.trim();
      const navDateStr = parts[5]?.trim();

      if (!schemeName || !navDateStr) continue;

      let nav: number | null = null;
      if (navStr && navStr !== "N.A." && navStr !== "-") {
        nav = parseFloat(navStr);
        if (isNaN(nav) || nav <= 0) nav = null;
      }

      schemeCodes.add(schemeCode);
      records.push({ scheme_code: schemeCode, scheme_name: schemeName, nav, nav_date: navDateStr });
    }

    const totalProcessed = records.length;
    console.log(`Parsed ${totalProcessed} NAV records across ${schemeCodes.size} schemes`);

    let insertedRows = 0;
    let skippedRows = 0;

    for (let i = 0; i < records.length; i += INSERT_BATCH_SIZE) {
      const batch = records.slice(i, i + INSERT_BATCH_SIZE);

      const { error, count } = await supabase
        .from("nav_history")
        .upsert(batch, {
          onConflict: "scheme_code, nav_date",
          ignoreDuplicates: true,
          count: "exact",
        });

      if (error) {
        console.error(`Batch insert error at offset ${i}:`, error.message);
        continue;
      }

      insertedRows += count ?? 0;
    }

    skippedRows = totalProcessed - insertedRows;
    const executionTime = Date.now() - startTime;

    console.log("");
    console.log("=== AMFI NAV Ingestion Summary ===");
    console.log(`Total funds processed:  ${totalProcessed}`);
    console.log(`Inserted rows:          ${insertedRows}`);
    console.log(`Skipped rows:           ${skippedRows}`);
    console.log(`Execution time:         ${executionTime}ms`);
    console.log("==================================");

    return new Response(
      JSON.stringify({
        success: true,
        totalProcessed,
        insertedRows,
        skippedRows,
        executionTimeMs: executionTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Ingestion error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTimeMs: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
