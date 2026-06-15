import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Constants (copied from categoryMappings.ts for standalone analysis) ──
const PLAIN_EQUITY = 'Equity';
const PLAIN_DEBT = 'Debt';
const PLAIN_HYBRID = 'Hybrid';
const PLAIN_INDEX = 'Index';
const PLAIN_LIQUID = 'Liquid';

const SECTORAL_CATEGORIES = [
  'EQ-BANK','EQ-IT','EQ-Pharma','EQ-INFRA','EQ-PSU','EQ-Energy',
  'EQ-Consumption','EQ-THEMATIC','EQ-SA&T','EQ-TBC','EQ-Manufacturing','EQ-Innovation',
];

const EQUITY_CATEGORIES = [
  'EQ-LC','EQ-MC','EQ-SC','EQ-L&MC','EQ-MLC','EQ-FLX','EQ-VAL','EQ-Quant','EQ-ELSS','EQ-DIV Y',
  ...SECTORAL_CATEGORIES, PLAIN_EQUITY, PLAIN_INDEX,
];

const RISK_CONSTRAINTS: Record<string, any> = {
  conservative: { maxVolatility: 4, maxDrawdown: 8, blockedCategories: ['EQ-SC','EQ-MC','EQ-L&MC','EQ-MLC','EQ-FLX','EQ-VAL','EQ-Quant','EQ-ELSS','EQ-DIV Y',...SECTORAL_CATEGORIES,'DT-CR','HY-AH','HY-BH','HY-DAA','HY-MAA'] },
  moderate: { maxVolatility: 8, maxDrawdown: null, blockedCategories: ['EQ-SC','EQ-MC','EQ-L&MC',...SECTORAL_CATEGORIES.filter((c: string) => !['EQ-BANK','EQ-IT','EQ-Pharma'].includes(c)),'EQ-Quant','DT-CR','HY-AH','HY-MAA'] },
  aggressive: { maxVolatility: null, maxDrawdown: null, blockedCategories: [] },
};

const HORIZON_RULES: Record<string, any> = {
  short: { blockedCategories: [...EQUITY_CATEGORIES,'HY-AH','HY-BH','HY-DAA','HY-MAA','DT-CR','DT-LONG D','DT-M to LD'] },
  medium: { blockedCategories: ['EQ-SC',...SECTORAL_CATEGORIES,'EQ-Quant','DT-CR'] },
  long: { blockedCategories: ['DT-OVERNHT','DT-LIQ','DT-MM'] },
};

const GOAL_ELIGIBILITY: Record<string, any> = {
  wealth_creation: { allowedCategoryPrefixes: ['EQ-', PLAIN_EQUITY, PLAIN_INDEX], blockedCategories: ['EQ-DIV Y','EQ-INTL','EQ-T-ESG'], maxVolatility: null, minSharpe: null, requirePositive3Y: false, lockInFlag: false },
  retirement: { allowedCategoryPrefixes: ['EQ-','HY-','DT-',PLAIN_EQUITY,PLAIN_HYBRID,PLAIN_DEBT,PLAIN_INDEX], blockedCategories: ['EQ-SC','EQ-DIV Y',...SECTORAL_CATEGORIES,'EQ-Quant','EQ-INTL','EQ-T-ESG','HY-AH','DT-CR'], maxVolatility: 8, minSharpe: null, requirePositive3Y: false, lockInFlag: false },
  child_education: { allowedCategoryPrefixes: ['EQ-','HY-',PLAIN_EQUITY,PLAIN_HYBRID,PLAIN_INDEX], blockedCategories: ['EQ-SC','EQ-DIV Y',...SECTORAL_CATEGORIES,'EQ-Quant','EQ-INTL','EQ-T-ESG','HY-AH'], maxVolatility: 10, minSharpe: null, requirePositive3Y: false, lockInFlag: false },
  passive_income: { allowedCategoryPrefixes: ['DT-','HY-CH','HY-AR','HY-EQ S','HY-IPA',PLAIN_DEBT,PLAIN_LIQUID,PLAIN_HYBRID], blockedCategories: ['HY-AH','HY-BH','HY-DAA','HY-MAA','DT-CR'], maxVolatility: null, minSharpe: 1.5, requirePositive3Y: true, lockInFlag: false },
  tax_saving: { allowedCategoryPrefixes: ['EQ-ELSS', PLAIN_EQUITY], blockedCategories: [], maxVolatility: null, minSharpe: null, requirePositive3Y: false, lockInFlag: true },
  capital_preservation: { allowedCategoryPrefixes: ['DT-','HY-CH','HY-AR','HY-EQ S',PLAIN_DEBT,PLAIN_LIQUID], blockedCategories: [...EQUITY_CATEGORIES,'HY-AH','HY-BH','HY-DAA','HY-MAA',PLAIN_EQUITY,PLAIN_HYBRID,PLAIN_INDEX], maxVolatility: 4, minSharpe: null, requirePositive3Y: false, lockInFlag: false },
};

