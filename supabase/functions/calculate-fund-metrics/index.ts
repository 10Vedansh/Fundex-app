import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE = 0.065;
const MIN_DATA_POINTS = 3;
const SCHEME_BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Metric Calculators
// ---------------------------------------------------------------------------

function findNavBefore(navDates: { nav: number; date: Date }[], target: Date): number | null {
  for (const entry of navDates) {
    if (entry.date <= target) return entry.nav;
  }
  return null;
}

function calcSimpleReturn(navDates: { nav: number; date: Date }[], latestNav: number, lookbackDays: number): number | null {
  const target = new Date(navDates[navDates.length - 1].date);
  target.setDate(target.getDate() - lookbackDays);
  const past = findNavBefore([...navDates].reverse(), target);
  if (past === null || past === 0) return null;
  return (latestNav - past) / past;
}

function calcCagr(navDates: { nav: number; date: Date }[], latestNav: number, lookbackDays: number, years: number): number | null {
  const target = new Date(navDates[navDates.length - 1].date);
  target.setDate(target.getDate() - lookbackDays);
  const past = findNavBefore([...navDates].reverse(), target);
  if (past === null || past === 0) return null;
  return Math.pow(latestNav / past, 1.0 / years) - 1.0;
}

function calcDailyLogReturns(navs: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < navs.length; i++) {
    if (navs[i - 1] > 0 && navs[i] > 0) {
      returns.push(Math.log(navs[i] / navs[i - 1]));
    }
  }
  return returns;
}

