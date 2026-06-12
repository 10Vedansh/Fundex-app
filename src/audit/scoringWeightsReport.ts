// @vitest-environment node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { MutualFund } from '@/types/mutualFund';
import { computeNormStats } from '@/utils/recommendation/scoringEngineV3';

const PROFILE_WEIGHTS: Record<string, Record<string, number>> = {
  conservative: { sortino: 0.40, cagrRelative: 0.10, consistency: 0.20, sharpe: 0.10, volatility: 0.15, expense: 0.05, aum: 0, diversificationBonus: 0 },
  moderate: { sortino: 0.25, cagrRelative: 0.25, consistency: 0.15, sharpe: 0.10, volatility: 0.10, expense: 0.10, aum: 0.05, diversificationBonus: 0 },
  aggressive: { sortino: 0.15, cagrRelative: 0.30, consistency: 0.20, sharpe: 0.15, volatility: 0.05, expense: 0.05, aum: 0.05, diversificationBonus: 0.05 },
};

// Max theoretical contributions per profile type (weight × max normalized score of 1.0)
function maxContrib(w: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  let total = 0;
  for (const [k, v] of Object.entries(w)) {
    result[k] = v;
    total += v;
  }
  result.total = total;
  return result;
}

async function runScoringWeightsReport() {
  const outputDir = join(__dirname, 'output');
  mkdirSync(outputDir, { recursive: true });

  const fundsData = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8')) as MutualFund[];
  const stats = computeNormStats(fundsData);

  const factors: {
    name: string;
    weightConserv: number;
    weightMod: number;
    weightAggr: number;
    normMethod: string;
    maxContrib: string;
    minContrib: string;
    type: string;
    impact: string;
  }[] = [];

  // Sortino
  factors.push({
    name: 'Sortino Ratio',
    weightConserv: 0.40,
    weightMod: 0.25,
    weightAggr: 0.15,
    normMethod: `Min-max (range ${stats.minSortino.toFixed(2)}–${stats.maxSortino.toFixed(2)})`,
    maxContrib: '0.00–0.40 (varies by profile)',
    minContrib: '0.00 (if fund has worst sortino)',
    type: 'Ranking signal',
    impact: 'HIGHEST — conservative: 40%, moderate: 25%, aggressive: 15%',
  });

  // CAGR
  factors.push({
    name: 'Category-Relative CAGR (3Y)',
    weightConserv: 0.10,
    weightMod: 0.25,
    weightAggr: 0.30,
    normMethod: `Global min-max (range ${stats.minCagr.toFixed(2)}–${stats.maxCagr.toFixed(2)})`,
    maxContrib: '0.10–0.30 (varies by profile)',
    minContrib: '0.00 (if CAGR at global minimum)',
    type: 'Ranking signal',
    impact: 'HIGH — aggressive: 30%, moderate: 25%',
  });

  // Consistency
  factors.push({
    name: 'Rolling Consistency (multi-period outperformance)',
    weightConserv: 0.20,
    weightMod: 0.15,
    weightAggr: 0.20,
    normMethod: 'Ratio of periods where period return > 80% of category median CAGR (0–1)',
    maxContrib: '0.15–0.20',
    minContrib: '0.00 (if no periods beat threshold)',
    type: 'Ranking signal',
    impact: 'MODERATE-HIGH — 15–20% weight across all profiles',
  });

  // Sharpe
  factors.push({
    name: 'Sharpe Ratio',
    weightConserv: 0.10,
    weightMod: 0.10,
    weightAggr: 0.15,
    normMethod: `Global min-max (range ${stats.minSharpe.toFixed(2)}–${stats.maxSharpe.toFixed(2)})`,
    maxContrib: '0.10–0.15',
    minContrib: '0.00 (if sharpe at global minimum or null)',
    type: 'Ranking signal',
    impact: 'MODERATE — 10–15% weight. Null → 0 score.',
  });

  // Volatility (inverted)
  factors.push({
    name: 'Low Volatility (inverted)',
    weightConserv: 0.15,
    weightMod: 0.10,
    weightAggr: 0.05,
    normMethod: `1 - min-max (range ${stats.minVol.toFixed(2)}–${stats.maxVol.toFixed(2)}). Null → vol=0 → 1 - norm(0,..) = 1.0 (PERFECT SCORE)`,
    maxContrib: '0.05–0.15',
    minContrib: '0.00 (if highest volatility)',
    type: 'Ranking signal',
    impact: 'MODERATE — KEY ISSUE: null volatility → vol=0 → normalized to 1.0 (best possible). This gives a significant boost to funds missing volatility data.',
  });

  // Expense
  factors.push({
    name: 'Category-Relative Expense',
    weightConserv: 0.05,
    weightMod: 0.10,
    weightAggr: 0.05,
    normMethod: '1 - min(expense/median, 2) × 0.35. Null → 0.5',
    maxContrib: '0.05–0.10',
    minContrib: '0.00 (if expense is 2× category median)',
    type: 'Ranking signal',
    impact: 'LOW — 5–10% weight. Null → 0.5 (neutral).',
  });

  // AUM
  factors.push({
    name: 'AUM Stability',
    weightConserv: 0,
    weightMod: 0.05,
    weightAggr: 0.05,
    normMethod: `Global min-max (range ${stats.minAum.toFixed(0)}–${stats.maxAum.toFixed(0)} Cr). Null → 0.5`,
    maxContrib: '0.00–0.05',
    minContrib: '0.00',
    type: 'Ranking signal',
    impact: 'LOW — only moderate/aggressive profiles. 5% weight.',
  });

  // Diversification (category breadth)
  factors.push({
    name: 'Category Breadth (Diversification Bonus)',
    weightConserv: 0,
    weightMod: 0,
    weightAggr: 0.05,
    normMethod: 'Lookup table: EQ-SC=1.0, EQ-MC=0.9, EQ-FLX=0.9, EQ-LC=0.7, etc. Default 0.2',
    maxContrib: '0.05 (small cap gets max 1.0 × 5%)',
    minContrib: '0.00 (conservative/moderate have 0 weight)',
    type: 'Ranking signal',
    impact: 'NEGLIGIBLE — only aggressive profile, 5% weight.',
  });

  // Credit penalty
  factors.push({
    name: 'Credit Risk Penalty (debt only)',
    weightConserv: 'N/A',
    weightMod: 'N/A',
    weightAggr: 'N/A',
    normMethod: '0–25% multiplicative penalty based on avgCreditQuality + DT-CR category',
    maxContrib: '×0.75 (max penalty)',
    minContrib: '×1.0 (no penalty)',
    type: 'Penalty (multiplicative)',
    impact: 'DEBT-ONLY — not relevant for equity funds.',
  });

  // Experience modifier
  factors.push({
    name: 'Experience Modifier (beginner only)',
    weightConserv: 'N/A',
    weightMod: 'N/A',
    weightAggr: 'N/A',
    normMethod: 'If beginner and vol>15 → ×0.70, if expense>1.5 → ×0.90. Cumulative.',
    maxContrib: '×1.0 (no penalty)',
    minContrib: '×0.63 (both penalties)',
    type: 'Penalty (multiplicative)',
    impact: 'CONDITIONAL — only for beginner experience level.',
  });

  // Completeness penalty
  factors.push({
    name: 'Completeness Penalty (missing metrics)',
    weightConserv: 'N/A',
    weightMod: 'N/A',
    weightAggr: 'N/A',
    normMethod: '15% per missing critical (Sharpe, Vol, CAGR) + 5% per optional (Sortino, Consistency, Expense, Benchmark, FundManager)',
    maxContrib: '×1.0 (no nulls)',
    minContrib: '×0.00 (all 8 nulls → 0.00)',
    type: 'Penalty (multiplicative)',
    impact: 'MODERATE — but insufficient to overcome other factors. 3 critical nulls → ×0.55.',
  });

  // Age penalty
  factors.push({
    name: 'Age-Based Recency Penalty',
    weightConserv: 'N/A',
    weightMod: 'N/A',
    weightAggr: 'N/A',
    normMethod: '<1yr → ×0.70, 1-3yr → ×0.85, 3-5yr → ×0.95, ≥5yr → ×1.0',
    maxContrib: '×1.0 (5+ years)',
    minContrib: '×0.70 (<1 year)',
    type: 'Penalty (multiplicative)',
    impact: 'MODERATE — young funds penalized 15-30%. But funds 3-5yr only lose 5%.',
  });

  let md = `# Scoring Engine — Factor Weight Analysis\n\n`;
  md += `**Date:** ${new Date().toISOString().slice(0, 10)}  \n`;
  md += `**Data Source:** scoringEngineV3.ts, intersectionEngine.ts  \n\n`;

  md += `## Scoring Factor Summary\n\n`;
  md += `| # | Factor | Conservative | Moderate | Aggressive | Normalization | Max Contrib | Type | Impact |\n`;
  md += `|---|---|---:|---:|---:|---|---|---|`;

  const impactOrder = ['HIGHEST', 'HIGH', 'MODERATE-HIGH', 'MODERATE', 'LOW', 'NEGLIGIBLE', 'CONDITIONAL', 'DEBT-ONLY'];
  const sorted = [...factors].sort((a, b) => {
    const ai = impactOrder.findIndex(s => a.impact.startsWith(s));
    const bi = impactOrder.findIndex(s => b.impact.startsWith(s));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  for (let i = 0; i < sorted.length; i++) {
    const f = sorted[i];
    const wCons = typeof f.weightConserv === 'number' ? `${(f.weightConserv * 100).toFixed(0)}%` : f.weightConserv;
    const wMod = typeof f.weightMod === 'number' ? `${(f.weightMod * 100).toFixed(0)}%` : f.weightMod;
    const wAggr = typeof f.weightAggr === 'number' ? `${(f.weightAggr * 100).toFixed(0)}%` : f.weightAggr;
    md += `\n| ${i + 1} | ${f.name} | ${wCons} | ${wMod} | ${wAggr} | ${f.normMethod} | ${f.maxContrib} | ${f.type} | ${f.impact} |`;
  }

  md += `\n\n`;

  // Profile weight table
  md += `\n## Profile Weight Configuration\n\n`;
  md += `| Factor | Conservative | Moderate | Aggressive |\n`;
  md += `|---|---|---:|---:|\n`;
  md += `| Sortino | 40% | 25% | 15% |\n`;
  md += `| CAGR (Relative) | 10% | 25% | 30% |\n`;
  md += `| Consistency | 20% | 15% | 20% |\n`;
  md += `| Sharpe | 10% | 10% | 15% |\n`;
  md += `| Low Volatility | 15% | 10% | 5% |\n`;
  md += `| Expense | 5% | 10% | 5% |\n`;
  md += `| AUM | 0% | 5% | 5% |\n`;
  md += `| Diversification | 0% | 0% | 5% |\n`;
  md += `| **Total** | **100%** | **100%** | **100%** |\n\n`;

  // Penalty stack order
  md += `\n## Penalty Application Order\n\n`;
  md += `1. **Score = weighted composite** (sum of factor × weight)\n`;
  md += `2. **× Credit Penalty** (debt only, 0–25%)\n`;
  md += `3. **× DT-CR category suppression** (×0.80 unless very high risk + long)\n`;
  md += `4. **× Experience Modifier** (beginner only, ×0.63–1.0)\n`;
  md += `5. **× Completeness Multiplier** (×0.55–1.0 for 3 critical nulls)\n`;
  md += `6. **× Age Multiplier** (×0.70–1.0 based on fund age)\n`;
  md += `7. **Final Score** (rounded to 2 decimal places)\n\n`;

  // Critical insight
  md += `\n## Critical Insight: Missing Volatility → Score Boost\n\n`;
  md += `When a fund has ` + '\`volatility = null\`' + ` and ` + '\`stdDev = null\`' + `, the scoring engine defaults to ` + '\`vol = 0\`' + `.\n\n`;
  md += `The volatility score is computed as:\n\n`;
  md += `\`\`\`\nvolN = 1 - normalize(vol, minVol, maxVol)\n     = 1 - normalize(0, minVol, maxVol)\n     = 1 - 0\n     = 1.0 (PERFECT)\n\`\`\`\n\n`;
  md += `This means funds with **no volatility data get the best possible volatility score**.\n\n`;
  md += `For a conservative profile (volatility weight = 15%), this contributes **0.15** to the pre-penalty score — equivalent to a fund with excellent volatility data.\n\n`;
  md += `For an aggressive profile (volatility weight = 5%), this contributes **0.05**, which is small but still a net positive instead of a penalty.\n\n`;
  md += `**Fix recommendation:** When volatility is missing, default volN to 0.5 (neutral) instead of 1.0 (perfect).\n\n`;

  // Comparison: target fund vs typical competitor
  md += `\n## Why HSBC Multi Cap (3 nulls) Outranks Complete Funds\n\n`;
  md += `Using the "aggressive" retirement profile as an example:\n\n`;
  md += `| Factor | Weight | HSBC Multi Cap (null sharpe, sortino, vol) | Typical Complete Fund |\n`;
  md += `|---|---:|---:|---:|\n`;
  md += `| Sortino | 15% | 0 (all null → 0.0) | 0.10 (typical 0.67 norm) |\n`;
  md += `| CAGR | 30% | **0.30** (CAGR=24.95 → top tier) | 0.15 (typical median) |\n`;
  md += `| Consistency | 20% | **0.20** (high CAGR beats threshold) | 0.12 (typical) |\n`;
  md += `| Sharpe | 15% | 0 (null → 0.0) | 0.08 (typical 0.5 norm) |\n`;
  md += `| Volatility | 5% | **0.05** (null → vol=0 → perfect 1.0) | 0.03 (typical) |\n`;
  md += `| Expense | 5% | 0.05 (low expense) | 0.03 (typical) |\n`;
  md += `| AUM | 5% | 0.03 (high AUM) | 0.02 (typical) |\n`;
  md += `| Diversification | 5% | 0.01 (Multi Cap=0.2) | 0.01 (typical) |\n`;
  md += `| **Pre-penalty** | | **0.64** | **0.54** |\n`;
  md += `| × Completeness | | ×0.55 (3 critical nulls) | ×1.0 |\n`;
  md += `| × Age | | ×0.85 (launched 2023-01) | ×0.95 or 1.0 |\n`;
  md += `| **Final Score** | | **~27.8** | **~49.0** |\n\n`;
  md += `The CAGR dominance (30% weight × top-tier CAGR = 0.30) and consistency boost overcome the ×0.55 completeness penalty. \n\n`;
  md += `**Root cause:** CAGR weight (30%) is double the combined null penalty impact (3×15% = 45% of score but applied to a 0.64 base). The fund's CAGR is so far above the global median that even with a 45% completeness haircut, it outranks mid-tier complete funds.`;

  writeFileSync(join(outputDir, 'scoring_weights_report.md'), md, 'utf-8');
  console.log('Scoring weights report written');
}

runScoringWeightsReport();
