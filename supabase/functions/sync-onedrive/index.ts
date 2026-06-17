import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "npm:xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STORAGE_WORKBOOK_URL =
  "https://skvvltawshbphrgnqjzf.supabase.co/storage/v1/object/public/fund-data/Data.xlsx";

// ---- Column mappings (same as process-workbook) ----
const EQUITY_COLS = [
  'name', 'beta', 'alpha', 'category', 'launch', 'netAssets', 'marketCap',
  'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret1Y', 'ret3Y', 'ret5Y', 'ret10Y',
  'latestNav', 'previousNav', 'high52W', 'low52W',
  'expenseRatio', 'turnover', 'stdDev', 'sharpeRatio', 'sortinoRatio',
  'minInvestment', 'exitLoad', 'fundManager',
];

const DEBT_COLS = [
  'name', 'stdDev', 'beta', 'sharpeRatio', 'sortinoRatio', 'alpha',
  'category', 'launch', 'netAssets', 'avgCreditQuality', 'avgMaturity', 'ytm',
  'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret1Y', 'ret3Y', 'ret5Y', 'ret10Y',
  'latestNav', 'previousNav', 'high52W', 'low52W',
  'expenseRatio', 'minInvestment', 'exitLoad', 'fundManager',
];

const HYBRID_COLS = [
  'name', 'stdDev', 'sharpeRatio', 'sortinoRatio', 'beta', 'alpha',
  'category', 'launch', 'netAssets', 'avgCreditQuality', 'avgMaturity', 'ytm', 'marketCap',
  'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret1Y', 'ret3Y', 'ret5Y', 'ret10Y',
  'latestNav', 'previousNav', 'high52W', 'low52W',
  'expenseRatio', 'minInvestment', 'exitLoad', 'fundManager',
];

const COMMODITY_COLS = [
  'name', 'category', 'launch', 'netAssets',
  'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret1Y', 'ret3Y', 'ret5Y', 'ret10Y',
  'latestNav', 'previousNav', 'high52W', 'low52W',
  'expenseRatio', 'turnover', 'stdDev', 'sharpeRatio', 'sortinoRatio', 'beta', 'alpha',
  'minInvestment', 'exitLoad', 'fundManager',
];

const SHEET_CONFIG = [
  { name: 'Equity', cols: EQUITY_COLS, assetClass: 'Equity' },
  { name: 'Debt', cols: DEBT_COLS, assetClass: 'Debt' },
  { name: 'Hybrid', cols: HYBRID_COLS, assetClass: 'Hybrid' },
  { name: 'Commodities', cols: COMMODITY_COLS, assetClass: 'Commodities' },
];

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '' || val === '--' || val === '-' || val === 'N/A') return null;
  const str = String(val).replace(/,/g, '').trim();
  if (str === '`') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseExitLoad(val: unknown): string {
  if (!val || val === '--' || val === '-') return 'Nil';
  return String(val).trim();
}

function parseLaunchDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '' || val === '--' || val === '-' || val === 'N/A') return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().slice(0, 10);
  const str = String(val).replace(/,/g, '').trim();
  const serial = Number(str);
  if (Number.isFinite(serial) && serial > 59 && serial < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
  }
  return String(val).trim();
}

function getRiskLevel(category: string, stdDev: number | null): string {
  const cat = String(category).toLowerCase();
  if (cat.includes('liq') || cat.includes('overnht') || cat.includes('mm')) return 'Low';
  if (cat.includes('dt-') || cat.includes('debt')) {
    if (stdDev && stdDev > 5) return 'Moderate';
    return 'Low';
  }
  if (cat.includes('hy-')) {
    if (stdDev && stdDev > 12) return 'High';
    return 'Moderate';
  }
  if (cat.includes('gold') || cat.includes('silver')) return 'Moderate';
  if (stdDev && stdDev > 18) return 'High';
  if (stdDev && stdDev > 12) return 'Moderate';
  return 'Moderate';
}

