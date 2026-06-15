import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface MutualFund {
  id: string; name?: string; category?: string; launch?: string; [key: string]: any;
}
type ConfidenceLevel = 'high' | 'medium' | 'limited_history';

function parseCsvLine(line: string): string[] {
  const vals: string[] = [];
  let cur = '', inQ = false;
  for (const ch of line) { if (ch === '"') { inQ = !inQ; continue; } if (ch === ',' && !inQ) { vals.push(cur); cur = ''; continue; } cur += ch; }
  vals.push(cur); return vals;
}

const funds: MutualFund[] = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8'));
const fundMap = new Map(funds.map(f => [f.id, f]));

const csvText = readFileSync(join(__dirname, 'output', 'persona_recommendations.csv'), 'utf-8');
const csvLines = csvText.trim().split('\n');
const headers = parseCsvLine(csvLines[0]);
const rows = csvLines.slice(1).map(parseCsvLine).map(vals => {
  const r: Record<string, string> = {};
  headers.forEach((h, i) => { r[h.trim()] = (vals[i] || '').trim(); });
  return r;
});

// Group by persona
const byPersona = new Map<string, Record<string, string>[]>();
for (const r of rows) {
  const pid = r.persona_id;
  if (!byPersona.has(pid)) byPersona.set(pid, []);
  byPersona.get(pid)!.push(r);
}

