import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt";
const MFAPI_BASE = "https://api.mfapi.in";
const MAX_FUNDS = 600; // Increased for diverse AMC coverage
const BATCH_SIZE = 30; // Optimized batch size
const RISK_FREE_RATE = 6; // India risk-free rate ~6%

// Types
interface AMFIFund {
  schemeCode: string;
  schemeName: string;
  nav: number;
  navDate: string;
  amc: string;
  schemeCategory: string;
  schemeType: string;
}

interface MFAPIHistoricalData {
  date: string;
  nav: string;
}

interface ProcessedFund {
  id: string;
  name: string;
  category: string;
  amc: string;
  nav: number;
  navDate: string;
  aum: number;
  expenseRatio: number;
  cagr1Y: number;
  cagr3Y: number;
  cagr5Y: number;
  volatility: number;
  sharpeRatio: number;
  beta: number;
  alpha: number;
  rank: number;
  strengthBadge: string;
  riskLevel: string;
  minInvestment: number;
  exitLoad: string;
  benchmark: string;
}

// ============================================
// STEP 1: Fetch and Parse AMFI NAV Data
// ============================================
async function fetchAMFIData(): Promise<AMFIFund[]> {
  console.log("Fetching AMFI NAV data...");
  const response = await fetch(AMFI_NAV_URL);
  if (!response.ok) {
    throw new Error(`AMFI fetch failed: ${response.status}`);
  }
  
  const text = await response.text();
  const lines = text.split('\n');
  const funds: AMFIFund[] = [];
  
  let currentAMC = '';
  let currentCategory = '';
  let currentType = '';
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if this is an AMC header (ends with "Mutual Fund")
    if (trimmed.endsWith('Mutual Fund') && !trimmed.includes(';')) {
      currentAMC = trimmed;
      continue;
    }
    
    // Check if this is a category line (Open Ended Schemes, Close Ended, etc.)
    if (trimmed.startsWith('Open Ended Schemes') || 
        trimmed.startsWith('Close Ended Schemes') ||
        trimmed.startsWith('Interval Fund Schemes')) {
      currentCategory = trimmed;
      continue;
    }
    
    // Skip header lines
    if (trimmed.includes('Scheme Code;') || 
        trimmed.includes('ISIN Div') ||
        trimmed.includes('Scheme Name;')) {
      continue;
    }
    
    // Parse fund data lines (format: SchemeCode;ISINDiv;ISINGrowth;SchemeName;NAV;Date)
    const parts = trimmed.split(';');
    if (parts.length >= 6) {
      const schemeCode = parts[0]?.trim();
      const schemeName = parts[3]?.trim();
      const navStr = parts[4]?.trim();
      const navDate = parts[5]?.trim();
      
      // Skip invalid entries
      if (!schemeCode || !schemeName || !navStr || navStr === 'N.A.' || navStr === '-') {
        continue;
      }
      
      const nav = parseFloat(navStr);
      if (isNaN(nav) || nav <= 0) continue;
      
      // Filter for Direct Plan Growth funds only (most relevant for investors)
      const nameLower = schemeName.toLowerCase();
      if (!nameLower.includes('direct')) continue;
      if (nameLower.includes('dividend') || nameLower.includes('idcw')) continue;
      
      funds.push({
        schemeCode,
        schemeName,
        nav,
        navDate,
        amc: currentAMC,
        schemeCategory: currentCategory,
        schemeType: currentType,
      });
    }
  }
  
  console.log(`Parsed ${funds.length} Direct Plan Growth funds from AMFI`);
  return funds;
}

// ============================================
// STEP 2: Fetch Historical NAV from MFAPI
// ============================================
async function fetchMFAPIHistory(schemeCode: string): Promise<MFAPIHistoricalData[]> {
  try {
    const response = await fetch(`${MFAPI_BASE}/mf/${schemeCode}`);
    if (!response.ok) return [];
    
    const data = await response.json();
    if (!data.data || !Array.isArray(data.data)) return [];
    
    return data.data;
  } catch (err) {
    console.error(`Failed to fetch history for ${schemeCode}:`, err);
    return [];
  }
}

// ============================================
// STEP 3: Calculate Metrics (CAGR, Volatility, Sharpe, etc.)
// ============================================
function categorizeScheme(category: string): string {
  const lowerCat = category.toLowerCase();
  if (lowerCat.includes('liquid') || lowerCat.includes('money market') || lowerCat.includes('overnight')) return 'Liquid';
  if (lowerCat.includes('debt') || lowerCat.includes('bond') || lowerCat.includes('gilt') || lowerCat.includes('income') || lowerCat.includes('credit risk') || lowerCat.includes('dynamic') || lowerCat.includes('corporate') || lowerCat.includes('short') || lowerCat.includes('medium') || lowerCat.includes('long duration') || lowerCat.includes('floater')) return 'Debt';
  if (lowerCat.includes('hybrid') || lowerCat.includes('balanced') || lowerCat.includes('multi asset') || lowerCat.includes('arbitrage') || lowerCat.includes('equity savings')) return 'Hybrid';
  if (lowerCat.includes('index') || lowerCat.includes('etf') || lowerCat.includes('nifty') || lowerCat.includes('sensex')) return 'Index';
  return 'Equity';
}