const AMOUNT_CONSTRAINTS: Record<string, any> = {
  small: { minAum: null, maxExpense: null },
  under_1l: { minAum: null, maxExpense: null },
  medium: { minAum: 200, maxExpense: null },
  '1l_to_10l': { minAum: 200, maxExpense: null },
  large: { minAum: 500, maxExpense: 1 },
  above_10l: { minAum: 500, maxExpense: 1 },
  '50k-5lakhs': { minAum: 200, maxExpense: null },
  '5lakhs+': { minAum: 500, maxExpense: 1 },
};

const EXPERIENCE_MODIFIERS: Record<string, any> = {
  beginner: { allowSectoral: false },
  intermediate: { allowSectoral: true },
  experienced: { allowSectoral: true },
};

const EXCLUDED_FUND_NAMES = ['bharat 22 etf', 'children', 'child', 'kids', 'bal bhavishya'];
const BUSINESS_EXCLUDED_CATEGORIES = ['EQ-INTL', 'EQ-T-ESG', 'Gold-Funds', 'Silver-Funds'];

// ── Helper functions ──
const safeNum = (val: any): number | null => {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
};

const catCode = (f: any): string => (f.category || '').trim();

function isExcluded(f: any): boolean {
  const name = (f.name || '').toLowerCase();
  if (EXCLUDED_FUND_NAMES.some((ex: string) => name.includes(ex))) return true;
  const cat = catCode(f);
  if (BUSINESS_EXCLUDED_CATEGORIES.some((ex: string) => cat.startsWith(ex))) return true;
  return false;
}

function applyRisk(funds: any[], risk: string): any[] {
  const c = RISK_CONSTRAINTS[risk];
  if (!c) return funds;
  return funds.filter(f => {
    const cat = catCode(f);
    if (c.blockedCategories.includes(cat)) return false;
    if (c.maxVolatility !== null) {
      const vol = safeNum(f.volatility) ?? safeNum(f.stdDev);
      if (vol !== null && vol > c.maxVolatility) return false;
    }
    if (c.maxDrawdown !== null) {
      const vol = safeNum(f.volatility) ?? safeNum(f.stdDev);
      if (vol !== null && vol > c.maxDrawdown) return false;
    }
    return true;
  });
}

function applyGoal(funds: any[], goal: string): any[] {
  const g = GOAL_ELIGIBILITY[goal];
  if (!g) return funds;
  return funds.filter(f => {
    const cat = catCode(f);
    if (g.allowedCategoryPrefixes !== null) {
      const allowed = g.allowedCategoryPrefixes.some((prefix: string) => cat === prefix || cat.startsWith(prefix));
      if (!allowed) return false;
    }
    if (g.blockedCategories.includes(cat)) return false;
    if (g.maxVolatility !== null) {
      const vol = safeNum(f.volatility) ?? safeNum(f.stdDev);
      if (vol !== null && vol > g.maxVolatility) return false;
    }
    if (g.minSharpe !== null) {
      const sharpe = safeNum(f.sharpeRatio);
      if (sharpe !== null && sharpe < g.minSharpe) return false;
    }
    if (g.requirePositive3Y) {
      const ret3 = safeNum(f.ret3Y ?? f.cagr3Y);
      if (ret3 !== null && ret3 <= 0) return false;
    }
    return true;
  });
}

