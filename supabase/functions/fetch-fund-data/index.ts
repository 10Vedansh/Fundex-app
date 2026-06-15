import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt";

async function fetchLatestNAVs() {
  const navMap = new Map();
  try {
    const response = await fetch(AMFI_NAV_URL);
    if (!response.ok) return navMap;
    const text = await response.text();
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.includes("Scheme Code;") || !trimmed.includes(";")) continue;
      const parts = trimmed.split(";");
      if (parts.length >= 6) {
        const schemeName = parts[3]?.trim();
        const navStr = parts[4]?.trim();
        const navDate = parts[5]?.trim();
        if (!schemeName || !navStr || navStr === "N.A." || navStr === "-") continue;
        const nav = parseFloat(navStr);
        if (isNaN(nav) || nav <= 0) continue;
        navMap.set(schemeName.toLowerCase().replace(/\s+/g, " ").trim(), { nav, date: navDate });
      }
    }
  } catch (_err) {}
  return navMap;
}

function enrichWithAMFI(funds, navMap) {
  let enriched = 0;
  for (const fund of funds) {
    const normalizedName = fund.name?.toLowerCase().replace(/\s+/g, " ").trim();
    if (!normalizedName) continue;
    let match = navMap.get(normalizedName);
    if (!match) {
      for (const [key, val] of navMap) {
        if (key.includes(normalizedName) || normalizedName.includes(key)) {
          match = val;
          break;
        }
      }
    }
    if (match) {
      fund.previousNav = fund.latestNav || fund.nav;
      fund.latestNav = match.nav;
      fund.nav = match.nav;
      fund.navDate = match.date;
      enriched++;
    }
  }
  return funds;
}

async function handleMasterSource(supabase, url) {
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const perPage = parseInt(url.searchParams.get("per_page") || "200", 10);
  const search = url.searchParams.get("search") || "";
  const category = url.searchParams.get("category") || "";
  const amc = url.searchParams.get("amc") || "";
  const activeOnly = url.searchParams.get("active_only") !== "false";
  const sortBy = url.searchParams.get("sort_by") || "scheme_code";
  const sortDir = url.searchParams.get("sort_dir") || "asc";

  const offset = (page - 1) * perPage;

  let query = supabase.from("fund_master_enriched").select("*", { count: "exact" });

  // Filters
  if (search) {
    query = query.or(`scheme_name.ilike.%${search}%,workbook_name.ilike.%${search}%,amc.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (amc) {
    query = query.eq("amc", amc);
  }
  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  // Sorting
  const allowedSortFields = ["scheme_code", "cagr_1y", "cagr_3y", "cagr_5y", "sharpe_ratio_3y", "sortino_ratio_3y", "expense_ratio", "aum", "confidence_score", "recommendation_score"];
  const actualSort = allowedSortFields.includes(sortBy) ? sortBy : "scheme_code";
  query = query.order(actualSort, { ascending: sortDir === "asc", nullsFirst: false });

  const { data, error, count } = await query.range(offset, offset + perPage - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({
    funds: data || [],
    count: count || 0,
    page,
    perPage,
    totalPages: count ? Math.ceil(count / perPage) : 0,
    source: "fund_master",
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleWorkbookSource(supabase, action) {
  if (action === "check") {
    let { data: cache } = await supabase.from("fund_cache").select("last_updated, expires_at").eq("cache_key", "workbook_data").single();
    if (!cache) {
      const { data: oldCache } = await supabase.from("fund_cache").select("last_updated, expires_at").eq("cache_key", "mf_data").single();
      return new Response(JSON.stringify({ needsRefresh: !oldCache, lastUpdated: oldCache?.last_updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ needsRefresh: false, lastUpdated: cache.last_updated }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (action === "cached") {
    let cacheResult = await supabase.from("fund_cache").select("data, last_updated").eq("cache_key", "workbook_data").single();
    if (cacheResult.error || !Array.isArray(cacheResult.data?.data) || cacheResult.data.data.length === 0) {
      cacheResult = await supabase.from("fund_cache").select("data, last_updated").eq("cache_key", "mf_data").single();
    }
    if (cacheResult.error || !Array.isArray(cacheResult.data?.data) || cacheResult.data.data.length === 0) {
      return new Response(JSON.stringify({ funds: [], error: "No cache available" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ funds: cacheResult.data.data, lastUpdated: cacheResult.data.last_updated, source: "cache" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let { data: workbookCache } = await supabase.from("fund_cache").select("data, last_updated").eq("cache_key", "workbook_data").single();
  if (!workbookCache || !Array.isArray(workbookCache.data) || workbookCache.data.length === 0) {
    const { data: oldCache } = await supabase.from("fund_cache").select("data, last_updated").eq("cache_key", "mf_data").single();
    if (oldCache && Array.isArray(oldCache.data) && oldCache.data.length > 0) {
      return new Response(JSON.stringify({ funds: oldCache.data, lastUpdated: oldCache.last_updated, source: "legacy_cache" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ funds: [], error: "No workbook data found. Run process-workbook first." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let funds = workbookCache.data;
  const navMap = await fetchLatestNAVs();
  if (navMap.size > 0) funds = enrichWithAMFI(funds, navMap);

  const now = new Date();
  await supabase.from("fund_cache").delete().eq("cache_key", "mf_data");
  await supabase.from("fund_cache").insert({ cache_key: "mf_data", data: funds, last_updated: now.toISOString(), expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString() });

  return new Response(JSON.stringify({ funds, count: funds.length, source: "workbook+amfi", lastUpdated: now.toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "full";
    const source = url.searchParams.get("source") || "workbook";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Dispatch to the appropriate handler based on source
    if (source === "master") {
      return await handleMasterSource(supabase, url);
    }

    // Legacy workbook source (default for backward compatibility)
    return await handleWorkbookSource(supabase, action);
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
