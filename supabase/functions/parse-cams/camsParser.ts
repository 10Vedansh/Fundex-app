// Deterministic CAMS statement text parser.

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

function cleanNum(val: string | undefined | null): number | null {
  if (!val) return null;
  const stripped = val.replace(/[₹Rs,\s]/g, '').trim();
  const n = parseFloat(stripped);
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

// ── Main parser ──
export function parseCamsText(rawText: string): ParsedPortfolio {
  const text = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();

  const portfolio: ParsedPortfolio = { holdings: [] };

  // ── 1. Extract investor name ──
  const investorMatch = text.match(/(?:For\s*:?\s*|Investor\s*(?:Name)?\s*:?\s*|Name\s*:?\s*)([A-Za-z\s.]+?)(?:\n|\s{3,}|$)/i);
  if (investorMatch) {
    portfolio.investor_name = investorMatch[1].trim();
  }

  // ── 2. Extract totals ──
  const totalCurMatch = text.match(/Total\s*Current\s*Value\s*:?\s*[₹Rs]?\s*([\d,]+\.?\d*)/i);
  if (totalCurMatch) portfolio.total_current_value = cleanNum(totalCurMatch[1]);

  const totalCostMatch = text.match(/Total\s*Cost\s*Value\s*:?\s*[₹Rs]?\s*([\d,]+\.?\d*)/i);
  if (totalCostMatch) portfolio.total_cost_value = cleanNum(totalCostMatch[1]);

  // ── 3. Find all folio numbers ──
  interface FolioBlock {
    folio: string;
    precedingText: string;
    dataText: string;
    startLine: number;
  }

  // Split into lines for position tracking
  const lines = text.split('\n');
  const folioBlocks: FolioBlock[] = [];
  let currentAmc = '';
  let lineIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Track AMC context
    const amcMatch = line.match(/^([A-Za-z\s&]+?)\s*Mutual\s*Fund\s*$/i);
    if (amcMatch) {
      currentAmc = amcMatch[1].trim();
      continue;
    }

    // Find folio lines
    const folioMatch = line.match(/Folio\s*(?:No|Number)?\s*[:.]?\s*([A-Za-z0-9\/\-]+)/i);
    if (folioMatch) {
      const folio = folioMatch[1];
      const precedingText = currentAmc;
      
      // Collect data lines until next folio or next AMC or totals
      const dataLines: string[] = [];
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;
        if (/Folio\s*(?:No|Number)?\s*[:.]?\s*[A-Za-z0-9\/\-]+/i.test(nextLine)) break;
        if (/^[A-Za-z\s&]+?\s*Mutual\s*Fund\s*$/i.test(nextLine)) break;
        if (/Total\s*(Current|Cost)\s*Value/i.test(nextLine)) break;
        dataLines.push(nextLine);
      }

      folioBlocks.push({
        folio,
        precedingText,
        dataText: dataLines.join(' '),
        startLine: i,
      });
    }
  }

  // ── 4. Parse each folio block ──
  const seen = new Set<string>();

  for (const block of folioBlocks) {
    parseFolioData(block, portfolio, seen);
  }

  // ── 5. Assign AMC from preceding text ──
  for (const h of portfolio.holdings) {
    if (!h.amc) {
      h.amc = inferAmc(h.fund_name);
    }
  }

  return portfolio;
}

