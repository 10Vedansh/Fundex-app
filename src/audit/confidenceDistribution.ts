import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MutualFund {
  id: string;
  name?: string;
  category?: string;
  amc?: string;
  aum?: number;
  launch?: string;
  sharpeRatio?: number | string;
  sortinoRatio?: number | string;
  volatility?: number | string;
  stdDev?: number | string;
  ret3Y?: number | string;
  cagr3Y?: number | string;
  expenseRatio?: number | string;
  [key: string]: any;
}

type ConfidenceLevel = 'high' | 'medium' | 'limited_history';

function computeConfidence(fund: MutualFund): { level: ConfidenceLevel; reason: string } {
  const safeNum = (val: any): number | null => {
    if (val === null || val === undefined || val === '' || val === '--') return null;
    const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
    return isNaN(n) ? null : n;
  };
  const nullSharpe = safeNum(fund.sharpeRatio) === null;
  const nullVol = (safeNum(fund.volatility) ?? safeNum(fund.stdDev)) === null;
  const nullCagr = safeNum(fund.ret3Y ?? fund.cagr3Y) === null;
  const criticalNulls = [nullSharpe, nullVol, nullCagr].filter(Boolean).length;
  let ageYears = 0;
  if (fund.launch) {
    const launchDate = new Date(String(fund.launch));
    ageYears = (Date.now() - launchDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  }
  if (ageYears >= 5 && criticalNulls === 0) {
    const label = ageYears >= 10 ? '10+ year' : `${Math.floor(ageYears)}-year`;
    return { level: 'high', reason: `Fund has ${label} track record and complete performance history.` };
  }
  if (ageYears >= 3 && criticalNulls <= 1) {
    return { level: 'medium', reason: 'Fund has sufficient track record but limited metric availability.' };
  }
  const reason = ageYears < 3
    ? 'Fund is relatively new or lacks sufficient historical performance data.'
    : 'Fund lacks sufficient historical performance data due to missing critical metrics.';
  return { level: 'limited_history', reason };
}

function assetClass(cat: string): string {
  if (cat.startsWith('DT-')) return 'Debt';
  if (cat.startsWith('HY-')) return 'Hybrid';
  if (cat.startsWith('EQ-')) return 'Equity';
  return 'Other';
}

function parseCsvLine(line: string): string[] {
  const vals: string[] = [];
  let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { vals.push(cur); cur = ''; continue; }
    cur += ch;
  }
  vals.push(cur);
  return vals;
}

const funds: MutualFund[] = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8'));
const csvText = readFileSync(join(__dirname, 'output', 'persona_recommendations.csv'), 'utf-8');
const csvLines = csvText.trim().split('\n');
const headers = parseCsvLine(csvLines[0]);
const recRows = csvLines.slice(1).map(parseCsvLine);
const recs = recRows.map(vals => {
  const r: Record<string, string> = {};
  headers.forEach((h, i) => { r[h.trim()] = (vals[i] || '').trim(); });
  return r;
});

console.log(`\n=== OVERALL CONFIDENCE DISTRIBUTION (${funds.length} funds) ===\n`);

const counts: Record<string, number> = { high: 0, medium: 0, limited_history: 0 };
const byClass: Record<string, Record<string, number>> = {};
for (const f of funds) {
  const cl = computeConfidence(f).level;
  counts[cl]++;
  const ac = assetClass(f.category || '');
  if (!byClass[ac]) byClass[ac] = { high: 0, medium: 0, limited_history: 0 };
  byClass[ac][cl]++;
}

console.log(`  High:            ${counts.high.toString().padStart(4)} / ${funds.length}  (${(counts.high / funds.length * 100).toFixed(1)}%)`);
console.log(`  Medium:          ${counts.medium.toString().padStart(4)} / ${funds.length}  (${(counts.medium / funds.length * 100).toFixed(1)}%)`);
console.log(`  Limited History: ${counts.limited_history.toString().padStart(4)} / ${funds.length}  (${(counts.limited_history / funds.length * 100).toFixed(1)}%)\n`);

console.log(`=== BY ASSET CLASS ===\n`);
console.log(`  ${'Class'.padEnd(10)} ${'Total'.padStart(5)} ${'High'.padStart(5)} ${'%'.padStart(4)} ${'Medium'.padStart(6)} ${'%'.padStart(4)} ${'Limited'.padStart(8)} ${'%'.padStart(4)}`);
for (const [ac, c] of Object.entries(byClass)) {
  const t = c.high + c.medium + c.limited_history;
  console.log(`  ${ac.padEnd(10)} ${t.toString().padStart(5)} ${c.high.toString().padStart(5)} ${(c.high / t * 100).toFixed(0).padStart(3)}% ${c.medium.toString().padStart(6)} ${(c.medium / t * 100).toFixed(0).padStart(3)}% ${c.limited_history.toString().padStart(8)} ${(c.limited_history / t * 100).toFixed(0).padStart(3)}%`);
}