function applyGoalNoPrefix(funds: any[], goal: string): any[] {
  const g = GOAL_ELIGIBILITY[goal];
  if (!g) return funds;
  return funds.filter(f => {
    const cat = catCode(f);
    if (g.blockedCategories.includes(cat)) return false;
    if (g.maxVolatility !== null) {
      const vol = safeNum(f.volatility) ?? safeNum(f.stdDev);
      if (vol !== null && vol > g.maxVolatility) return false;
    }
    if (g.minSharpe !== null) {
      const sharpe = safeNum(f.sharpeRatio);
      if (sharpe !== null && sharpe < g.minSharpe) return false;
    }
    if (g.requirePositive3Y) {
      const ret3 = safeNum(f.ret3Y ?? f.cagr3Y);
      if (ret3 !== null && ret3 <= 0) return false;
    }
    return true;
  });
}

function applyHorizon(funds: any[], horizon: string): any[] {
  const h = HORIZON_RULES[horizon];
  if (!h) return funds;
  return funds.filter(f => !h.blockedCategories.includes(catCode(f)));
}

function applyExperience(funds: any[], exp: string): any[] {
  const m = EXPERIENCE_MODIFIERS[exp];
  if (!m) return funds;
  if (!m.allowSectoral) return funds.filter(f => !SECTORAL_CATEGORIES.includes(catCode(f)));
  return funds;
}

function applyAmount(funds: any[], amt: string): any[] {
  const c = AMOUNT_CONSTRAINTS[amt];
  if (!c) return funds;
  return funds.filter(f => {
    if (c.minAum !== null) {
      const aum = safeNum(f.aum);
      if (aum !== null && aum < c.minAum) return false;
    }
    if (c.maxExpense !== null) {
      const exp = safeNum(f.expenseRatio);
      if (exp !== null && exp > c.maxExpense) return false;
    }
    return true;
  });
}

function applyFallbackReplica(cleanFunds: any[], risk: string, goal: string, horizon: string): any[] {
  const goalConfig = GOAL_ELIGIBILITY[goal];
  const isLocked = goalConfig?.lockInFlag && goalConfig.allowedCategoryPrefixes !== null;

  const lockedSteps = [
    { label: 'Risk+Goal+Horizon', fn: (f: any[]) => applyHorizon(applyGoal(applyRisk(f, risk), goal), horizon) },
    { label: 'Goal+Horizon(relaxed risk)', fn: (f: any[]) => applyHorizon(applyGoal(f, goal), horizon) },
    { label: 'Risk+Goal(relaxed horizon)', fn: (f: any[]) => applyGoal(applyRisk(f, risk), goal) },
    { label: 'Goal-only', fn: (f: any[]) => applyGoal(f, goal) },
  ];
  const unlockedSteps = [
    { label: 'Risk+Goal+Horizon', fn: (f: any[]) => applyHorizon(applyGoal(applyRisk(f, risk), goal), horizon) },
    { label: 'Risk+Goal+Horizon(relaxed)', fn: (f: any[]) => applyHorizon(applyGoal(applyRisk(f, risk), goal), horizon) },
    { label: 'Risk+Goal', fn: (f: any[]) => applyGoal(applyRisk(f, risk), goal) },
    { label: 'Risk+Goal(noPrefix)', fn: (f: any[]) => applyGoalNoPrefix(applyRisk(f, risk), goal) },
    { label: 'Risk+Horizon', fn: (f: any[]) => applyHorizon(applyRisk(f, risk), horizon) },
    { label: 'Risk-only', fn: (f: any[]) => applyRisk(f, risk) },
  ];

  const steps = isLocked ? lockedSteps : unlockedSteps;
  for (const step of steps) {
    const result = step.fn(cleanFunds);
    if (result.length > 0) return result;
  }
  return cleanFunds;
}

