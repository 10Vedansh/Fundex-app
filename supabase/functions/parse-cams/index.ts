import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HoldingData {
  fund_name: string;
  amc: string;
  folio_number?: string;
  units?: number | null;
  nav?: number | null;
  current_value?: number | null;
  cost_value?: number | null;
  category?: string;
}

interface ParsedPortfolio {
  investor_name?: string;
  holdings: HoldingData[];
  total_current_value?: number | null;
  total_cost_value?: number | null;
}

function toNum(raw: string): number | null {
  const n = parseFloat(raw.replace(/[₹Rs,\s]/g, ''));
  return isNaN(n) ? null : n;
}

const KNOWN_AMCS = [
  'HDFC', 'ICICI Prudential', 'SBI', 'Nippon India', 'Kotak Mahindra', 'Axis',
  'Aditya Birla Sun Life', 'UTI', 'Franklin Templeton', 'DSP', 'Invesco',
  'Tata', 'Mirae Asset', 'Parag Parikh', 'Mahindra Manulife', 'Quant',
  'Motilal Oswal', 'HSBC', 'Bandhan', 'Baroda BNP Paribas', 'ITI',
  'Union', 'Canara Robeco', 'NJ', 'Zerodha', 'PGIM India', 'Edelweiss',
  'JM Financial', 'Sundaram', 'Taurus', 'Shriram', 'Groww', 'Navi',
  'LIC MF', '360 ONE', 'WhiteOak Capital', 'Samco', 'Bajaj Finserve',
  'Helios', 'Old Bridge', 'Trust', 'Bank of India', 'Mahindra',
];

function inferAmc(scheme: string): string {
  for (const amc of KNOWN_AMCS) {
    if (scheme.toLowerCase().startsWith(amc.toLowerCase())) return amc;
  }
  for (const amc of KNOWN_AMCS) {
    if (scheme.toLowerCase().includes(amc.toLowerCase())) return amc;
  }
  return '';
}

function inferCategory(scheme: string): string {
  const s = scheme.toLowerCase();
  if (s.includes('elss') || s.includes('tax saver')) return 'Equity';
  if (s.includes('liquid') || s.includes('overnight') || s.includes('money market')) return 'Debt';
  if (s.includes('ultra short') || s.includes('short duration') || s.includes('low duration') || s.includes('floating rate') || s.includes('corporate bond') || s.includes('banking') || s.includes('psu') || s.includes('gilt') || s.includes('income') || s.includes('credit risk')) return 'Debt';
  if (s.includes('arbitrage')) return 'Hybrid';
  if (s.includes('balanced') || s.includes('hybrid') || s.includes('aggressive')) return 'Hybrid';
  if (s.includes('conservative')) return 'Hybrid';
  if (s.includes('small cap')) return 'Equity';
  if (s.includes('mid cap') || s.includes('midcap')) return 'Equity';
  if (s.includes('large cap') || s.includes('largecap') || s.includes('bluechip') || s.includes('nifty') || s.includes('sensex')) return 'Equity';
  if (s.includes('multi cap') || s.includes('multicap') || s.includes('flexi cap') || s.includes('focused') || s.includes('value') || s.includes('dividend yield')) return 'Equity';
  if (s.includes('etf') || s.includes('index fund')) return 'Equity';
  return 'Equity';
}