console.log(`\n=== MEDIAN AGE BY ASSET CLASS × CONFIDENCE ===\n`);
const ages: Record<string, Record<string, number[]>> = {};
for (const f of funds) {
  if (!f.launch) continue;
  const cl = computeConfidence(f).level;
  const ac = assetClass(f.category || '');
  if (!ages[ac]) ages[ac] = { high: [], medium: [], limited_history: [] };
  const d = new Date(String(f.launch));
  ages[ac][cl].push((Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}
for (const [ac, levels] of Object.entries(ages)) {
  for (const [cl, vals] of Object.entries(levels)) {
    if (vals.length === 0) continue;
    vals.sort((a, b) => a - b);
    const m = vals.length % 2 === 0 ? (vals[vals.length / 2 - 1] + vals[vals.length / 2]) / 2 : vals[Math.floor(vals.length / 2)];
    console.log(`  ${ac.padEnd(10)} ${cl.padEnd(16)} n=${vals.length.toString().padStart(4)}  median=${m.toFixed(1)}y`);
  }
}

console.log(`\n=== TOP 20 MOST RECOMMENDED FUNDS ===\n`);
const app: Record<string, { count: number; name: string; category: string }> = {};
for (const r of recs) {
  if (!app[r.fund_id]) app[r.fund_id] = { count: 0, name: r.fund_name, category: r.category || '' };
  app[r.fund_id].count++;
}
const sorted = Object.entries(app).sort((a, b) => b[1].count - a[1].count).slice(0, 20);
const fundMap = new Map(funds.map(f => [f.id, f]));

console.log(`  ${'#'.padEnd(3)} ${'App'.padEnd(4)} ${'Conf'.padEnd(16)} ${'Class'.padEnd(8)} ${'Fund'.padEnd(50)} ${'Cat'}`);
for (const [id, info] of sorted) {
  const f = fundMap.get(id);
  const cl = f ? computeConfidence(f).level : '?';
  const ac = assetClass(f?.category || info.category);
  console.log(`  ${sorted.indexOf([id, info]).toString().padStart(2)}. ${info.count.toString().padStart(3)} ${cl.padEnd(16)} ${ac.padEnd(8)} ${info.name.padEnd(50)} ${info.category}`);
}

console.log(`\n=== COUNT OF LIMITED_HISTORY FUNDS IN TOP 10 BY PERSONA ===\n`);
const limInTop10 = new Map<string, number>();
for (const r of recs) {
  if (parseInt(r.rank) <= 10 && ['limited_history', 'medium'].includes(r.confidence_level)) {
    limInTop10.set(r.persona_name, (limInTop10.get(r.persona_name) || 0) + 1);
  }
}
const byLimCount = new Map<number, string[]>();
for (const [pn, c] of limInTop10) {
  if (!byLimCount.has(c)) byLimCount.set(c, []);
  byLimCount.get(c)!.push(pn);
}
for (const [cnt, personas] of [...byLimCount.entries()].sort((a, b) => b[0] - a[0])) {
  console.log(`  ${cnt} limited/medium in Top 10: ${personas.join(', ')}`);
}

console.log(`\n=== VERIFICATION: Over-favoring debt? ===`);
// Check: among the 8 remaining limited_history funds in simulated Top 3, what fraction are equity?
const limitedFunds = new Set<string>();
for (const r of recs) {
  if (parseInt(r.rank) <= 3 && r.confidence_level === 'limited_history') {
    limitedFunds.add(r.fund_id);
  }
}
console.log(`\n  Currently in Top 3 with limited_history confidence: ${limitedFunds.size} unique funds`);
for (const fid of limitedFunds) {
  const f = fundMap.get(fid);
  const ac = assetClass(f?.category || '');
  const name = app[fid]?.name || fid;
  console.log(`    ${name.padEnd(55)} ${f?.category?.padEnd(12)} ${ac}`);
}

console.log(`\n=== VERIFICATION: Would debt/arbitrage flood equity top ranks? ===`);
// For each aggressive-equity persona, show what % of current top 10 are equity
const aggressivePersonas = [...new Set(recs.filter(r => r.risk === 'aggressive' && r.goal !== 'capital_preservation').map(r => r.persona_name))];
for (const pn of aggressivePersonas.slice(0, 5)) {
  const rows = recs.filter(r => r.persona_name === pn);
  const top10 = rows.sort((a, b) => parseInt(a.rank) - parseInt(b.rank)).slice(0, 10);
  const equityCount = top10.filter(r => r.asset_class === 'Equity').length;
  const limCount = top10.filter(r => r.confidence_level !== 'high').length;
  console.log(`  ${pn.padEnd(42)} equity=${equityCount}/10  non-high-conf=${limCount}/10`);
}