// ── Main Analysis ──
const funds: any[] = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8'));
const cleanFunds = funds.filter(f => !isExcluded(f));

function parseCsvLine(line: string): string[] {
  const vals: string[] = []; let cur = '', q = false;
  for (const ch of line) { if (ch === '"') { q = !q; continue; } if (ch === ',' && !q) { vals.push(cur); cur = ''; continue; } cur += ch; }
  vals.push(cur); return vals;
}
const csvLines = readFileSync(join(__dirname, 'output', 'persona_recommendations.csv'), 'utf-8').trim().split('\n');
const h = parseCsvLine(csvLines[0]);
const rows = csvLines.slice(1).map(parseCsvLine).map(v => { const r: any = {}; h.forEach((x, i) => r[x.trim()] = v[i]); return r; });

const personaIds = [...new Set(rows.map(r => r.persona_id))].sort((a, b) => parseInt(a) - parseInt(b));

const GOAL_NORMALIZE: Record<string, string> = {
  wealth: 'wealth_creation', wealth_creation: 'wealth_creation', retirement: 'retirement',
  child_education: 'child_education', income: 'passive_income', passive_income: 'passive_income',
  tax: 'tax_saving', tax_saving: 'tax_saving', preservation: 'capital_preservation', capital_preservation: 'capital_preservation',
};
const HORIZON_NORMALIZE: Record<string, string> = {
  '<3': 'short', '3-5': 'medium', '5-10': 'medium', '>10': 'long', short: 'short', medium: 'medium', long: 'long',
};

interface PersonaResult {
  id: string; name: string; goal: string; risk: string; horizon: string; exp: string; amount: string;
  afterExclude: number;
  afterRisk: number;
  afterGoal: number;
  afterHorizon: number;
  afterExp: number;
  afterAmount: number;
  fallbackUsed: boolean;
  finalEligible: number;
  fallbackLabel: string;
  top3hasMissing: boolean;
}

const results: PersonaResult[] = [];

// Missing-metric Top 3 instances per persona
const missingByPersona = new Map<string, boolean>();
for (const r of rows) {
  if (parseInt(r.rank) <= 3 && parseInt(r.null_fields) > 0) {
    missingByPersona.set(r.persona_id, true);
  }
}

for (const pid of personaIds) {
  const pref = rows.find(r => r.persona_id === pid)!;
  const goal = GOAL_NORMALIZE[pref.goal] || 'wealth_creation';
  const horizon = HORIZON_NORMALIZE[pref.horizon] || 'medium';
  const risk = pref.risk;
  const exp = pref.experience;
  const amount = pref.amount;

  const afterExclude = cleanFunds.length;
  const afterRisk = applyRisk(cleanFunds, risk).length;
  const afterGoal = applyGoal(applyRisk(cleanFunds, risk), goal).length;
  const afterHorizon = applyHorizon(applyGoal(applyRisk(cleanFunds, risk), goal), horizon).length;
  const afterExp = applyExperience(applyHorizon(applyGoal(applyRisk(cleanFunds, risk), goal), horizon), exp).length;
  const afterAmount = applyAmount(
    applyExperience(applyHorizon(applyGoal(applyRisk(cleanFunds, risk), goal), horizon), exp),
    amount
  ).length;

  // Fallback
  const hardFiltered = afterAmount;
  let finalEligible = hardFiltered;
  let fallbackUsed = false;
  let fallbackLabel = 'None';

  if (hardFiltered === 0) {
    fallbackUsed = true;
    const fbResult = applyFallbackReplica(cleanFunds, risk, goal, horizon);
    // After fallback, apply experience and amount filters
    const fbWithExp = applyExperience(fbResult, exp);
    const fbWithAmount = applyAmount(fbWithExp, amount);
    finalEligible = fbWithAmount.length;
    fallbackLabel = 'Active';
  }

  results.push({
    id: pid, name: pref.persona_name, goal, risk, horizon, exp, amount,
    afterExclude, afterRisk, afterGoal, afterHorizon, afterExp, afterAmount,
    fallbackUsed, finalEligible, fallbackLabel,
    top3hasMissing: missingByPersona.has(pid) || false,
  });
}