function parseCamsText(rawText: string): ParsedPortfolio {
  // Normalise whitespace but preserve single spaces between tokens
  const text = rawText
    .replace(/\r\n/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/[ \t]{3,}/g, '  ')  // 3+ → 2 (keep visible gaps)
    .trim();

  const portfolio: ParsedPortfolio = { holdings: [] };

  // ── 1. Investor name ──
  // In CAS: "Email Id: x@y.com  Vedansh Taparia  C-1-1402..."
  const invMatch = text.match(/Email\s*Id\s*:\s*\S+\s+([A-Z][A-Za-z\s]+?)\s{2,}/);
  if (invMatch) portfolio.investor_name = invMatch[1].trim();

  // ── 2. Portfolio summary ──
  // After "PORTFOLIO SUMMARY":  "Helios Mutual Fund   10,000.00   10,254.03"
  const sumIdx = text.search(/PORTFOLIO\s+SUMMARY/i);
  const totalIdx = text.search(/\bTotal\s{2,}[\d,]+\.\d{2}\s{2,}[\d,]+\.\d{2}/);
  const summaryText = sumIdx >= 0 && totalIdx > sumIdx
    ? text.slice(sumIdx + 17, totalIdx) : '';

  // Extract (fund_name, cost, market) tuples from summary
  // Row pattern: name   cost   market  (separated by 2+ spaces)
  const summaryRows: { name: string; cost: number; market: number }[] = [];

  // Split summary by double-space-delimited fund rows  
  // Pattern: "AMC_Name    cost_val   market_val"
  const rowRe = /([A-Za-z][A-Za-z\s&]+?)\s{2,}([\d,]+\.\d{2})\s{2,}([\d,]+\.\d{2})/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(summaryText)) !== null) {
    const name = rm[1].trim();
    if (/^Total/i.test(name)) continue;
    summaryRows.push({
      name,
      cost: parseFloat(rm[2].replace(/,/g, '')),
      market: parseFloat(rm[3].replace(/,/g, '')),
    });
  }

  // Also try the original sample which has two spaces before "Mutual Fund   Cost Value..."
  // If summary extraction failed, try the alternative format
  if (summaryRows.length === 0) {
    // Broader search — look for fund names followed by two numbers
    const altRe = /([A-Z][A-Za-z\s&]{2,60}?)\s{2,}([\d,]+\.\d{2})\s{2,}([\d,]+\.\d{2})/g;
    while ((rm = altRe.exec(text)) !== null) {
      const name = rm[1].trim();
      if (/^(Mutual|Total|Cost|Market|PORTFOLIO)/i.test(name)) continue;
      if (name.length < 5) continue;
      // Must appear after "PORTFOLIO SUMMARY"  
      if (rm.index < sumIdx + 10) continue;
      // Don't double-count
      if (summaryRows.some(r => r.name === name)) continue;
      summaryRows.push({
        name,
        cost: parseFloat(rm[2].replace(/,/g, '')),
        market: parseFloat(rm[3].replace(/,/g, '')),
      });
    }
  }

  // ── 3. Total values from summary ──
  const grandTotalMatch = text.match(/Total\s{2,}([\d,]+\.\d{2})\s{2,}([\d,]+\.\d{2})/);
  if (grandTotalMatch) {
    portfolio.total_cost_value = toNum(grandTotalMatch[1]);
    portfolio.total_current_value = toNum(grandTotalMatch[2]);
  }

  // ── 4. For each AMC in summary, locate its detail block and parse holdings ──
  // The detail block starts at the SECOND occurrence of the AMC name
  // (first is in the summary table, second starts the transaction detail section)
  // and extends to the next AMC's detail block start, or end of text.

  const seen = new Set<string>();

  for (const row of summaryRows) {
    const amcName = row.name;  // e.g. "Helios Mutual Fund"
    const summaryMatch = text.indexOf(amcName, sumIdx);
    if (summaryMatch < 0) continue;

    // Detail section starts at second occurrence of the same name
    const detailStart = text.indexOf(amcName, summaryMatch + amcName.length);
    if (detailStart < 0) continue;  // no detail section found

    // End at next AMC's detail section start or end of text
    let detailEnd = text.length;
    for (const other of summaryRows) {
      if (other.name === row.name) continue;
      const otherSummaryPos = text.indexOf(other.name, sumIdx);
      if (otherSummaryPos < 0) continue;
      const otherDetailPos = text.indexOf(other.name, otherSummaryPos + other.name.length);
      if (otherDetailPos > detailStart && otherDetailPos < detailEnd) {
        detailEnd = otherDetailPos;
      }
    }

    const block = text.slice(detailStart, detailEnd);

    // ── Extract folio number ──
    // "Folio No: 10247591 / 19"
    const folioRe = /Folio\s*No\s*:\s*([\d\s\/]+?)(?=\s{2,}|[A-Za-z]|$)/gi;
    let fm: RegExpExecArray | null;
    const folios: string[] = [];
    while ((fm = folioRe.exec(block)) !== null) {
      folios.push(fm[1].trim());
    }

    // ── Extract scheme name from ISIN description ──
    // "HLSHFCRG-Helios Flexi Cap Fund - Regular Growth (Non-Demat) - ISIN: INF0R8701012"
    const isinIdx = block.search(/ISIN\s*:\s*\S+/i);
    let schemeName = '';
    if (isinIdx >= 0) {
      const preIsin = block.slice(0, isinIdx).trim();
      // Strip everything before "PAN: OK" (greedy → takes last occurrence)
      const afterMeta = preIsin.replace(/.*\bPAN\s*:\s*OK\s+/i, '');
      // Strip prefix code (e.g. "HLSHFCRG-" or any leading alphanumeric token)
      const noPrefix = afterMeta.replace(/^[A-Z0-9]+\s*[-]\s*/i, '');
      // Remove trailing " - " (before ISIN)
      const clean = noPrefix.replace(/\s*-\s*$/, '').replace(/\s+/g, ' ').trim();
      if (clean.length >= 5) {
        schemeName = clean;
      }
    }
    if (!schemeName) {
      schemeName = amcName.replace(/\s*Mutual\s*Fund\s*/i, '').trim();
    }

    // ── Extract opening unit balance ──
    // "Opening Unit Balance: 419.978"
    let units: number | null = null;
    const openMatch = block.match(/Opening\s+Unit\s+Balance\s*:\s*([\d,]+\.?\d*)/i);
    if (openMatch) units = parseFloat(openMatch[1].replace(/,/g, ''));

    // ── Extract current NAV ──
    // "NAV on 12-Jun-2026: INR 14.70"
    let nav: number | null = null;
    const navMatch = block.match(/NAV\s+on\s+[\w\-]+\s*:\s*INR\s*([\d,]+\.?\d*)/i);
    if (navMatch) nav = parseFloat(navMatch[1].replace(/,/g, ''));

    // ── Extract market / current value from detail section ──
    // "Market Value on 12-Jun-2026: INR 10,254.03"
    let marketVal: number | null = null;
    const mvMatch = block.match(/Market\s+Value\s+on\s+[\w\-]+\s*:\s*INR\s*([\d,]+\.?\d*)/i);
    if (mvMatch) marketVal = parseFloat(mvMatch[1].replace(/,/g, ''));

    const folioNumber = folios.length > 0 ? folios[0] : undefined;
    const key = `${schemeName}|${folioNumber || amcName}`;

    if (!seen.has(key) && schemeName.length >= 5) {
      seen.add(key);
      portfolio.holdings.push({
        fund_name: schemeName,
        amc: inferAmc(schemeName) || amcName.replace(/\s*Mutual\s*Fund\s*/i, '').trim(),
        folio_number: folioNumber,
        units,
        nav,
        current_value: marketVal || row.market,
        cost_value: row.cost,
        category: inferCategory(schemeName),
      });
    }
  }

  return portfolio;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { textContent } = await req.json();
    const textLen = textContent?.length ?? 0;

    // Diagnostic info
    const debug: Record<string, any> = {
      length: textLen,
      hasNewlines: textContent ? textContent.includes('\n') : false,
      hasTab: textContent ? textContent.includes('\t') : false,
      hasFolio: textContent ? textContent.includes('Folio') : false,
      hasMutualFund: textContent ? textContent.includes('Mutual Fund') : false,
      sample: textContent ? textContent.slice(0, 3000) : 'N/A',
      lineCount: textContent ? textContent.split('\n').length : 0,
      newlinePositions: [] as number[],
    };

    // Separator analysis: find repeated whitespace patterns
    if (textContent) {
      const spaceRuns = textContent.match(/  {2,}/g);
      debug.maxConsecutiveSpaces = spaceRuns ? Math.max(...spaceRuns.map(s => s.length)) : 0;

      // Check for tab characters
      debug.tabCount = (textContent.match(/\t/g) || []).length;

      // Find specific keyword positions
      debug.folioPositions = [];
      let idx = -1;
      while ((idx = textContent.indexOf('Folio', idx + 1)) !== -1) {
        debug.folioPositions.push(idx);
      }

      debug.mutualFundPositions = [];
      idx = -1;
      while ((idx = textContent.indexOf('Mutual Fund', idx + 1)) !== -1) {
        debug.mutualFundPositions.push(idx);
      }
    }

    // Find where newlines occur
    if (textContent && textContent.includes('\n')) {
      let ni = -1;
      while ((ni = textContent.indexOf('\n', ni + 1)) !== -1 && debug.newlinePositions.length < 10) {
        debug.newlinePositions.push(ni);
      }
    }

    if (!textContent || textLen < 50) {
      return new Response(
        JSON.stringify({ error: "Insufficient text content", debug }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const portfolioData = parseCamsText(textContent);

    // Add parse diagnostics
    debug.summaryRowsFound = (textContent.match(/PORTFOLIO\s+SUMMARY/i) !== null);
    debug.holdingsFound = portfolioData.holdings.length;
    debug.fundNamesFound = portfolioData.holdings.map(h => h.fund_name);
    debug.foliosFound = portfolioData.holdings.map(h => h.folio_number);

    return new Response(JSON.stringify({ ...portfolioData, debug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-cams error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Failed to parse document", debug: {} }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