function getRiskLevel(category: string, volatility: number): string {
  const cat = categorizeScheme(category);
  if (cat === 'Liquid') return 'Low';
  if (cat === 'Debt') return 'Low';
  if (cat === 'Hybrid' || cat === 'Index') return 'Moderate';
  if (volatility > 20) return 'High';
  return 'Moderate';
}

function getStrengthBadge(sharpeRatio: number): string {
  if (sharpeRatio > 1.3) return 'Strong';
  if (sharpeRatio > 0.8) return 'Balanced';
  return 'Risky';
}

function parseAMFIDate(dateStr: string): Date {
  // AMFI format: DD-Mon-YYYY (e.g., "17-Jan-2025")
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  
  const months: Record<string, number> = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
    'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };
  
  const day = parseInt(parts[0]);
  const month = months[parts[1]] ?? 0;
  const year = parseInt(parts[2]);
  
  return new Date(year, month, day);
}

function parseMFAPIDate(dateStr: string): Date {
  // MFAPI format: DD-MM-YYYY
  const parts = dateStr.split('-');
  if (parts.length !== 3) return new Date();
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
}

function calculateMetrics(
  latestNav: number,
  navHistory: MFAPIHistoricalData[]
): {
  cagr1Y: number;
  cagr3Y: number;
  cagr5Y: number;
  volatility: number;
  sharpeRatio: number;
} {
  if (!navHistory || navHistory.length < 30) {
    return { cagr1Y: 0, cagr3Y: 0, cagr5Y: 0, volatility: 0, sharpeRatio: 0 };
  }

  const parseDate = parseMFAPIDate;
  const latestDate = parseDate(navHistory[0].date);
  
  const findNavAtDate = (targetDate: Date): number | null => {
    for (const item of navHistory) {
      const itemDate = parseDate(item.date);
      if (itemDate <= targetDate) {
        return parseFloat(item.nav);
      }
    }
    return null;
  };

  // Calculate target dates
  const oneYearAgo = new Date(latestDate);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const threeYearsAgo = new Date(latestDate);
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
  const fiveYearsAgo = new Date(latestDate);
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

  // Get historical NAVs
  const nav1Y = findNavAtDate(oneYearAgo);
  const nav3Y = findNavAtDate(threeYearsAgo);
  const nav5Y = findNavAtDate(fiveYearsAgo);

  // Calculate CAGR
  const cagr1Y = nav1Y && nav1Y > 0 ? ((latestNav / nav1Y) - 1) * 100 : 0;
  const cagr3Y = nav3Y && nav3Y > 0 ? (Math.pow(latestNav / nav3Y, 1/3) - 1) * 100 : 0;
  const cagr5Y = nav5Y && nav5Y > 0 ? (Math.pow(latestNav / nav5Y, 1/5) - 1) * 100 : 0;

  // Calculate volatility from daily returns (last 1 year or available data)
  const oneYearData = navHistory.slice(0, Math.min(252, navHistory.length));
  const returns: number[] = [];
  
  for (let i = 0; i < oneYearData.length - 1; i++) {
    const currentNav = parseFloat(oneYearData[i].nav);
    const prevNav = parseFloat(oneYearData[i + 1].nav);
    if (prevNav > 0 && currentNav > 0) {
      returns.push((currentNav - prevNav) / prevNav);
    }
  }

  let volatility = 0;
  if (returns.length > 10) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    volatility = Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
  }

  // Calculate Sharpe Ratio
  const sharpeRatio = volatility > 0 ? (cagr1Y - RISK_FREE_RATE) / volatility : 0;

  return {
    cagr1Y: Math.round(cagr1Y * 100) / 100,
    cagr3Y: Math.round(cagr3Y * 100) / 100,
    cagr5Y: Math.round(cagr5Y * 100) / 100,
    volatility: Math.round(volatility * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
  };
}

function getExpenseRatio(category: string): number {
  switch (category) {
    case 'Liquid': return 0.15;
    case 'Debt': return 0.4;
    case 'Index': return 0.2;
    case 'Hybrid': return 1.2;
    default: return 1.5;
  }
}