function calcAnnualizedVol(logReturns: number[], nTradingDays: number): number | null {
  const recent = logReturns.length > nTradingDays ? logReturns.slice(-nTradingDays) : logReturns;
  if (recent.length < 2) return null;
  const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
  const variance = recent.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (recent.length - 1);
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function calcMaxDrawdown(navs: number[]): number {
  let peak = navs[0];
  let mdd = 0;
  for (const n of navs) {
    if (n > peak) peak = n;
    const dd = (peak - n) / peak;
    if (dd > mdd) mdd = dd;
  }
  return mdd;
}

function calcSharpe(cagr: number | null, vol: number | null, rf: number): number | null {
  if (vol === null || vol === 0 || cagr === null) return null;
  return (cagr - rf) / vol;
}

function calcDownsideDev(logReturns: number[], nTradingDays: number, target = 0): number | null {
  const recent = logReturns.length > nTradingDays ? logReturns.slice(-nTradingDays) : logReturns;
  if (recent.length < 2) return null;
  const downside = recent.filter(r => r < target).map(r => r - target);
  if (downside.length < 2) return null;
  const dVar = downside.reduce((sum, d) => sum + d * d, 0) / (recent.length - 1);
  return Math.sqrt(dVar) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

function calcSortino(cagr: number | null, dd: number | null, rf: number): number | null {
  if (dd === null || dd === 0 || cagr === null) return null;
  return (cagr - rf) / dd;
}

function groupMonthlyReturns(navs: number[], dates: Date[]): number[] {
  const monthly = new Map<string, { nav: number; date: Date }>();
  for (let i = 0; i < navs.length; i++) {
    const key = `${dates[i].getFullYear()}-${dates[i].getMonth()}`;
    const existing = monthly.get(key);
    if (!existing || dates[i] > existing.date) {
      monthly.set(key, { nav: navs[i], date: dates[i] });
    }
  }
  const sortedMonths = Array.from(monthly.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const returns: number[] = [];
  for (let i = 1; i < sortedMonths.length; i++) {
    const prev = sortedMonths[i - 1][1].nav;
    const curr = sortedMonths[i][1].nav;
    if (prev > 0) returns.push((curr - prev) / prev);
  }
  return returns;
}

function calcConsistency(navs: number[], dates: Date[]): number | null {
  const monthly = groupMonthlyReturns(navs, dates);
  if (monthly.length < 6) return null;
  const window = monthly.slice(-36);
  const pos = window.filter(r => r > 0).length;
  return pos / window.length;
}

function calcConfidence(totalPoints: number, firstDate: Date, lastDate: Date): number {
  if (totalPoints < MIN_DATA_POINTS || firstDate >= lastDate) return 0;
  const spanDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  const expected = (spanDays / 7) * 5;
  const ratio = expected > 0 ? totalPoints / expected : 0;
  return Math.min(1, Math.max(0, ratio));
}

// ---------------------------------------------------------------------------
// Recommendation Score Calculator
// ---------------------------------------------------------------------------
// Normalizes each metric to 0-100 using clamped reasonable bounds, then
// applies weighted average: CAGR 30%, Sharpe 25%, Sortino 25%, Volatility 15%, Expense 5%.
// When expense_ratio is unavailable its weight is redistributed proportionally.

const BOUNDS = {
  cagr: { min: -0.3, max: 0.5 },
  sharpe: { min: -5, max: 5 },
  sortino: { min: -20, max: 20 },
  vol: { min: 0, max: 0.4 },
  expense: { min: 0, max: 0.025 },
};

function normalizeHigher(value: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return 50;
  return Math.max(0, Math.min(100, ((value - min) / range) * 100));
}

function normalizeLower(value: number, min: number, max: number): number {
  const range = max - min;
  if (range === 0) return 50;
  return Math.max(0, Math.min(100, (1 - (value - min) / range) * 100));
}

function calcRecommendationScore(metrics: {
  cagr_1y: number | null;
  sharpe_1y: number | null;
  sortino_1y: number | null;
  volatility_1y: number | null;
  expense_ratio: number | null;
}): number | null {
  const { cagr_1y, sharpe_1y, sortino_1y, volatility_1y, expense_ratio } = metrics;

  // Must have at least CAGR, Sharpe, and Sortino to score
  if (cagr_1y === null || sharpe_1y === null || sortino_1y === null) return null;

  const cagrScore = normalizeHigher(cagr_1y, BOUNDS.cagr.min, BOUNDS.cagr.max);
  const sharpeScore = normalizeHigher(sharpe_1y, BOUNDS.sharpe.min, BOUNDS.sharpe.max);
  const sortinoScore = normalizeHigher(sortino_1y, BOUNDS.sortino.min, BOUNDS.sortino.max);
  const volScore = volatility_1y !== null
    ? normalizeLower(volatility_1y, BOUNDS.vol.min, BOUNDS.vol.max)
    : null;
  const expScore = expense_ratio !== null
    ? normalizeLower(expense_ratio, BOUNDS.expense.min, BOUNDS.expense.max)
    : null;

  // Base weights
  let wCagr = 0.30;
  let wSharpe = 0.25;
  let wSortino = 0.25;
  let wVol = 0.15;
  let wExp = 0.05;

  let activeWeight = wCagr + wSharpe + wSortino;
  if (volScore !== null) activeWeight += wVol;
  if (expScore !== null) activeWeight += wExp;

  if (activeWeight === 0) return null;

  // Redistribute missing component weights proportionally
  let score = cagrScore * wCagr + sharpeScore * wSharpe + sortinoScore * wSortino;
  if (volScore !== null) score += volScore * wVol;
  if (expScore !== null) score += expScore * wExp;

  const normalized = score / activeWeight;
  return Math.round(normalized * 10000) / 100;
}

// ---------------------------------------------------------------------------
// Metrics computation for a single scheme
// ---------------------------------------------------------------------------

interface NavRow {
  nav: number | null;
  nav_date: string;
  scheme_name: string;
}

function computeSchemeMetrics(schemeCode: string, schemeName: string, navRows: NavRow[]) {
  if (navRows.length < MIN_DATA_POINTS) return null;

  const navs: number[] = [];
  const dates: Date[] = [];

  const sorted = navRows.sort((a, b) => new Date(a.nav_date).getTime() - new Date(b.nav_date).getTime());

  for (const row of sorted) {
    if (row.nav !== null && row.nav > 0) {
      navs.push(row.nav);
      dates.push(new Date(row.nav_date));
    }
  }

  if (navs.length < MIN_DATA_POINTS) return null;

  const logReturns = calcDailyLogReturns(navs);
  if (logReturns.length < 2) return null;

  const navDatesList = navs.map((n, i) => ({ nav: n, date: dates[i] }));
  const latestNav = navs[navs.length - 1];

  const return_1m = calcSimpleReturn(navDatesList, latestNav, 30);
  const return_3m = calcSimpleReturn(navDatesList, latestNav, 90);
  const return_6m = calcSimpleReturn(navDatesList, latestNav, 180);
  const sanitizeCagr = (v: number | null): number | null =>
    v !== null && (v > 5 || v < -1) ? null : v;

  const cagr_1y = sanitizeCagr(calcCagr(navDatesList, latestNav, 365, 1));
  const cagr_3y = sanitizeCagr(calcCagr(navDatesList, latestNav, 365 * 3, 3));
  const cagr_5y = sanitizeCagr(calcCagr(navDatesList, latestNav, 365 * 5, 5));

  const vol_1y = calcAnnualizedVol(logReturns, TRADING_DAYS_PER_YEAR);
  const vol_3y = calcAnnualizedVol(logReturns, TRADING_DAYS_PER_YEAR * 3);
  const vol_5y = calcAnnualizedVol(logReturns, TRADING_DAYS_PER_YEAR * 5);

  const max_dd = calcMaxDrawdown(navs);

  const sharpe_1y = calcSharpe(cagr_1y, vol_1y, RISK_FREE_RATE);
  const sharpe_3y = calcSharpe(cagr_3y, vol_3y, RISK_FREE_RATE);
  const sharpe_5y = calcSharpe(cagr_5y, vol_5y, RISK_FREE_RATE);

  const dd_1y = calcDownsideDev(logReturns, TRADING_DAYS_PER_YEAR);
  const dd_3y = calcDownsideDev(logReturns, TRADING_DAYS_PER_YEAR * 3);
  const dd_5y = calcDownsideDev(logReturns, TRADING_DAYS_PER_YEAR * 5);

  const sortino_1y = calcSortino(cagr_1y, dd_1y, RISK_FREE_RATE);
  const sortino_3y = calcSortino(cagr_3y, dd_3y, RISK_FREE_RATE);
  const sortino_5y = calcSortino(cagr_5y, dd_5y, RISK_FREE_RATE);

  const consistency = calcConsistency(navs, dates);
  const confidence = calcConfidence(navs.length, dates[0], dates[dates.length - 1]);

  // Note: expense_ratio not available in NAV data pipeline.
  // Will be updated separately by the enrichment pipeline in recommendation_universe.
  // Use 0.015 (1.5%) as default — industry average expense ratio for active funds.
  const defaultExpense = 0.015;
  const recommendation_score = calcRecommendationScore({
    cagr_1y,
    sharpe_1y,
    sortino_1y,
    volatility_1y: vol_1y,
    expense_ratio: null, // null triggers weight redistribution below
  });

  return {
    scheme_code: schemeCode,
    scheme_name: schemeName,
    return_1m,
    return_3m,
    return_6m,
    cagr_1y,
    cagr_3y,
    cagr_5y,
    volatility_1y: vol_1y,
    volatility_3y: vol_3y,
    volatility_5y: vol_5y,
    max_drawdown: max_dd,
    sharpe_ratio_1y: sharpe_1y,
    sharpe_ratio_3y: sharpe_3y,
    sharpe_ratio_5y: sharpe_5y,
    sortino_ratio_1y: sortino_1y,
    sortino_ratio_3y: sortino_3y,
    sortino_ratio_5y: sortino_5y,
    consistency_score: consistency,
    confidence_score: confidence,
    recommendation_score,
    first_nav_date: dates[0].toISOString().slice(0, 10),
    last_nav_date: dates[dates.length - 1].toISOString().slice(0, 10),
    total_data_points: navs.length,
    last_calculated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body for full_rebuild mode
    let fullRebuild = false;
    try {
      const body = await req.json();
      fullRebuild = body.full_rebuild === true;
    } catch {
      // No body or invalid JSON; default to incremental
    }

    console.log(`[METRICS] Starting fund metrics calculation (mode: ${fullRebuild ? "full_rebuild" : "incremental"})...`);

    // Step 1: Get distinct scheme codes from nav_history
    let schemeCodes: { scheme_code: string; scheme_name: string }[];

    if (fullRebuild) {
      // Full rebuild: try RPC first, fallback to paginated query
      const { data: schemes, error: schemesError } = await supabase
        .rpc("get_distinct_nav_schemes" as any);

      if (schemesError || !schemes) {
        console.log("[METRICS] RPC not found, querying nav_history directly...");
        const { data: raw } = await supabase
          .from("nav_history")
          .select("scheme_code, scheme_name")
          .limit(1);

        if (!raw || raw.length === 0) {
          console.log("[METRICS] No schemes found in nav_history");
          return new Response(
            JSON.stringify({ success: true, processed_funds_count: 0, updated_funds_count: 0, execution_time: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const allSchemes: { scheme_code: string; scheme_name: string }[] = [];
        let offset = 0;
        const pageSize = 1000;
        while (true) {
          const { data: page } = await supabase
            .from("nav_history")
            .select("scheme_code, scheme_name")
            .range(offset, offset + pageSize - 1)
            .limit(pageSize);
          if (!page || page.length === 0) break;
          for (const row of page) {
            if (!allSchemes.find(s => s.scheme_code === row.scheme_code)) {
              allSchemes.push(row);
            }
          }
          offset += pageSize;
        }
        schemeCodes = allSchemes;
      } else {
        schemeCodes = (schemes as any[]).map(s => ({
          scheme_code: s.scheme_code,
          scheme_name: s.scheme_name || "",
        }));
      }
    } else {
      // Incremental: only schemes with nav_history updated in last 24 hours
      console.log("[METRICS] Incremental mode: querying schemes updated in last 24 hours...");
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const allSchemes: { scheme_code: string; scheme_name: string }[] = [];
      let offset = 0;
      const pageSize = 1000;
      while (true) {
        const { data: page } = await supabase
          .from("nav_history")
          .select("scheme_code, scheme_name")
          .gte("created_at", cutoff)
          .range(offset, offset + pageSize - 1)
          .limit(pageSize);
        if (!page || page.length === 0) break;
        for (const row of page) {
          if (!allSchemes.find(s => s.scheme_code === row.scheme_code)) {
            allSchemes.push(row);
          }
        }
        offset += pageSize;
      }
      schemeCodes = allSchemes;
    }

    console.log(`[METRICS] Found ${schemeCodes.length} distinct schemes in nav_history`);

    // Step 2: Process schemes in batches
    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const upsertBatch: any[] = [];

    for (let i = 0; i < schemeCodes.length; i += SCHEME_BATCH_SIZE) {
      const batchSchemes = schemeCodes.slice(i, i + SCHEME_BATCH_SIZE);
      const schemeCodesList = batchSchemes.map(s => s.scheme_code);

      // Fetch NAV data for this batch
      const { data: navData, error: navError } = await supabase
        .from("nav_history")
        .select("scheme_code, scheme_name, nav, nav_date")
        .in("scheme_code", schemeCodesList)
        .order("nav_date", { ascending: true });

      if (navError) {
        console.error(`[METRICS] Error fetching NAV data: ${navError.message}`);
        errors += batchSchemes.length;
        continue;
      }

      if (!navData || navData.length === 0) continue;

      // Group by scheme_code
      const schemeNavMap = new Map<string, NavRow[]>();
      const schemeNameMap = new Map<string, string>();
      for (const row of navData) {
        if (!schemeNavMap.has(row.scheme_code)) {
          schemeNavMap.set(row.scheme_code, []);
          schemeNameMap.set(row.scheme_code, row.scheme_name || "");
        }
        schemeNavMap.get(row.scheme_code)!.push({
          nav: row.nav,
          nav_date: row.nav_date,
          scheme_name: row.scheme_name || "",
        });
      }

      for (const [sc, rows] of schemeNavMap) {
        const sname = schemeNameMap.get(sc) || "";
        const metrics = computeSchemeMetrics(sc, sname, rows);
        if (metrics) {
          upsertBatch.push(metrics);
          updated++;
        } else {
          skipped++;
        }
        processed++;
      }

      // Flush upsert batch periodically
      if (upsertBatch.length >= 500) {
        const { error: upsertError } = await supabase
          .from("fund_metrics")
          .upsert(upsertBatch, { onConflict: "scheme_code", ignoreDuplicates: false });

        if (upsertError) {
          console.error(`[METRICS] Upsert error: ${upsertError.message}`);
        }
        upsertBatch.length = 0;
      }

      if ((i / SCHEME_BATCH_SIZE) % 10 === 0) {
        console.log(`[METRICS] Progress: ${processed}/${schemeCodes.length} schemes (${updated} updated, ${skipped} skipped, ${errors} errors)`);
      }
    }

    // Final upsert
    if (upsertBatch.length > 0) {
      const { error: finalError } = await supabase
        .from("fund_metrics")
        .upsert(upsertBatch, { onConflict: "scheme_code", ignoreDuplicates: false });

      if (finalError) {
        console.error(`[METRICS] Final upsert error: ${finalError.message}`);
      }
    }

    const executionTime = Date.now() - startTime;

    console.log("");
    console.log("=== Fund Metrics Calculation Summary ===");
    console.log(`Total schemes processed:  ${processed}`);
    console.log(`Metrics updated:          ${updated}`);
    console.log(`Skipped (<60 data pts):   ${skipped}`);
    console.log(`Errors:                   ${errors}`);
    console.log(`Execution time:           ${executionTime}ms`);
    console.log("========================================");

    return new Response(
      JSON.stringify({
        success: true,
        processed_funds_count: processed,
        updated_funds_count: updated,
        execution_time: executionTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[METRICS] Fatal error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        execution_time: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