function parseFolioData(
  block: { folio: string; precedingText: string; dataText: string },
  portfolio: ParsedPortfolio,
  seen: Set<string>
): void {
  const text = block.dataText;
  const amcFromBlock = block.precedingText || inferAmc(text);

  // Strategy: find all comma-formatted values first, strip them from text,
  // then parse remaining plain decimals for units/NAV.
  // A fund entry: "HDFC Top 100 Fund 100.000 50.1234 5,012.34 5,000.00"
  
  const segments = splitFundEntries(text);

  for (const segment of segments) {
    if (segment.length < 20) continue;

    // 1. Extract ALL comma-formatted values first (Indian format: 5,012.34)
    const valueMatches = [...segment.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/g)];
    const values = valueMatches.map(m => cleanNum(m[0])).filter((v): v is number => v !== null);

    // 2. Remove comma-formatted numbers entirely from text (including their commas)
    let strippedText = segment;
    for (const m of valueMatches) {
      strippedText = strippedText.replace(m[0], '');
    }

    // 3. Extract all plain decimal numbers from remaining text
    const plainDecimals = [...strippedText.matchAll(/(\d+\.\d+)/g)]
      .map(m => parseFloat(m[1]))
      .filter(d => !isNaN(d));

    if (plainDecimals.length === 0 && values.length === 0) continue;

    // 4. Units and NAV: in CAMS, units come before NAV in text order
    let units: number | null = null;
    let nav: number | null = null;

    if (plainDecimals.length >= 2) {
      units = plainDecimals[0];
      nav = plainDecimals[1];
    } else if (plainDecimals.length === 1) {
      if (values.length > 0) {
        units = plainDecimals[0];
      } else {
        nav = plainDecimals[0];
      }
    }

    // 5. Values: current = first, cost = second
    const currentValue = values.length > 0 ? values[0] : null;
    const costValue = values.length > 1 ? values[1] : null;

    // 6. Scheme name: extract from original segment before the first decimal number
    const firstDecimalMatch = segment.match(/\d+\.\d+/);
    const firstDecimalIdx = firstDecimalMatch ? segment.indexOf(firstDecimalMatch[0]) : -1;
    let rawName = firstDecimalIdx > 5 ? segment.slice(0, firstDecimalIdx).trim() : '';

    let schemeName = rawName
      .replace(/^[^A-Za-z0-9]+/, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!schemeName || schemeName.length < 5) continue;
    if (/^(units?|nav|amount|value|scheme|fund|sì|folio|page|date|statement)/i.test(schemeName)) continue;
    if (/^\d/.test(schemeName)) continue;

    const amc = amcFromBlock || inferAmc(schemeName);
    const key = `${schemeName}|${block.folio}`;

    if (!seen.has(key)) {
      seen.add(key);
      portfolio.holdings.push({
        fund_name: schemeName,
        amc,
        folio_number: block.folio,
        units,
        nav,
        current_value: currentValue,
        cost_value: costValue,
        category: inferCategory(schemeName),
      });
    }
  }
}

function splitFundEntries(text: string): string[] {
  // Fund entries are often separated by multiple spaces or ₹ symbols
  // Try splitting by patterns that indicate a new entry
  const parts: string[] = [];
  
  // Use a sliding window approach
  let current = text;
  
  // First, try to identify entries by looking for value patterns
  // Each fund entry should have at least one value (comma-formatted number)
  // or two decimal numbers
  
  // Simple approach: split by known patterns like "Folio" (already done) or "₹"
  const rupeeParts = text.split(/[₹]/).filter(p => p.trim());
  
  if (rupeeParts.length > 1) {
    for (const part of rupeeParts) {
      const cleaned = part.trim();
      if (cleaned) parts.push(cleaned);
    }
  } else {
    parts.push(text);
  }

  // Further split long segments that contain multiple fund entries
  const result: string[] = [];
  for (const part of parts) {
    // Look for repeated "decimal decimal value value" patterns
    // Split on known AMC names within the text
    const subSegments = splitByAmcBoundaries(part);
    result.push(...subSegments);
  }

  return result.filter(s => s.length > 10);
}

function splitByAmcBoundaries(text: string): string[] {
  // If the text contains known AMC names mid-entry, split there
  const segments: string[] = [text];
  for (const amc of KNOWN_AMCS) {
    const len = segments.length;
    for (let i = 0; i < len; i++) {
      if (segments[i].length < 30) continue;
      const idx = segments[i].indexOf(amc + ' ');
      if (idx > 5) {
        const before = segments[i].slice(0, idx).trim();
        const after = segments[i].slice(idx).trim();
        if (before) segments.push(before);
        if (after) segments.push(after);
        segments[i] = '';
      }
    }
  }
  return segments.filter(s => s.length > 0);
}

function findFirstNumberIndex(text: string): number {
  const match = text.match(/\d+\.\d+/);
  return match ? match.index! : -1;
}

// ── Self-test ──
const SAMPLE = `CAMS Consolidated Account Statement

For: John Doe
PAN: ABCDE1234F
Statement Period: 01-Apr-2023 to 31-Mar-2024

HDFC Mutual Fund

Folio No: 1234567890
HDFC Top 100 Fund - Direct Plan(G)
100.000                                       50.1234                       5,012.34                    5,000.00

Folio No: 1234567891
HDFC Mid-Cap Opportunities Fund - Direct Plan(G)
200.000                                      75.5678                       15,113.56                   14,500.00

ICICI Prudential Mutual Fund

Folio No: 2345678901
ICICI Prudential Bluechip Fund - Direct Plan(G)
150.000                                      60.9012                       9,135.18                    9,000.00

SBI Mutual Fund

Folio No: 3456789012
SBI Small Cap Fund - Direct Plan(G)
50.000                                       120.3456                      6,017.28                    5,500.00

Folio No: 3456789013
SBI Contra Fund - Direct Plan(G)
75.500                                       45.6789                       3,448.76                    3,200.00

Axis Mutual Fund

Folio No: 4567890123
Axis ELSS Tax Saver Fund - Direct Plan(G)
300.000                                      65.4321                       19,629.63                   18,000.00

Total Current Value: 58,356.75
Total Cost Value: 55,200.00`;

const result = parseCamsText(SAMPLE);
console.log(JSON.stringify(result, null, 2));
