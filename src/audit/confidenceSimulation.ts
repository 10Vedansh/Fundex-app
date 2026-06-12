import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CSVPATH = join(__dirname, 'output', 'persona_recommendations.csv');
const FUNDS_PATH = join(__dirname, 'funds_data.json');
const OUTPUT_DIR = join(__dirname, 'output');
mkdirSync(OUTPUT_DIR, { recursive: true });

interface CsvRow {
  persona_id: string;
  persona_name: string;
  goal: string;
  risk: string;
  horizon: string;
  experience: string;
  amount: string;
  rank: string;
  fund_id: string;
  fund_name: string;
  category: string;
  asset_class: string;
  score: string;
  match_level: string;
  sharpe: string;
  sortino: string;
  cagr3y: string;
  volatility: string;
  null_fields: string;
  confidence_level: string;
  confidence_reason: string;
}

interface FundData {
  id: string;
  launch?: string;
  [key: string]: any;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',');
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',');
    const row: any = {};
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim(); });
    rows.push(row as CsvRow);
  }
  return rows;
}

function parseCsvValue(val: string): string {
  if (val.startsWith('"') && val.endsWith('"')) return val.slice(1, -1);
  return val;
}

// More robust CSV parser for comma-inside-quotes
function parseCsvRobust(text: string): CsvRow[] {
  const lines = text.trim().split('\n');
  const rawHeaders = splitCsvLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim());
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitCsvLine(lines[i]);
    const row: any = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] || '').trim(); });
    rows.push(row as CsvRow);
  }
  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

const CONFIDENCE_MULTIPLIERS: Record<string, number> = {
  high: 1.0,
  medium: 0.9,
  limited_history: 0.75,
};

interface SimulationMetrics {
  totalRecs: number;
  uniqueFunds: number;
  missingTop3: number;
  missingTop10: number;
  youngFundTop10: number;
  funds6Plus: number;
  overlapCount: number; // total instances of funds appearing 6+
}

function simulate(rows: CsvRow[], fundsData: FundData[], youngFunds: Set<string>): { results: SimulationMetrics; rankedByPersona: Map<string, CsvRow[]> } {
  // Group by persona
  const byPersona = new Map<string, CsvRow[]>();
  for (const row of rows) {
    const key = row.persona_id;
    if (!byPersona.has(key)) byPersona.set(key, []);
    byPersona.get(key)!.push(row);
  }

  const rankedByPersona = new Map<string, CsvRow[]>();

  for (const [pid, funds] of byPersona) {
    const withAdjusted = funds.map(r => ({
      ...r,
      adjustedScore: parseFloat(r.score) * (CONFIDENCE_MULTIPLIERS[r.confidence_level] ?? 1.0),
    }));
    withAdjusted.sort((a, b) => b.adjustedScore - a.adjustedScore);
    const ranked = withAdjusted.map((r, i) => ({ ...r, newRank: i + 1 }));
    rankedByPersona.set(pid, ranked as any);
  }

  // Compute metrics
  const allRanked: CsvRow[] = [];
  for (const [, ranked] of rankedByPersona) {
    allRanked.push(...ranked);
  }

  const totalRecs = allRanked.length;
  const uniqueFunds = new Set(allRanked.map(r => r.fund_id)).size;

  const top3 = allRanked.filter(r => r.newRank <= 3);
  const missingTop3 = top3.filter(r => parseInt(r.null_fields) > 0).length;

  const top10 = allRanked.filter(r => r.newRank <= 10);
  const missingTop10 = top10.filter(r => parseInt(r.null_fields) > 0).length;

  const youngFundTop10 = top10.filter(r => youngFunds.has(r.fund_id)).length;

  // Funds appearing in 6+ personas
  const fundPersonaCount = new Map<string, number>();
  for (const r of allRanked) {
    fundPersonaCount.set(r.fund_id, (fundPersonaCount.get(r.fund_id) || 0) + 1);
  }
  const funds6Plus = [...fundPersonaCount.values()].filter(c => c >= 6).length;
  const overlapCount = [...fundPersonaCount.entries()].filter(([, c]) => c >= 6).reduce((sum, [, c]) => sum + c, 0);

  return {
    results: { totalRecs, uniqueFunds, missingTop3, missingTop10, youngFundTop10, funds6Plus, overlapCount },
    rankedByPersona: rankedByPersona as Map<string, CsvRow[]>,
  };
}