function getStrengthBadge(sharpe: number | null): string {
  if (!sharpe) return 'Balanced';
  if (sharpe > 1.3) return 'Strong';
  if (sharpe > 0.7) return 'Balanced';
  return 'Risky';
}

function generateId(name: string, index: number): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) + '_' + index;
}

function extractAmc(name: string): string {
  const patterns = [
    /^(.*?)\s+(Liquid|Overnight|Money|Corporate|Credit|Gilt|Dynamic|Short|Medium|Long|Ultra|Floating|Banking|Arbitrage|Balanced|Aggressive|Conservative|Equity|Flexi|Multi|Large|Mid|Small|ELSS|Index|Nifty|BSE|Gold|Silver|ETF|FoF|Fund|Focused|Dividend|Value|Contra|Infrastructure|Healthcare|Digital|Consumption|Energy|PSU|IT|Pharma|Thematic|Sectoral|Innovation|Business|Quant|ESG)/i
  ];
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      let amc = match[1].trim().replace(/\s*-\s*$/, '').trim();
      if (amc.length > 3) return amc;
    }
  }
  return name.split(/\s+/).slice(0, 3).join(' ');
}

function processSheet(worksheet: XLSX.WorkSheet, colMapping: string[], assetClass: string): any[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const funds: any[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || !row[0] || String(row[0]).trim() === '') continue;

    const name = String(row[0]).trim();
    if (name.includes('→') || name.includes('🔹') || name.includes('🔸')) continue;

    if (name.includes('360 ONE')) {
    }

    const fund: Record<string, any> = { assetClass };

    for (let j = 0; j < colMapping.length && j < row.length; j++) {
      const key = colMapping[j];
      const val = row[j];

      if (key === 'name') fund.name = String(val).trim();
      else if (key === 'category') fund.category = String(val).trim();
      else if (key === 'launch') fund.launch = parseLaunchDate(val);
      else if (key === 'fundManager') fund.fundManager = val ? String(val).trim() : null;
      else if (key === 'exitLoad') fund.exitLoad = parseExitLoad(val);
      else if (key === 'avgCreditQuality') fund.avgCreditQuality = val ? String(val).trim() : null;
      else fund[key] = parseNumber(val);
    }

    if (fund.name && fund.name.length > 5) {
      fund.id = generateId(fund.name, i);
      fund.amc = extractAmc(fund.name);
      fund.riskLevel = getRiskLevel(fund.category || '', fund.stdDev);
      fund.strengthBadge = getStrengthBadge(fund.sharpeRatio);
      fund.nav = fund.latestNav || 0;
      fund.aum = fund.netAssets || 0;
      fund.cagr1Y = fund.ret1Y ?? null;
      fund.cagr3Y = fund.ret3Y ?? null;
      fund.cagr5Y = fund.ret5Y ?? null;
      fund.volatility = fund.stdDev ?? null;
      fund.minInvestment = fund.minInvestment || 500;
      fund.rank = 0;
      fund.benchmark = '';

      if (fund.name && fund.name.includes('360 ONE')) {
      }

      funds.push(fund);
    }
  }

  return funds;
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

    console.log("[SYNC] Sync started");
    console.log("[SYNC] Downloading workbook from Supabase Storage...");

    // Step 1: Download workbook from Supabase Storage
    const storageResp = await fetch(STORAGE_WORKBOOK_URL);

    if (!storageResp.ok) {
      throw new Error(`Storage download failed: ${storageResp.status} ${storageResp.statusText}`);
    }

    const workbookSize = storageResp.headers.get("content-length") || "unknown";
    console.log("[SYNC] Workbook download completed, size:", workbookSize, "bytes");

    const arrayBuffer = await storageResp.arrayBuffer();
    console.log("[SYNC] Workbook bytes received:", arrayBuffer.byteLength);

    // Step 2: Parse the workbook
    console.log("[SYNC] Parsing workbook...");
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    } catch (parseError) {
      throw new Error(`XLSX parse failure: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    const sheetNames = workbook.SheetNames;
    console.log("[SYNC] Sheet count:", sheetNames.length);
    console.log("[SYNC] Sheet names:", sheetNames.join(', '));

    // Step 3: Process each configured sheet
    const allFunds: any[] = [];
    const insertCounts: Record<string, number> = {};

    for (let sheetIndex = 0; sheetIndex < Math.min(sheetNames.length, SHEET_CONFIG.length); sheetIndex++) {
      const sheetName = sheetNames[sheetIndex];
      const config = SHEET_CONFIG[sheetIndex];

      if (!workbook.Sheets[sheetName]) {
        throw new Error(`Missing sheet: ${sheetName}`);
      }

      const worksheet = workbook.Sheets[sheetName];

      // Count raw rows before processing
      const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }).length;
      console.log(`[SYNC] Sheet "${sheetName}" (${config.assetClass}): ${rawRows} raw rows`);

      const funds = processSheet(worksheet, config.cols, config.assetClass);
      console.log(`[SYNC] Sheet "${sheetName}": ${funds.length} rows transformed`);

      allFunds.push(...funds);
      insertCounts[config.assetClass] = funds.length;
    }

    if (allFunds.length === 0) {
      throw new Error("No funds were parsed from the workbook");
    }

    // Step 4: Rank funds by Sharpe within asset class
    const byAssetClass: Record<string, any[]> = {};
    for (const fund of allFunds) {
      if (!byAssetClass[fund.assetClass]) byAssetClass[fund.assetClass] = [];
      byAssetClass[fund.assetClass].push(fund);
    }
    for (const funds of Object.values(byAssetClass)) {
      funds.sort((a, b) => (b.sharpeRatio || 0) - (a.sharpeRatio || 0));
      funds.forEach((fund, idx) => { fund.rank = idx + 1; });
    }

    console.log(`[SYNC] Total rows: ${allFunds.length}`);

    // Step 5: Save to fund_cache
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    // Delete existing records
    console.log("[SYNC] Deleting existing cache entries...");
    const { error: delError1 } = await supabase.from('fund_cache').delete().eq('cache_key', 'workbook_data');
    if (delError1) throw new Error(`Delete workbook_data failed: ${delError1.message}`);

    const { error: delError2 } = await supabase.from('fund_cache').delete().eq('cache_key', 'mf_data');
    if (delError2) throw new Error(`Delete mf_data failed: ${delError2.message}`);

    // Insert new records
    console.log("[SYNC] Inserting workbook_data...");
    const { error: insError1 } = await supabase.from('fund_cache').insert({
      cache_key: 'workbook_data',
      data: allFunds,
      last_updated: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
    if (insError1) throw new Error(`Insert workbook_data failed: ${insError1.message}`);

    console.log("[SYNC] Inserting mf_data...");
    const { error: insError2 } = await supabase.from('fund_cache').insert({
      cache_key: 'mf_data',
      data: allFunds,
      last_updated: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
    if (insError2) throw new Error(`Insert mf_data failed: ${insError2.message}`);

    // Verify row count
    const { count: rowCount, error: countError } = await supabase
      .from('fund_cache')
      .select('*', { count: 'exact', head: true });
    if (countError) {
      console.warn("[SYNC] Could not verify row count:", countError.message);
    }

    const duration = Date.now() - startTime;
    console.log("[SYNC] Sync completed in", duration, "ms");
    console.log("[SYNC] Total records in fund_cache:", rowCount);

    return new Response(JSON.stringify({
      success: true,
      totalFunds: allFunds.length,
      byAssetClass: Object.fromEntries(
        Object.entries(byAssetClass).map(([k, v]) => [k, v.length])
      ),
      insertCounts,
      totalCacheRecords: rowCount,
      durationMs: duration,
      lastUpdated: now.toISOString(),
      source: 'storage',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[SYNC] Sync error after", duration, "ms:", error);

    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;

    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        durationMs: duration,
        ...(stack ? { stack } : {}),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