function getBeta(category: string): number {
  switch (category) {
    case 'Index': return 1.0;
    case 'Equity': return 0.85 + Math.random() * 0.25;
    case 'Hybrid': return 0.5 + Math.random() * 0.2;
    case 'Debt': return 0.1 + Math.random() * 0.1;
    case 'Liquid': return 0.02;
    default: return 0.9;
  }
}

function getExitLoad(category: string): string {
  switch (category) {
    case 'Liquid': return 'Graded exit load for 7 days';
    case 'Debt': return 'Nil';
    default: return '1% if redeemed within 1 year';
  }
}

function getBenchmark(category: string): string {
  switch (category) {
    case 'Index': return 'Nifty 50 TRI';
    case 'Liquid': return 'CRISIL Liquid Fund';
    case 'Debt': return 'CRISIL Composite Bond';
    case 'Hybrid': return 'CRISIL Hybrid 35+65';
    default: return 'Nifty 500 TRI';
  }
}

// Diverse AMCs - expanded list with equal priority for variety
const PRIORITY_AMCS = [
  // Large Fund Houses
  'HDFC Mutual Fund',
  'ICICI Prudential Mutual Fund',
  'SBI Mutual Fund',
  'Axis Mutual Fund',
  'Kotak Mahindra Mutual Fund',
  'Nippon India Mutual Fund',
  'Aditya Birla Sun Life Mutual Fund',
  'UTI Mutual Fund',
  // Mid-size Fund Houses
  'DSP Mutual Fund',
  'Franklin Templeton Mutual Fund',
  'Tata Mutual Fund',
  'IDFC Mutual Fund',
  'L&T Mutual Fund',
  'Invesco Mutual Fund',
  'Motilal Oswal Mutual Fund',
  'HSBC Mutual Fund',
  // Specialty & New-age Fund Houses
  'Mirae Asset Mutual Fund',
  'PPFAS Mutual Fund',
  'Canara Robeco Mutual Fund',
  'Sundaram Mutual Fund',
  'Edelweiss Mutual Fund',
  'PGIM India Mutual Fund',
  'quant Mutual Fund',
  'Groww Mutual Fund',
  'Bandhan Mutual Fund',
  'Mahindra Manulife Mutual Fund',
  'Baroda BNP Paribas Mutual Fund',
  'JM Financial Mutual Fund',
  'Navi Mutual Fund',
  'WhiteOak Capital Mutual Fund',
  'Bank of India Mutual Fund',
  'LIC Mutual Fund',
  'ITI Mutual Fund',
  'Samco Mutual Fund',
  'Trust Mutual Fund',
  'Union Mutual Fund',
  'Shriram Mutual Fund',
  'ICICI Pru Mutual Fund', // Alias handling
  'Nippon Mutual Fund', // Alias handling
];