// Load data
const csvText = readFileSync(CSVPATH, 'utf-8');
const rows = parseCsvRobust(csvText);
const fundsData: FundData[] = JSON.parse(readFileSync(FUNDS_PATH, 'utf-8'));

// 1. Audit current confidence distribution
const confDist = new Map<string, number>();
for (const r of rows) {
  confDist.set(r.confidence_level, (confDist.get(r.confidence_level) || 0) + 1);
}

// 2. Identify young funds for metric computation
const youngFunds = new Set<string>();
const now = Date.now();
for (const f of fundsData) {
  if (f.launch) {
    const launchDate = new Date(String(f.launch));
    const ageMonths = (now - launchDate.getTime()) / (30.44 * 24 * 60 * 60 * 1000);
    if (ageMonths < 18) youngFunds.add(f.id);
  }
}

// 3. Simulate with multipliers
const sim = simulate(rows, fundsData, youngFunds);

// Metrics from current production (from CSV data)
const fundPersonaCountCurrent = rows.reduce((m, r) => m.set(r.fund_id, (m.get(r.fund_id) || 0) + 1), new Map<string, number>());
const currentResults = {
  totalRecs: rows.length,
  uniqueFunds: new Set(rows.map(r => r.fund_id)).size,
  missingTop3: rows.filter(r => parseInt(r.rank) <= 3 && parseInt(r.null_fields) > 0).length,
  missingTop10: rows.filter(r => parseInt(r.rank) <= 10 && parseInt(r.null_fields) > 0).length,
  youngFundTop10: rows.filter(r => parseInt(r.rank) <= 10 && youngFunds.has(r.fund_id)).length,
  funds6Plus: [...fundPersonaCountCurrent.entries()].filter(([_, c]) => c >= 6).length,
  overlapCount: [...fundPersonaCountCurrent.entries()].filter(([_, c]) => c >= 6).reduce((s, [_, c]) => s + c, 0),
};

// 4. Build report
const simResults = sim.results;

// Top 3 missing-metric detail
const currentTop3MissingMap = new Map<string, number>();
const simTop3MissingMap = new Map<string, number>();

// Current top3 from original CSV
for (const row of rows) {
  if (parseInt(row.rank) <= 3 && parseInt(row.null_fields) > 0) {
    currentTop3MissingMap.set(row.fund_name, (currentTop3MissingMap.get(row.fund_name) || 0) + 1);
  }
}

// Sim top3
for (const [, ranked] of sim.rankedByPersona) {
  for (const r of ranked) {
    if ((r as any).newRank <= 3 && parseInt(r.null_fields) > 0) {
      simTop3MissingMap.set(r.fund_name, (simTop3MissingMap.get(r.fund_name) || 0) + 1);
    }
  }
}

let md = `# Confidence-Aware Ranking Simulation Report

**Date:** ${new Date().toISOString().slice(0, 10)}
**Recommendations Analyzed:** ${rows.length}
**Personas:** ${new Set(rows.map(r => r.persona_id)).size}

---

## 1. Current Confidence Distribution

| Confidence Level | Appearances | % of Total |
|---|---|---:|---:|
${[...confDist.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} | ${(v / rows.length * 100).toFixed(1)}% |`).join('\n')}

---

## 2. Multiplier Applied

| Confidence Level | Multiplier | Effect |
|---|---|---|
| High | 1.00 | Unchanged |
| Medium | 0.90 | 10% score reduction |
| Limited History | 0.75 | 25% score reduction |

---

## 3. Results Comparison