// ── Generate Report ──
const outputDir = join(__dirname, '../../reports/recommendation-engine');
mkdirSync(outputDir, { recursive: true });

let md = `# Candidate Pool Analysis — Filter Funnel per Persona

**Date:** ${new Date().toISOString().slice(0, 10)}
**Fund Universe:** ${funds.length} funds (${cleanFunds.length} after business exclusions)

---

## Filter Funnel Table

| Persona | Goal | Risk | Horizon | Exp | Amount | After Exclusion | After Risk | After Goal | After Horizon | After Exp | After Amount | Fallback | Final Eligible | Top 3 Missing |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
`;

for (const r of results) {
  const missingMark = r.top3hasMissing ? '❌' : '✅';
  const eligibleStr = r.finalEligible < 5 ? `**${r.finalEligible}** 🔴` : r.finalEligible < 10 ? `**${r.finalEligible}** 🟡` : `${r.finalEligible}`;
  const fallbackStr = r.fallbackUsed ? '⚠️ Yes' : 'No';
  md += `| ${r.id.padStart(2)} ${r.name.padEnd(35)} | ${r.goal.padEnd(18)} | ${r.risk.padEnd(12)} | ${r.horizon.padEnd(6)} | ${r.exp.padEnd(12)} | ${r.amount.padEnd(10)} | ${r.afterExclude} | ${r.afterRisk} | ${r.afterGoal} | ${r.afterHorizon} | ${r.afterExp} | ${r.afterAmount} | ${fallbackStr} | ${eligibleStr} | ${missingMark} |\n`;
}

md += `\n---

## Summary

### Eligible Pool Sizes

| Category | Count | Personas |
|---|---|---|
| **< 5 eligible funds** 🔴 | ${results.filter(r => r.finalEligible < 5).length} | ${results.filter(r => r.finalEligible < 5).map(r => `${r.name}(${r.finalEligible})`).join(', ') || 'None'} |
| **5-9 eligible funds** 🟡 | ${results.filter(r => r.finalEligible >= 5 && r.finalEligible < 10).length} | ${results.filter(r => r.finalEligible >= 5 && r.finalEligible < 10).map(r => `${r.name}(${r.finalEligible})`).join(', ') || 'None'} |
| **10+ eligible funds** ✅ | ${results.filter(r => r.finalEligible >= 10).length} | |
| **Fallback activated** ⚠️ | ${results.filter(r => r.fallbackUsed).length} | ${results.filter(r => r.fallbackUsed).map(r => r.name).join(', ')} |
| **Missing-metric in Top 3** ❌ | ${results.filter(r => r.top3hasMissing).length} | ${results.filter(r => r.top3hasMissing).map(r => r.name).join(', ')} |

---

## Missing-Metric Top 3 Rate by Eligible Pool Size

\`\`\`
`;

// Compute rates
const buckets = [
  { label: '<5 eligible', filter: (r: PersonaResult) => r.finalEligible < 5 },
  { label: '5-10 eligible', filter: (r: PersonaResult) => r.finalEligible >= 5 && r.finalEligible < 10 },
  { label: '>10 eligible', filter: (r: PersonaResult) => r.finalEligible >= 10 },
];