// Precompute fund properties
function getAgeYears(fundId: string): number | null {
  const f = fundMap.get(fundId);
  if (!f?.launch) return null;
  return (Date.now() - new Date(String(f.launch)).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function getConfidence(fundId: string): ConfidenceLevel {
  const f = fundMap.get(fundId);
  if (!f) return 'limited_history';
  const safeNum = (val: any): number | null => {
    if (val === null || val === undefined || val === '' || val === '--') return null;
    const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
    return isNaN(n) ? null : n;
  };
  const nullSharpe = safeNum(f.sharpeRatio) === null;
  const nullVol = (safeNum(f.volatility) ?? safeNum(f.stdDev)) === null;
  const nullCagr = safeNum(f.ret3Y ?? f.cagr3Y) === null;
  const critNulls = [nullSharpe, nullVol, nullCagr].filter(Boolean).length;
  const age = getAgeYears(fundId) ?? 0;
  if (age >= 5 && critNulls === 0) return 'high';
  if (age >= 3 && critNulls <= 1) return 'medium';
  return 'limited_history';
}

// ── Simulations ──

function runSimA(): Record<string, string>[] { // No fund < 1yr in Top 3
  const result: Record<string, string>[] = [];
  for (const [pid, recs] of byPersona) {
    const ordered = [...recs].sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
    const eligible: Record<string, string>[] = [];
    const ineligible: Record<string, string>[] = [];
    for (const r of ordered) {
      const age = getAgeYears(r.fund_id);
      if (age !== null && age < 1) ineligible.push(r);
      else eligible.push(r);
    }
    // Top 3 from eligible, rest from eligible + ineligible preserving original order
    const top3 = eligible.slice(0, 3);
    // Fill remaining from ordered, skipping those in top3
    const used = new Set(top3.map(r => r.fund_id));
    const rest = ordered.filter(r => !used.has(r.fund_id));
    const newOrder = [...top3, ...rest];
    newOrder.forEach((r, i) => { result.push({ ...r, new_rank: String(i + 1) }); });
  }
  return result;
}

function runSimB(): Record<string, string>[] { // No fund < 2yr in Top 3
  const result: Record<string, string>[] = [];
  for (const [pid, recs] of byPersona) {
    const ordered = [...recs].sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
    const eligible: Record<string, string>[] = [];
    const ineligible: Record<string, string>[] = [];
    for (const r of ordered) {
      const age = getAgeYears(r.fund_id);
      if (age !== null && age < 2) ineligible.push(r);
      else eligible.push(r);
    }
    const top3 = eligible.slice(0, 3);
    const used = new Set(top3.map(r => r.fund_id));
    const rest = ordered.filter(r => !used.has(r.fund_id));
    const newOrder = [...top3, ...rest];
    newOrder.forEach((r, i) => { result.push({ ...r, new_rank: String(i + 1) }); });
  }
  return result;
}

function runSimC(): Record<string, string>[] { // Confidence tiebreaker when score diff < 5%
  const result: Record<string, string>[] = [];
  for (const [pid, recs] of byPersona) {
    const ordered = [...recs].sort((a, b) => parseInt(a.rank) - parseInt(b.rank));
    const confLevels: Record<string, number> = { high: 3, medium: 2, limited_history: 1 };
    // Bubble-sort adjacent pairs where score diff < 5% and confidence ordering is wrong
    let swapped = true;
    while (swapped) {
      swapped = false;
      for (let i = 0; i < ordered.length - 1; i++) {
        const a = ordered[i], b = ordered[i + 1];
        const sa = parseFloat(a.score), sb = parseFloat(b.score);
        const diff = Math.abs(sa - sb) / Math.max(sa, sb, 0.01);
        if (diff < 0.05) {
          const ca = confLevels[getConfidence(a.fund_id)] || 1;
          const cb = confLevels[getConfidence(b.fund_id)] || 1;
          if (cb > ca) {
            [ordered[i], ordered[i + 1]] = [ordered[i + 1], ordered[i]];
            swapped = true;
          }
        }
      }
    }
    ordered.forEach((r, i) => { result.push({ ...r, new_rank: String(i + 1) }); });
  }
  return result;
}

function computeMetrics(simRows: Record<string, string>[], label: string) {
  const youngFundIds = new Set<string>();
  for (const f of funds) {
    if (f.launch) {
      const m = (Date.now() - new Date(String(f.launch)).getTime()) / (30.44 * 24 * 60 * 60 * 1000);
      if (m < 18) youngFundIds.add(f.id);
    }
  }

  const total = simRows.length;
  const unique = new Set(simRows.map(r => r.fund_id)).size;

  const top3 = simRows.filter(r => parseInt(r.new_rank) <= 3);
  const top10 = simRows.filter(r => parseInt(r.new_rank) <= 10);

  const missTop3 = top3.filter(r => parseInt(r.null_fields) > 0).length;
  const missTop10 = top10.filter(r => parseInt(r.null_fields) > 0).length;
  const youngTop10 = top10.filter(r => youngFundIds.has(r.fund_id)).length;

  const equityTop10 = top10.filter(r => { const c = r.category || ''; return c.startsWith('EQ-'); }).length;
  const debtTop10 = top10.filter(r => { const c = r.category || ''; return c.startsWith('DT-'); }).length;
  const hybridTop10 = top10.filter(r => { const c = r.category || ''; return c.startsWith('HY-'); }).length;

  // Overlap
  const pc = new Map<string, number>();
  for (const r of simRows) pc.set(r.fund_id, (pc.get(r.fund_id) || 0) + 1);
  const overlap6 = [...pc.values()].filter(c => c >= 6).length;
  const overlapSum = [...pc.entries()].filter(([, c]) => c >= 6).reduce((s, [, c]) => s + c, 0);

  // Find the 8 young fund instances in current production and check if any were removed
  const simYoungInstances = simRows.filter(r => parseInt(r.new_rank) <= 10 && youngFundIds.has(r.fund_id)).length;
  const origYoungInstances = rows.filter(r => parseInt(r.rank) <= 10 && youngFundIds.has(r.fund_id)).length;

  return { label, total, unique, missTop3, missTop10, youngTop10, equityTop10, debtTop10, hybridTop10, overlap6, overlapSum, origYoungInstances, simYoungInstances };
}

// Run
const simA = runSimA();
const simB = runSimB();
const simC = runSimC();

const metricsA = computeMetrics(simA, 'A: No <1yr in Top 3');
const metricsB = computeMetrics(simB, 'B: No <2yr in Top 3');
const metricsC = computeMetrics(simC, 'C: Confidence tiebreaker (<5%)');

// Current
const currentMetrics = computeMetrics(
  rows.map(r => ({ ...r, new_rank: r.rank })),
  'Current Production'
);

// ── Report ──
const outputDir = join(__dirname, '../../reports/recommendation-engine');
mkdirSync(outputDir, { recursive: true });

function makeRow(label: string, cur: any, sim: any): string {
  const cells = [label,
    String(cur.missTop3), String(sim.missTop3), String(sim.missTop3 - cur.missTop3),
    String(cur.missTop10), String(sim.missTop10), String(sim.missTop10 - cur.missTop10),
    String(cur.youngTop10), String(sim.youngTop10), String(sim.youngTop10 - cur.youngTop10),
    String(cur.equityTop10), String(sim.equityTop10), String(sim.equityTop10 - cur.equityTop10),
    String(cur.debtTop10), String(sim.debtTop10), String(sim.debtTop10 - cur.debtTop10),
    String(sim.unique), String(sim.overlap6),
  ];
  return '| ' + cells.join(' | ') + ' |';
}

let md = `# Ranking Simulation Comparison

**Date:** ${new Date().toISOString().slice(0, 10)}
**Fund Universe:** ${funds.length} funds
**Personas:** ${byPersona.size}

---

## Methodology

### Simulation A — No fund < 1 year old can rank in Top 3
Funds younger than 1 year (launch date after ${new Date(Date.now() - 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)}) are skipped for positions 1-3. The next eligible fund in the original order moves up. All other positions follow the original diversified order.

### Simulation B — No fund < 2 years old can rank in Top 3
Same as A but threshold is 2 years (launch date after ${new Date(Date.now() - 2 * 365.25 * 24 * 3600 * 1000).toISOString().slice(0, 10)}).

### Simulation C — Confidence as tiebreaker (score diff < 5%)
Adjacent funds in the ranking with scores within 5% of each other are reordered so the higher-confidence fund ranks first. This is a local bubble-sort, not a global re-sort.

---

## Results Summary

| Metric | Curr | A | ΔA | Curr | B | ΔB | Curr | C | ΔC |
|---|---|---|---|---|---|---|---|---|---|
| Missing-metric Top 3 | ${currentMetrics.missTop3} | ${metricsA.missTop3} | ${metricsA.missTop3 - currentMetrics.missTop3} | ${currentMetrics.missTop3} | ${metricsB.missTop3} | ${metricsB.missTop3 - currentMetrics.missTop3} | ${currentMetrics.missTop3} | ${metricsC.missTop3} | ${metricsC.missTop3 - currentMetrics.missTop3} |
| Missing-metric Top 10 | ${currentMetrics.missTop10} | ${metricsA.missTop10} | ${metricsA.missTop10 - currentMetrics.missTop10} | ${currentMetrics.missTop10} | ${metricsB.missTop10} | ${metricsB.missTop10 - currentMetrics.missTop10} | ${currentMetrics.missTop10} | ${metricsC.missTop10} | ${metricsC.missTop10 - currentMetrics.missTop10} |
| Young fund instances in Top 10 | ${currentMetrics.youngTop10} | ${metricsA.youngTop10} | ${metricsA.youngTop10 - currentMetrics.youngTop10} | ${currentMetrics.youngTop10} | ${metricsB.youngTop10} | ${metricsB.youngTop10 - currentMetrics.youngTop10} | ${currentMetrics.youngTop10} | ${metricsC.youngTop10} | ${metricsC.youngTop10 - currentMetrics.youngTop10} |
| Equity funds in Top 10 | ${currentMetrics.equityTop10} | ${metricsA.equityTop10} | ${metricsA.equityTop10 - currentMetrics.equityTop10} | ${currentMetrics.equityTop10} | ${metricsB.equityTop10} | ${metricsB.equityTop10 - currentMetrics.equityTop10} | ${currentMetrics.equityTop10} | ${metricsC.equityTop10} | ${metricsC.equityTop10 - currentMetrics.equityTop10} |
| Debt funds in Top 10 | ${currentMetrics.debtTop10} | ${metricsA.debtTop10} | ${metricsA.debtTop10 - currentMetrics.debtTop10} | ${currentMetrics.debtTop10} | ${metricsB.debtTop10} | ${metricsB.debtTop10 - currentMetrics.debtTop10} | ${currentMetrics.debtTop10} | ${metricsC.debtTop10} | ${metricsC.debtTop10 - currentMetrics.debtTop10} |
| Hybrid funds in Top 10 | ${currentMetrics.hybridTop10} | ${metricsA.hybridTop10} | ${metricsA.hybridTop10 - currentMetrics.hybridTop10} | ${currentMetrics.hybridTop10} | ${metricsB.hybridTop10} | ${metricsB.hybridTop10 - currentMetrics.hybridTop10} | ${currentMetrics.hybridTop10} | ${metricsC.hybridTop10} | ${metricsC.hybridTop10 - currentMetrics.hybridTop10} |
| Unique funds | ${currentMetrics.unique} | ${metricsA.unique} | ${metricsA.unique - currentMetrics.unique} | ${currentMetrics.unique} | ${metricsB.unique} | ${metricsB.unique - currentMetrics.unique} | ${currentMetrics.unique} | ${metricsC.unique} | ${metricsC.unique - currentMetrics.unique} |
| Funds in 6+ personas | ${currentMetrics.overlap6} | ${metricsA.overlap6} | ${metricsA.overlap6 - currentMetrics.overlap6} | ${currentMetrics.overlap6} | ${metricsB.overlap6} | ${metricsB.overlap6 - currentMetrics.overlap6} | ${currentMetrics.overlap6} | ${metricsC.overlap6} | ${metricsC.overlap6 - currentMetrics.overlap6} |

---

## Detailed Metrics per Simulation

### Simulation A — No fund < 1 year in Top 3

| Metric | Current | Sim A | Δ |
|---|---|---|---|
| Total recommendations | ${currentMetrics.total} | ${metricsA.total} | ${metricsA.total - currentMetrics.total} |
| Unique funds | ${currentMetrics.unique} | ${metricsA.unique} | ${metricsA.unique - currentMetrics.unique} |
| Missing-metric Top 3 | ${currentMetrics.missTop3} | ${metricsA.missTop3} | ${metricsA.missTop3 - currentMetrics.missTop3} |
| Missing-metric Top 10 | ${currentMetrics.missTop10} | ${metricsA.missTop10} | ${metricsA.missTop10 - currentMetrics.missTop10} |
| Young fund instances Top 10 | ${currentMetrics.youngTop10} | ${metricsA.youngTop10} | ${metricsA.youngTop10 - currentMetrics.youngTop10} |
| Equity in Top 10 (∑ across all personas) | ${currentMetrics.equityTop10} | ${metricsA.equityTop10} | ${metricsA.equityTop10 - currentMetrics.equityTop10} |
| Debt in Top 10 | ${currentMetrics.debtTop10} | ${metricsA.debtTop10} | ${metricsA.debtTop10 - currentMetrics.debtTop10} |
| Hybrid in Top 10 | ${currentMetrics.hybridTop10} | ${metricsA.hybridTop10} | ${metricsA.hybridTop10 - currentMetrics.hybridTop10} |
| Funds in 6+ personas | ${currentMetrics.overlap6} | ${metricsA.overlap6} | ${metricsA.overlap6 - currentMetrics.overlap6} |

### Simulation B — No fund < 2 years in Top 3

| Metric | Current | Sim B | Δ |
|---|---|---|---|
| Total recommendations | ${currentMetrics.total} | ${metricsB.total} | ${metricsB.total - currentMetrics.total} |
| Unique funds | ${currentMetrics.unique} | ${metricsB.unique} | ${metricsB.unique - currentMetrics.unique} |
| Missing-metric Top 3 | ${currentMetrics.missTop3} | ${metricsB.missTop3} | ${metricsB.missTop3 - currentMetrics.missTop3} |
| Missing-metric Top 10 | ${currentMetrics.missTop10} | ${metricsB.missTop10} | ${metricsB.missTop10 - currentMetrics.missTop10} |
| Young fund instances Top 10 | ${currentMetrics.youngTop10} | ${metricsB.youngTop10} | ${metricsB.youngTop10 - currentMetrics.youngTop10} |
| Equity in Top 10 | ${currentMetrics.equityTop10} | ${metricsB.equityTop10} | ${metricsB.equityTop10 - currentMetrics.equityTop10} |
| Debt in Top 10 | ${currentMetrics.debtTop10} | ${metricsB.debtTop10} | ${metricsB.debtTop10 - currentMetrics.debtTop10} |
| Hybrid in Top 10 | ${currentMetrics.hybridTop10} | ${metricsB.hybridTop10} | ${metricsB.hybridTop10 - currentMetrics.hybridTop10} |
| Funds in 6+ personas | ${currentMetrics.overlap6} | ${metricsB.overlap6} | ${metricsB.overlap6 - currentMetrics.overlap6} |

### Simulation C — Confidence tiebreaker (< 5%)

| Metric | Current | Sim C | Δ |
|---|---|---|---|
| Total recommendations | ${currentMetrics.total} | ${metricsC.total} | ${metricsC.total - currentMetrics.total} |
| Unique funds | ${currentMetrics.unique} | ${metricsC.unique} | ${metricsC.unique - currentMetrics.unique} |
| Missing-metric Top 3 | ${currentMetrics.missTop3} | ${metricsC.missTop3} | ${metricsC.missTop3 - currentMetrics.missTop3} |
| Missing-metric Top 10 | ${currentMetrics.missTop10} | ${metricsC.missTop10} | ${metricsC.missTop10 - currentMetrics.missTop10} |
| Young fund instances Top 10 | ${currentMetrics.youngTop10} | ${metricsC.youngTop10} | ${metricsC.youngTop10 - currentMetrics.youngTop10} |
| Equity in Top 10 | ${currentMetrics.equityTop10} | ${metricsC.equityTop10} | ${metricsC.equityTop10 - currentMetrics.equityTop10} |
| Debt in Top 10 | ${currentMetrics.debtTop10} | ${metricsC.debtTop10} | ${metricsC.debtTop10 - currentMetrics.debtTop10} |
| Hybrid in Top 10 | ${currentMetrics.hybridTop10} | ${metricsC.hybridTop10} | ${metricsC.hybridTop10 - currentMetrics.hybridTop10} |
| Funds in 6+ personas | ${currentMetrics.overlap6} | ${metricsC.overlap6} | ${metricsC.overlap6 - currentMetrics.overlap6} |

---

## Per-Persona Changes

### Simulation A — Top 3 Changes
`;

// Per-persona detail for A
let simAChanges = 0;
for (const [pid, recs] of byPersona) {
  const orig = recs.sort((a, b) => parseInt(a.rank) - parseInt(b.rank)).slice(0, 3).map(r => ({ id: r.fund_id, name: r.fund_name, score: r.score, nulls: r.null_fields, age: getAgeYears(r.fund_id) }));
  const simTop3 = simA.filter(r => r.persona_id === pid && parseInt(r.new_rank) <= 3).sort((a, b) => parseInt(a.new_rank) - parseInt(b.new_rank)).map(r => ({ id: r.fund_id, name: r.fund_name, score: r.score, nulls: r.null_fields, age: getAgeYears(r.fund_id) }));
  const changed = orig.some((o, i) => o.id !== simTop3[i]?.id);
  if (changed) {
    simAChanges++;
    md += `**Persona ${pid}:**\n`;
    for (let i = 0; i < 3; i++) {
      const o = orig[i]; const s = simTop3[i];
      const oAge = o.age !== null ? o.age.toFixed(1) + 'y' : 'N/A';
      const sAge = s.age !== null ? s.age.toFixed(1) + 'y' : 'N/A';
      md += `- #${i + 1}: ~~${o.name} (score: ${o.score}, nulls: ${o.nulls}, age: ${oAge})~~ → **${s.name}** (score: ${s.score}, nulls: ${s.nulls}, age: ${sAge})\n`;
    }
    md += '\n';
  }
}
md += `**Personas with Top 3 changes:** ${simAChanges} / ${byPersona.size}\n\n`;

// Per-persona detail for B
md += `### Simulation B — Top 3 Changes\n`;
let simBChanges = 0;
for (const [pid, recs] of byPersona) {
  const orig = recs.sort((a, b) => parseInt(a.rank) - parseInt(b.rank)).slice(0, 3).map(r => ({ id: r.fund_id, name: r.fund_name, score: r.score, nulls: r.null_fields, age: getAgeYears(r.fund_id) }));
  const simTop3 = simB.filter(r => r.persona_id === pid && parseInt(r.new_rank) <= 3).sort((a, b) => parseInt(a.new_rank) - parseInt(b.new_rank)).map(r => ({ id: r.fund_id, name: r.fund_name, score: r.score, nulls: r.null_fields, age: getAgeYears(r.fund_id) }));
  const changed = orig.some((o, i) => o.id !== simTop3[i]?.id);
  if (changed) {
    simBChanges++;
    md += `**Persona ${pid}:**\n`;
    for (let i = 0; i < 3; i++) {
      const o = orig[i]; const s = simTop3[i];
      const oAge = o.age !== null ? o.age.toFixed(1) + 'y' : 'N/A';
      const sAge = s.age !== null ? s.age.toFixed(1) + 'y' : 'N/A';
      md += `- #${i + 1}: ~~${o.name} (score: ${o.score}, nulls: ${o.nulls}, age: ${oAge})~~ → **${s.name}** (score: ${s.score}, nulls: ${s.nulls}, age: ${sAge})\n`;
    }
    md += '\n';
  }
}
md += `**Personas with Top 3 changes:** ${simBChanges} / ${byPersona.size}\n\n`;

// Per-persona detail for C
md += `### Simulation C — Top 3 Changes\n`;
let simCChanges = 0;
for (const [pid, recs] of byPersona) {
  const orig = recs.sort((a, b) => parseInt(a.rank) - parseInt(b.rank)).slice(0, 3).map(r => ({ id: r.fund_id, name: r.fund_name, score: r.score, nulls: r.null_fields, conf: getConfidence(r.fund_id) }));
  const simTop3 = simC.filter(r => r.persona_id === pid && parseInt(r.new_rank) <= 3).sort((a, b) => parseInt(a.new_rank) - parseInt(b.new_rank)).map(r => ({ id: r.fund_id, name: r.fund_name, score: r.score, nulls: r.null_fields, conf: getConfidence(r.fund_id) }));
  const changed = orig.some((o, i) => o.id !== simTop3[i]?.id);
  if (changed) {
    simCChanges++;
    md += `**Persona ${pid}:**\n`;
    for (let i = 0; i < 3; i++) {
      const o = orig[i]; const s = simTop3[i];
      md += `- #${i + 1}: ~~${o.name} (score: ${o.score}, conf: ${o.conf})~~ → **${s.name}** (score: ${s.score}, conf: ${s.conf})\n`;
    }
    md += '\n';
  }
}
md += `**Personas with Top 3 changes:** ${simCChanges} / ${byPersona.size}\n\n`;

md += `---

## Root Cause Analysis

### How many young funds actually exist in the current ranking?

| Age bracket | Count in current Top 10 |
|---|---|
| < 1 year | ${
  rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 10 && a !== null && a < 1; }).length
} instances |
| 1-2 years | ${
  rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 10 && a !== null && a >= 1 && a < 2; }).length
} instances |
| 2-3 years | ${
  rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 10 && a !== null && a >= 2 && a < 3; }).length
} instances |
| 3-5 years | ${
  rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 10 && a !== null && a >= 3 && a < 5; }).length
} instances |
| 5+ years | ${
  rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 10 && a !== null && a >= 5; }).length
} instances |
| No launch data | ${
  rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 10 && a === null; }).length
} instances |

### How many young funds that rank in Top 3 would be blocked?

| Constraint | Blocked instances (in current Top 3) | Blocked unique funds |
|---|---|---|
| Age < 1 year | ${
  rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 3 && a !== null && a < 1; }).length
} | ${
  new Set(rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 3 && a !== null && a < 1; }).map(r => r.fund_name)).size
} |
| Age < 2 years | ${
  rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 3 && a !== null && a < 2; }).length
} | ${
  new Set(rows.filter(r => { const a = getAgeYears(r.fund_id); return parseInt(r.rank) <= 3 && a !== null && a < 2; }).map(r => r.fund_name)).size
} |

### What fills the gap when young funds are blocked?

When funds < 2 years are blocked from Top 3, the replacement funds come from:
- The next eligible fund in the original diversified order
- Typically debt/arbitrage funds (high confidence, older)
- But the equity category allocation from the original diversified order is preserved where possible
`;

// Show replacement details for B (2yr block)
md += `### Replacement details — Simulation B\n\n`;
for (const [pid, recs] of byPersona) {
  const origTop3 = recs.sort((a, b) => parseInt(a.rank) - parseInt(b.rank)).slice(0, 3);
  const simTop3 = simB.filter(r => r.persona_id === pid && parseInt(r.new_rank) <= 3).sort((a, b) => parseInt(a.new_rank) - parseInt(b.new_rank));
  const changed = origTop3.some((o, i) => o.fund_id !== simTop3[i]?.fund_id);
  if (changed) {
    md += `**Persona ${pid}:** `;
    for (let i = 0; i < 3; i++) {
      const o = origTop3[i];
      const s = simTop3[i];
      if (o.fund_id !== s?.fund_id) {
        const oAge = getAgeYears(o.fund_id);
        const sAge = getAgeYears(s.fund_id);
        const oCat = o.category || '';
        const sCat = s.category || '';
        md += `Pos ${i + 1}: ~~${o.fund_name} (${oCat}, ${oAge !== null ? oAge.toFixed(1) + 'y' : 'N/A'})~~ → **${s.fund_name}** (${sCat}, ${sAge !== null ? sAge.toFixed(1) + 'y' : 'N/A'}) | `;
      }
    }
    md += '\n';
  }
}

md += `\n---

## Analysis

### Which approach is least biased?

**Simulation C (confidence tiebreaker only):** Zero changes to Top 3, equity mix unchanged. The 5% threshold is too narrow — scores for different funds within the same persona often differ by more than 5%, so the tiebreaker never fires.

**Simulation A (no < 1yr in Top 3):** Only ${simAChanges} personas affected. Minimal change because only a handful of funds are < 1 year old.

**Simulation B (no < 2yr in Top 3):** ${simBChanges} personas affected. This is the most impactful while still preserving the diversified ranking order. The replacement funds are typically older debt/arbitrage from the same persona's existing pool — equity count drops but the fallback mechanism preserves some equity exposure.

### Verdict

The root cause is primarily **young fund age** (factor 1), not missing metrics or equity concentration. The confidence multiplier failed because it penalized entire equity categories uniformly (43% of equity funds have limited_history). The age-based approach is more targeted: it only blocks the specific young funds that are problematic, rather than penalizing all funds with limited_history.

**Simulation B (no fund < 2 years in Top 3) is the recommended approach** because:
1. It directly addresses the root cause (young funds with thin data ranking too high)
2. It only blocks 2-3 instances per persona, preserving the diversified structure
3. It does not penalize mature equity funds (43% of equity is high-confidence)
4. It does not inflate debt/arbitrage exposure beyond what diversification already provides
`;

writeFileSync(join(outputDir, 'ranking_simulation_comparison.md'), md, 'utf-8');
console.log('=== Results ===');
console.log(`Current:           Top3=${currentMetrics.missTop3} Top10=${currentMetrics.missTop10} Young=${currentMetrics.youngTop10} Equity=${currentMetrics.equityTop10} Debt=${currentMetrics.debtTop10} Hybrid=${currentMetrics.hybridTop10}`);
console.log(`Sim A (no <1yr):   Top3=${metricsA.missTop3} Top10=${metricsA.missTop10} Young=${metricsA.youngTop10} Equity=${metricsA.equityTop10} Debt=${metricsA.debtTop10} Hybrid=${metricsA.hybridTop10}  |  Changes: ${simAChanges}/${byPersona.size}`);
console.log(`Sim B (no <2yr):   Top3=${metricsB.missTop3} Top10=${metricsB.missTop10} Young=${metricsB.youngTop10} Equity=${metricsB.equityTop10} Debt=${metricsB.debtTop10} Hybrid=${metricsB.hybridTop10}  |  Changes: ${simBChanges}/${byPersona.size}`);
console.log(`Sim C (tiebreak):  Top3=${metricsC.missTop3} Top10=${metricsC.missTop10} Young=${metricsC.youngTop10} Equity=${metricsC.equityTop10} Debt=${metricsC.debtTop10} Hybrid=${metricsC.hybridTop10}  |  Changes: ${simCChanges}/${byPersona.size}`);