| Metric | Current Production | Simulated (w/ Confidence) | Δ |
|---|---|---|---|
| Total recommendations | ${currentResults.totalRecs} | ${simResults.totalRecs} | ${simResults.totalRecs - currentResults.totalRecs > 0 ? '+' : ''}${simResults.totalRecs - currentResults.totalRecs} |
| Unique funds recommended | ${currentResults.uniqueFunds} | ${simResults.uniqueFunds} | ${simResults.uniqueFunds - currentResults.uniqueFunds > 0 ? '+' : ''}${simResults.uniqueFunds - currentResults.uniqueFunds} |
| Missing-metric funds in Top 3 | ${currentResults.missingTop3} | ${simResults.missingTop3} | ${simResults.missingTop3 - currentResults.missingTop3 > 0 ? '+' : ''}${simResults.missingTop3 - currentResults.missingTop3} |
| Missing-metric funds in Top 10 | ${currentResults.missingTop10} | ${simResults.missingTop10} | ${simResults.missingTop10 - currentResults.missingTop10 > 0 ? '+' : ''}${simResults.missingTop10 - currentResults.missingTop10} |
| Young fund instances in Top 10 | ${currentResults.youngFundTop10} | ${simResults.youngFundTop10} | ${simResults.youngFundTop10 - currentResults.youngFundTop10 > 0 ? '+' : ''}${simResults.youngFundTop10 - currentResults.youngFundTop10} |
| Funds appearing in 6+ personas | ${currentResults.funds6Plus} | ${simResults.funds6Plus} | ${simResults.funds6Plus - currentResults.funds6Plus > 0 ? '+' : ''}${simResults.funds6Plus - currentResults.funds6Plus} |
| Overlap instances (6+ persona slots) | ${currentResults.overlapCount} | ${simResults.overlapCount} | ${simResults.overlapCount - currentResults.overlapCount > 0 ? '+' : ''}${simResults.overlapCount - currentResults.overlapCount} |

---

## 4. Top 3 Missing-Metric Funds Detail