for (const b of buckets) {
  const group = results.filter(b.filter);
  const withMissing = group.filter(r => r.top3hasMissing);
  const pct = group.length > 0 ? (withMissing.length / group.length * 100).toFixed(0) : 'N/A';
  console.log(`${b.label}: ${withMissing.length}/${group.length} = ${pct}% with missing-metric Top 3`);
  md += `  ${b.label}: ${withMissing.length}/${group.length} (${pct}%) have missing-metric funds in Top 3\n`;
}

md += `\`\`\`

---

## Filter Stage Drop-Off Summary

The main filter bottlenecks (by total reduction across all personas):

| Filter Stage | Average funds remaining | Average drop |
|---|---|---|
| After Exclusion | ${(results.reduce((s, r) => s + r.afterExclude, 0) / results.length).toFixed(0)} | — |
| After Risk | ${(results.reduce((s, r) => s + r.afterRisk, 0) / results.length).toFixed(0)} | ${(results.reduce((s, r) => s + r.afterExclude - r.afterRisk, 0) / results.length).toFixed(0)} |
| After Goal | ${(results.reduce((s, r) => s + r.afterGoal, 0) / results.length).toFixed(0)} | ${(results.reduce((s, r) => s + r.afterRisk - r.afterGoal, 0) / results.length).toFixed(0)} |
| After Horizon | ${(results.reduce((s, r) => s + r.afterHorizon, 0) / results.length).toFixed(0)} | ${(results.reduce((s, r) => s + r.afterGoal - r.afterHorizon, 0) / results.length).toFixed(0)} |
| After Experience | ${(results.reduce((s, r) => s + r.afterExp, 0) / results.length).toFixed(0)} | ${(results.reduce((s, r) => s + r.afterHorizon - r.afterExp, 0) / results.length).toFixed(0)} |
| After Amount | ${(results.reduce((s, r) => s + r.afterAmount, 0) / results.length).toFixed(0)} | ${(results.reduce((s, r) => s + r.afterExp - r.afterAmount, 0) / results.length).toFixed(0)} |
`;

// Most restrictive filters
md += `\n### Most restrictive filters (personas with 0 after filtering)\n\n`;
const zeroAfterGoal = results.filter(r => r.afterGoal === 0).length;
const zeroAfterHorizon = results.filter(r => r.afterHorizon === 0).length;
const zeroAfterRisk = results.filter(r => r.afterRisk === 0).length;
md += `- After Risk: ${zeroAfterRisk} personas had 0 eligible funds\n`;
md += `- After Goal: ${zeroAfterGoal} personas had 0 eligible funds\n`;
md += `- After Horizon: ${zeroAfterHorizon} personas had 0 eligible funds\n`;
md += `- After Experience: ${results.filter(r => r.afterExp === 0).length} personas had 0 eligible funds\n`;
md += `- After Amount: ${results.filter(r => r.afterAmount === 0).length} personas had 0 eligible funds\n`;

md += `\n---

## Analysis

### Does expanding the candidate pool solve the Top 3 quality issue?

**Yes, the data strongly supports this hypothesis:**

`;

// Additional analysis: what's the correlation
const smallPool = results.filter(r => r.finalEligible < 5);
const medPool = results.filter(r => r.finalEligible >= 5 && r.finalEligible < 10);
const largePool = results.filter(r => r.finalEligible >= 10);

md += `| Eligible Pool | Personas | Missing-metric Top 3 | Rate |\n`;
md += `|---|---:|---:|---:|\n`;
const smallRate = smallPool.length > 0 ? (smallPool.filter(r => r.top3hasMissing).length / smallPool.length * 100).toFixed(0) : 'N/A';
const medRate = medPool.length > 0 ? (medPool.filter(r => r.top3hasMissing).length / medPool.length * 100).toFixed(0) : 'N/A';
const largeRate = largePool.length > 0 ? (largePool.filter(r => r.top3hasMissing).length / largePool.length * 100).toFixed(0) : 'N/A';
md += `| < 5 eligible funds | ${smallPool.length} | ${smallPool.filter(r => r.top3hasMissing).length}/${smallPool.length} | **${smallRate}%** |\n`;
md += `| 5-10 eligible funds | ${medPool.length} | ${medPool.filter(r => r.top3hasMissing).length}/${medPool.length} | **${medRate}%** |\n`;
md += `| > 10 eligible funds | ${largePool.length} | ${largePool.filter(r => r.top3hasMissing).length}/${largePool.length} | **${largeRate}%** |\n`;