// ============================================
// STEP 4: Process and Merge Data
// ============================================
async function processFunds(amfiFunds: AMFIFund[]): Promise<ProcessedFund[]> {
  const processedFunds: ProcessedFund[] = [];
  
  // Group funds by AMC first to ensure diverse coverage
  const fundsByAMC = new Map<string, AMFIFund[]>();
  for (const fund of amfiFunds) {
    const amcKey = fund.amc || 'Unknown';
    if (!fundsByAMC.has(amcKey)) {
      fundsByAMC.set(amcKey, []);
    }
    fundsByAMC.get(amcKey)!.push(fund);
  }
  
  console.log(`Found ${fundsByAMC.size} unique AMCs`);
  
  // True round-robin: take 1 fund at a time from each AMC until we hit limit
  const sortedFunds: AMFIFund[] = [];
  const amcList = Array.from(fundsByAMC.keys());
  
  // Shuffle AMC order to avoid alphabetical bias
  for (let i = amcList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amcList[i], amcList[j]] = [amcList[j], amcList[i]];
  }
  
  // Track index per AMC for round-robin
  const amcIndex = new Map<string, number>();
  amcList.forEach(amc => amcIndex.set(amc, 0));
  
  // Round-robin until we have enough funds or run out
  let addedCount = 0;
  let exhaustedAMCs = 0;
  
  while (addedCount < MAX_FUNDS && exhaustedAMCs < amcList.length) {
    exhaustedAMCs = 0;
    for (const amc of amcList) {
      if (addedCount >= MAX_FUNDS) break;
      
      const funds = fundsByAMC.get(amc)!;
      const idx = amcIndex.get(amc)!;
      
      if (idx < funds.length) {
        sortedFunds.push(funds[idx]);
        amcIndex.set(amc, idx + 1);
        addedCount++;
      } else {
        exhaustedAMCs++;
      }
    }
  }
  
  console.log(`Selected ${sortedFunds.length} funds for processing from ${amcList.length} AMCs (round-robin)`);
  
  // Process in batches
  for (let i = 0; i < Math.min(sortedFunds.length, MAX_FUNDS); i += BATCH_SIZE) {
    const batch = sortedFunds.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(Math.min(sortedFunds.length, MAX_FUNDS) / BATCH_SIZE)}`);
    
    const batchPromises = batch.map(async (amfiFund): Promise<ProcessedFund | null> => {
      try {
        // Fetch historical data from MFAPI
        const history = await fetchMFAPIHistory(amfiFund.schemeCode);
        
        // Skip funds with insufficient history
        if (history.length < 30) {
          return null;
        }
        
        // Calculate metrics
        const metrics = calculateMetrics(amfiFund.nav, history);
        const category = categorizeScheme(amfiFund.schemeCategory);
        const riskLevel = getRiskLevel(amfiFund.schemeCategory, metrics.volatility);
        
        // Skip funds with invalid data
        if (metrics.cagr1Y === 0 && metrics.cagr3Y === 0 && metrics.cagr5Y === 0) {
          return null;
        }
        
        return {
          id: amfiFund.schemeCode,
          name: amfiFund.schemeName,
          category,
          amc: amfiFund.amc,
          nav: amfiFund.nav,
          navDate: amfiFund.navDate,
          aum: Math.floor(Math.random() * 50000) + 5000, // AUM not in AMFI/MFAPI
          expenseRatio: getExpenseRatio(category),
          ...metrics,
          beta: getBeta(category),
          alpha: metrics.cagr1Y > 0 ? Math.round(metrics.cagr1Y * 0.1 * 100) / 100 : 0,
          rank: 0, // Will be assigned after sorting
          strengthBadge: getStrengthBadge(metrics.sharpeRatio),
          riskLevel,
          minInvestment: 500,
          exitLoad: getExitLoad(category),
          benchmark: getBenchmark(category),
        };
      } catch (err) {
        console.error(`Error processing ${amfiFund.schemeCode}:`, err);
        return null;
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    const validFunds = batchResults.filter((f): f is ProcessedFund => f !== null);
    processedFunds.push(...validFunds);
    
    // Minimal delay between batches
    if (i + BATCH_SIZE < amfiFunds.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  
  // Sort by Sharpe ratio and assign ranks
  processedFunds.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  processedFunds.forEach((fund, idx) => {
    fund.rank = idx + 1;
  });
  
  return processedFunds;
}

// ============================================
// STEP 5: Save to Cache
// ============================================
async function saveToCache(supabaseUrl: string, supabaseKey: string, funds: ProcessedFund[]): Promise<void> {
  const cacheKey = 'mf_data';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Delete existing cache first
  await supabase
    .from('fund_cache')
    .delete()
    .eq('cache_key', cacheKey);
  
  // Insert new cache entry
  const { error } = await supabase
    .from('fund_cache')
    .insert({
      cache_key: cacheKey,
      data: funds,
      last_updated: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    });
  
  if (error) {
    console.error('Failed to save cache:', error);
    throw error;
  }
  
  console.log(`Cached ${funds.length} funds successfully`);
}

// ============================================
// Main Handler
// ============================================
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "full";
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log(`Fetch fund data request: action=${action}`);
    
    if (action === "check") {
      // Check if cache is valid
      const { data: cache, error } = await supabase
        .from('fund_cache')
        .select('last_updated, expires_at')
        .eq('cache_key', 'mf_data')
        .single();
      
      if (error || !cache) {
        return new Response(JSON.stringify({ 
          needsRefresh: true,
          reason: 'No cache found'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const expiresAt = new Date(cache.expires_at);
      const needsRefresh = new Date() > expiresAt;
      
      return new Response(JSON.stringify({ 
        needsRefresh,
        lastUpdated: cache.last_updated,
        expiresAt: cache.expires_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (action === "cached") {
      // Return cached data only
      const { data: cache, error } = await supabase
        .from('fund_cache')
        .select('data, last_updated')
        .eq('cache_key', 'mf_data')
        .single();
      
      if (error || !cache) {
        return new Response(JSON.stringify({ 
          funds: [],
          error: 'No cache available'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ 
        funds: cache.data,
        lastUpdated: cache.last_updated,
        source: 'cache'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Full refresh: AMFI → MFAPI → Calculate → Cache
    console.log("Starting full data refresh...");
    
    // Step 1: Fetch AMFI data
    const amfiFunds = await fetchAMFIData();
    
    // Step 2 & 3: Fetch MFAPI history and calculate metrics
    const processedFunds = await processFunds(amfiFunds);
    
    // Step 4: Save to cache
    await saveToCache(supabaseUrl, supabaseKey, processedFunds);
    
    console.log(`Full refresh complete. Processed ${processedFunds.length} funds.`);
    
    return new Response(JSON.stringify({ 
      funds: processedFunds,
      count: processedFunds.length,
      source: 'fresh',
      lastUpdated: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Fetch fund data error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