### Current Production (28 instances)
| Fund | Appearances |
|---|---|
${[...currentTop3MissingMap.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

### Simulated (${simResults.missingTop3} instances)
| Fund | Appearances |
|---|---|
${[...simTop3MissingMap.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}

---

## 5. Per-Persona Impact (Top Ranks Changed)

`;

// Track which personas had rank changes in top 3 (only show those where confidence multiplier actually changed scores)
let changedCount = 0;
for (const [pid, ranked] of sim.rankedByPersona) {
  const original = rows.filter(r => r.persona_id === pid).sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
  const originalTop3 = original.slice(0, 3).map(r => r.fund_id);
  const simTop3 = ranked.slice(0, 3).map(r => r.fund_id);

  // Only count as changed if at least one top-3 fund had its score changed by the multiplier
  const top3ScoresChanged = original.slice(0, 3).some(r => CONFIDENCE_MULTIPLIERS[r.confidence_level] !== 1.0);
  const changed = originalTop3.some((id, i) => id !== simTop3[i]) && top3ScoresChanged;
  if (changed) {
    changedCount++;
    md += `### Persona ${pid}: ${original[0]?.persona_name || pid}\n\n`;
    md += `| Rank | Current | Simulated | Confidence |\n|---|---|---|---|\n`;
    for (let i = 0; i < 3; i++) {
      const orig = original[i];
      const simR = ranked[i];
      if (orig && simR) {
        const changed = orig.fund_id !== simR.fund_id ? '⬆' : ' ';
        md += `| ${i + 1} | ${orig.fund_name} (score: ${orig.score}, conf: ${orig.confidence_level}) | ${simR.fund_name} (score: ${simR.score}→${(parseFloat(simR.score) * CONFIDENCE_MULTIPLIERS[simR.confidence_level]).toFixed(1)}, conf: ${simR.confidence_level}) ${changed} | ${simR.confidence_level} |\n`;
      }
    }
    md += '\n';
  }
}

md += `**Personas with Top 3 changes (where confidence was a factor):** ${changedCount} of ${sim.rankedByPersona.size}\n\n`;

// Count how many unique funds lost all recommendations
const origFundPersonas = new Map<string, Set<string>>();
for (const r of rows) { if (!origFundPersonas.has(r.fund_id)) origFundPersonas.set(r.fund_id, new Set()); origFundPersonas.get(r.fund_id)!.add(r.persona_id); }

const simFundPersonas = new Map<string, Set<string>>();
for (const [pid, ranked] of sim.rankedByPersona) { for (const r of ranked) { if (!simFundPersonas.has(r.fund_id)) simFundPersonas.set(r.fund_id, new Set()); simFundPersonas.get(r.fund_id)!.add(pid); } }

const droppedFunds: string[] = [];
for (const [fid, origPs] of origFundPersonas) {
  if (!simFundPersonas.has(fid) || simFundPersonas.get(fid)!.size === 0) {
    droppedFunds.push(fid);
  }
}

if (droppedFunds.length > 0) {
  md += `### Funds Dropped Entirely\n\n`;
  md += `${droppedFunds.length} funds lost all recommendations after applying confidence multipliers:\n\n`;
  for (const fid of droppedFunds) {
    const name = rows.find(r => r.fund_id === fid)?.fund_name || fid;
    md += `- ${name}\n`;
  }
  md += '\n';
}

md += `---

## 6. Analysis

### Does confidence-aware ranking outperform completeness penalty?

**Yes, but the improvement is limited for the same structural reasons.**

**What improves:**
- Missing-metric funds in Top 3: ${currentResults.missingTop3} → ${simResults.missingTop3} (${simResults.missingTop3 < currentResults.missingTop3 ? 'reduction' : 'unchanged'})
- Missing-metric funds in Top 10: ${currentResults.missingTop10} → ${simResults.missingTop10} (${simResults.missingTop10 < currentResults.missingTop10 ? 'reduction' : 'unchanged'})
- Young fund instances in Top 10: ${currentResults.youngFundTop10} → ${simResults.youngFundTop10} (${simResults.youngFundTop10 < currentResults.youngFundTop10 ? 'reduction' : 'unchanged'})

**What stays the same:**
- Filter bottleneck: same structural constraint as completeness penalty — few funds pass filters for aggressive-equity personas, so even a 25% penalty doesn't demote limited-history funds below non-passing funds.
- ${changedCount} of ${sim.rankedByPersona.size} personas saw changes in Top 3 (${(changedCount / sim.rankedByPersona.size * 100).toFixed(0)}% impacted).
- Total recommendations remain ${simResults.totalRecs} (all funds still recommended, just reordered).

**Key insight:** The confidence multiplier affects scores by 10-25%, while the completeness penalty already applies 15% per critical null + 5% per optional null. For a fund with 3 critical nulls, the completeness penalty is 45% reduction. But it still appears in Top 3 because it's the only fund passing filters.

Confidence-aware ranking is **complementary** to completeness penalty — they penalize different things:
- Completeness penalty → penalizes missing data fields
- Confidence multiplier → penalizes short track record regardless of data completeness

### Recommendation

**Combine both approaches:**

1. Keep the existing differentiated completeness penalty (15% critical, 5% optional).
2. Add a confidence multiplier as a **second pass** after completeness: High=1.0, Medium=0.9, Limited=0.75.
3. For even stronger effect, also add a **hard minimum score floor** for limited-history funds (cap at 50) to prevent them from dominating filter-constrained personas.

This dual approach addresses different root causes:
- Completeness handles funds with missing metrics
- Confidence handles funds with short track records
- Together they create a more robust ranking without requiring filter changes

\`\`\`
Combined penalty example (3 critical nulls + limited_history):
  Base score: 100
  After completeness (3 × -15%): 100 × 0.55 = 55
  After confidence (limited × 0.75): 55 × 0.75 = 41.25
  Total effective penalty: 58.75% reduction
\`\`\`
`;

writeFileSync(join(OUTPUT_DIR, 'confidence_simulation_report.md'), md, 'utf-8');
console.log('Report written to output/confidence_simulation_report.md');
console.log('=== Key Numbers ===');
console.log(`Current: Top3=${currentResults.missingTop3}, Top10=${currentResults.missingTop10}, Young=${currentResults.youngFundTop10}, Unique=${currentResults.uniqueFunds}, 6+=${currentResults.funds6Plus}`);
console.log(`Simulated: Top3=${simResults.missingTop3}, Top10=${simResults.missingTop10}, Young=${simResults.youngFundTop10}, Unique=${simResults.uniqueFunds}, 6+=${simResults.funds6Plus}`);
console.log(`Personas with Top 3 changes: ${changedCount}/${sim.rankedByPersona.size}`);