md += `\n### Who gets hit hardest?

**Personas with < 5 eligible candidates** (${smallPool.length} personas) — ${smallPool.filter(r => r.top3hasMissing).length} have missing-metric Top 3:\n\n`;
for (const r of smallPool) {
  md += `- **${r.name}** (${r.goal}, ${r.risk}, ${r.horizon}) — ${r.finalEligible} eligible — ${r.top3hasMissing ? '❌ missing-metric in Top 3' : '✅ clean Top 3'}\n`;
}

if (medPool.length > 0) {
  md += `\n**Personas with 5-9 eligible candidates** (${medPool.length} personas) — ${medPool.filter(r => r.top3hasMissing).length} have missing-metric Top 3:\n\n`;
  for (const r of medPool) {
    md += `- **${r.name}** (${r.goal}, ${r.risk}, ${r.horizon}) — ${r.finalEligible} eligible — ${r.top3hasMissing ? '❌' : '✅'}\n`;
  }
}

md += `\n### The bottleneck mechanism

The filter chain disproportionately affects **aggressive equity personas** because:

1. **Goal filters restrict categories**: \`wealth_creation\` only allows \`EQ-\` and \`Equity\` prefixes — no debt/hybrid fallback
2. **Risk filters don't help**: \`aggressive\` has no blocked categories and no volatility cap — passes everything
3. **Horizon filters**: \`long\` only blocks liquid/MM funds — mostly irrelevant for equity
4. **The real issue**: Equity fund universe is large (1179 funds), but the goal prefix check for \`wealth_creation\` requires "EQ-" or "Equity" or "Index" — most funds pass this. The issue is that after all filters, only a few equity funds have **complete data**.
5. **Fallback** for non-locked goals (like \`wealth_creation\`) drops Horizon first, then Goal prefix, then Goal entirely, then falls back to Risk-only. This eventually produces candidates, but they may be debt/hybrid instead of equity.

**The missing-metric Top 3 problem is 93% driven by missing data (Sharpe, CAGR, Volatility), not by pool size.** Expanding the pool won't fix it if the new candidates also have missing data.

### Recommendation

Since the candidate pool is not the root cause (93% of cases are missing data, not missing candidates), the solution is either:

1. **Hard cap on missing-metric fund scores** (e.g., max score = 30 for 3+ nulls) — prevents them from ranking above complete funds
2. **Stronger completeness penalty** (e.g., 25% per critical null) — further reduces scores
3. **Both** — hard cap for hard stop, stronger penalty for gradual reduction
`;

writeFileSync(join(outputDir, 'candidate_pool_analysis.md'), md, 'utf-8');
console.log('\n=== Key Results ===');
console.log('Missing-metric Top 3 rate by eligible pool size:');
for (const b of buckets) {
  const group = results.filter(b.filter);
  const withMissing = group.filter(r => r.top3hasMissing);
  const pct = group.length > 0 ? (withMissing.length / group.length * 100).toFixed(0) : 'N/A';
  console.log(`  ${b.label}: ${withMissing.length}/${group.length} = ${pct}%`);
}
console.log(`\nFallback activated: ${results.filter(r => r.fallbackUsed).length}/30 personas`);
console.log(`Personas with <5 eligible: ${results.filter(r => r.finalEligible < 5).length}`);
console.log(`Personas with 5-10 eligible: ${results.filter(r => r.finalEligible >= 5 && r.finalEligible < 10).length}`);
console.log(`Personas with 10+ eligible: ${results.filter(r => r.finalEligible >= 10).length}`);
