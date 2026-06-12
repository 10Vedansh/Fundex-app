// @vitest-environment node

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import { MutualFund } from '@/types/mutualFund';
import {
  scoreV3,
  computeCategoryMedians,
  computeNormStats,
  determineProfileType,
  V3ScoreResult,
} from '@/utils/recommendation/scoringEngineV3';
import {
  recommendFundsV2,
  RecommendationPreferences,
  ScoredFund,
} from '@/utils/recommendation/intersectionEngine';

interface Persona {
  id: number;
  name: string;
  goal: string;
  riskTolerance: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
  description: string;
}

const PERSONAS: Persona[] = [
  { id: 6,  name: 'Early Career Retirement',           goal: 'retirement',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: 'Young, long runway' },
  { id: 7,  name: 'Mid-Career Retirement Builder',     goal: 'retirement',           riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Building steadily' },
  { id: 9,  name: 'Aggressive Retirement Accumulator', goal: 'retirement',           riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'large',        description: 'High risk, experienced' },
  { id: 10, name: 'Balanced Retirement Planner',       goal: 'retirement',           riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Moderate approach' },
  { id: 19, name: 'Moderate Wealth Seeker',            goal: 'wealth_creation',      riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Balanced wealth' },
  { id: 20, name: 'Conservative Growth',               goal: 'wealth_creation',      riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: 'Cautious long-term' },
  { id: 26, name: 'New Parent Education Fund',         goal: 'child_education',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'beginner',      investmentAmount: 'small',        description: '18-year horizon' },
  { id: 27, name: 'Mid-Term Education Planner',        goal: 'child_education',      riskTolerance: 'moderate',    investmentHorizon: 'medium', experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: '10-year horizon' },
  { id: 29, name: 'Aggressive Education Accumulator',  goal: 'child_education',      riskTolerance: 'aggressive',  investmentHorizon: 'long',   experienceLevel: 'experienced',   investmentAmount: 'medium',       description: 'Long horizon, aggressive' },
  { id: 30, name: 'Balanced Education Planner',        goal: 'child_education',      riskTolerance: 'moderate',    investmentHorizon: 'long',   experienceLevel: 'intermediate',  investmentAmount: 'medium',       description: 'Steady education' },
];

const TARGET_FUND_IDS = [
  'HSBC_Multi_Cap_Fund___Direct_Plan_430',
  'Tata_Multicap_Fund___Direct_Plan_1063',
  'SBI_Nifty50_Equal_Weight_Index_Fund___Direct_Plan_992',
  'HDFC_NIFTY_Midcap_150_ETF_393',
  'LIC_MF_Nifty_Midcap_100_ETF_669',
  'Helios_Mid_Cap_Fund___Direct_Plan_413',
];

function safeNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

const PROFILE_WEIGHTS: Record<string, Record<string, number>> = {
  conservative: { sortino: 0.40, cagrRelative: 0.10, consistency: 0.20, sharpe: 0.10, volatility: 0.15, expense: 0.05, aum: 0, diversificationBonus: 0 },
  moderate: { sortino: 0.25, cagrRelative: 0.25, consistency: 0.15, sharpe: 0.10, volatility: 0.10, expense: 0.10, aum: 0.05, diversificationBonus: 0 },
  aggressive: { sortino: 0.15, cagrRelative: 0.30, consistency: 0.20, sharpe: 0.15, volatility: 0.05, expense: 0.05, aum: 0.05, diversificationBonus: 0.05 },
};

function catCode(fund: MutualFund): string {
  return (fund.category || '').trim();
}

function isExcluded(fund: MutualFund): boolean {
  return false;
}

function computeCreditPenalty(fund: MutualFund): number {
  return 0;
}

function categoryBreadthScore(category: string): number {
  const cat = (category || '').trim();
  const scores: Record<string, number> = {
    'EQ-SC': 1.0, 'EQ-MC': 0.9, 'EQ-FLX': 0.9, 'EQ-LC': 0.7, 'EQ-VAL': 0.7,
    'EQ-ELSS': 0.5, 'EQ-BANK': 0.4, 'EQ-PSU': 0.3,
  };
  return scores[cat] ?? 0.2;
}

function approximateConsistency(fund: MutualFund, categoryMedianCagr: number): number {
  const periods = [
    safeNum(fund.ret1M), safeNum(fund.ret3M), safeNum(fund.ret6M),
    safeNum(fund.ret1Y), safeNum(fund.ret3Y ?? fund.cagr3Y),
    safeNum(fund.ret5Y ?? fund.cagr5Y),
  ].filter((v): v is number => v !== null);
  if (periods.length === 0) return 0.5;
  const outperformed = periods.filter(r => r > categoryMedianCagr * 0.8).length;
  return outperformed / periods.length;
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

interface DetailedBreakdown {
  raw: Record<string, number | null | string>;
  normalized: Record<string, number>;
  weighted: Record<string, number>;
  penalties: Record<string, number>;
  prePenaltyScore: number;
  postPenaltyScore: number;
  finalScore: number;
  rank: number;
  profileType: string;
  weights: Record<string, number>;
}

function computeDetailedBreakdown(
  fund: MutualFund,
  stats: ReturnType<typeof computeNormStats>,
  medians: Map<string, CategoryMedians>,
  riskTolerance: string,
  investmentGoal: string,
  investmentHorizon: string,
  experienceLevel: string,
): DetailedBreakdown {
  const profileType = determineProfileType(riskTolerance, investmentGoal, investmentHorizon, experienceLevel);
  const w = PROFILE_WEIGHTS[profileType] || PROFILE_WEIGHTS.moderate;
  const cat = (fund.category || '').trim();
  const catMedian = medians.get(cat);

  const sortinoRaw = safeNum(fund.sortinoRatio);
  const sortino = sortinoRaw ?? 0;
  const sortinoN = normalize(sortino, stats.minSortino, stats.maxSortino);

  const cagr3Raw = safeNum(fund.ret3Y ?? fund.cagr3Y);
  const cagr3 = cagr3Raw ?? 0;
  const cagrN = normalize(cagr3, stats.minCagr, stats.maxCagr);

  const consistency = approximateConsistency(fund, catMedian?.cagr ?? 0);

  const sharpeRaw = safeNum(fund.sharpeRatio);
  const sharpe = sharpeRaw ?? 0;
  const sharpeN = normalize(sharpe, stats.minSharpe, stats.maxSharpe);

  const volRaw = safeNum(fund.volatility) ?? safeNum(fund.stdDev);
  const vol = volRaw ?? 0;
  let volN = w.volatility > 0 ? (1 - normalize(vol, stats.minVol, stats.maxVol)) : 0.5;
  if (volRaw === null) volN = 0.5;

  const expenseRaw = safeNum(fund.expenseRatio);
  const expense = expenseRaw === null ? 0 : expenseRaw;
  let expenseN: number;
  if (expenseRaw === null) {
    expenseN = 0.5;
  } else if (catMedian?.expense && catMedian.expense > 0) {
    const ratio = expenseRaw / catMedian.expense;
    expenseN = 1 - Math.min(ratio, 2) * 0.35;
    expenseN = Math.max(0, Math.min(1, expenseN));
  } else {
    expenseN = 0.5;
  }

  const aumRaw = safeNum(fund.aum);
  const aum = aumRaw === null ? 0 : aumRaw;
  const aumN = aumRaw === null ? 0.5 : normalize(aum, stats.minAum, stats.maxAum);

  const diversificationBonusN = categoryBreadthScore(fund.category);

  const raw: Record<string, number | null | string> = {
    sortinoRaw, cagr3, sharpe: sharpeRaw, vol, expense: expenseRaw, aum,
    launch: fund.launch ?? 'N/A',
  };

  const normalizedScores: Record<string, number> = {
    sortinoN, cagrN, consistency, sharpeN, volN, expenseN, aumN, diversificationBonusN,
  };

  let prePenaltyScore =
    (w.sortino * sortinoN) + (w.cagrRelative * cagrN) + (w.consistency * consistency) +
    (w.sharpe * sharpeN) + (w.volatility * volN) + (w.expense * expenseN) + (w.aum * aumN) +
    (w.diversificationBonus * diversificationBonusN);

  const penalties: Record<string, number> = {};

  // Credit penalty
  penalties.creditPenalty = 0;

  // Experience modifier
  let expMod = 1;
  if (experienceLevel === 'beginner') {
    if (vol > 15) expMod *= 0.7;
    if (expense > 1.5) expMod *= 0.9;
  }
  penalties.experienceModifier = expMod;
  let score = prePenaltyScore * expMod;

  // Completeness
  const nullSharpe = safeNum(fund.sharpeRatio) === null;
  const nullSortino = safeNum(fund.sortinoRatio) === null;
  const nullVol = (safeNum(fund.volatility) ?? safeNum(fund.stdDev)) === null;
  const nullCagr = safeNum(fund.ret3Y ?? fund.cagr3Y) === null;
  const consistencyPeriods = [
    safeNum(fund.ret1M), safeNum(fund.ret3M), safeNum(fund.ret6M),
    safeNum(fund.ret1Y), safeNum(fund.ret3Y ?? fund.cagr3Y),
    safeNum(fund.ret5Y ?? fund.cagr5Y),
  ].filter(v => v !== null);
  const nullConsistency = consistencyPeriods.length < 3;
  const nullExpense = safeNum(fund.expenseRatio) === null;
  const nullBenchmark = !fund.benchmark || String(fund.benchmark).trim() === '';
  const nullFundManager = !fund.fundManager || String(fund.fundManager).trim() === '';
  const criticalNulls = [nullSharpe, nullVol, nullCagr].filter(Boolean).length;
  const optionalNulls = [nullSortino, nullConsistency, nullExpense, nullBenchmark, nullFundManager].filter(Boolean).length;
  const completenessMultiplier = Math.round((1 - (0.15 * criticalNulls) - (0.05 * optionalNulls)) * 100) / 100;
  penalties.completenessMultiplier = completenessMultiplier;
  penalties.criticalNulls = criticalNulls;
  penalties.optionalNulls = optionalNulls;
  score *= completenessMultiplier;

  // Age penalty
  let ageMultiplier = 1;
  if (fund.launch) {
    const launchDate = new Date(String(fund.launch));
    const ageYears = (Date.now() - launchDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 1) ageMultiplier = 0.70;
    else if (ageYears < 3) ageMultiplier = 0.85;
    else if (ageYears < 5) ageMultiplier = 0.95;
  }
  penalties.ageMultiplier = ageMultiplier;
  score *= ageMultiplier;

  const finalScore = Math.round(score * 10000) / 100;

  return {
    raw,
    normalized: normalizedScores,
    weighted: {
      sortinoContrib: w.sortino * sortinoN,
      cagrContrib: w.cagrRelative * cagrN,
      consistencyContrib: w.consistency * consistency,
      sharpeContrib: w.sharpe * sharpeN,
      volContrib: w.volatility * volN,
      expenseContrib: w.expense * expenseN,
      aumContrib: w.aum * aumN,
      diversificationContrib: w.diversificationBonus * diversificationBonusN,
    },
    penalties,
    prePenaltyScore: Math.round(prePenaltyScore * 10000) / 100,
    postPenaltyScore: Math.round((prePenaltyScore * expMod) * 10000) / 100,
    finalScore,
    rank: 0,
    profileType,
    weights: w,
  };
}

function formatScore(v: number): string {
  return v.toFixed(2);
}

function getMissingList(fund: MutualFund): string[] {
  const missing: string[] = [];
  if (safeNum(fund.sharpeRatio) === null) missing.push('Sharpe');
  if (safeNum(fund.sortinoRatio) === null) missing.push('Sortino');
  if ((safeNum(fund.volatility) ?? safeNum(fund.stdDev)) === null) missing.push('Volatility');
  if (safeNum(fund.ret3Y ?? fund.cagr3Y) === null) missing.push('CAGR3Y');
  if (safeNum(fund.expenseRatio) === null) missing.push('Expense');
  if (!fund.benchmark || String(fund.benchmark).trim() === '') missing.push('Benchmark');
  if (!fund.fundManager || String(fund.fundManager).trim() === '') missing.push('FundManager');
  if ([
    safeNum(fund.ret1M), safeNum(fund.ret3M), safeNum(fund.ret6M),
    safeNum(fund.ret1Y), safeNum(fund.ret3Y ?? fund.cagr3Y),
    safeNum(fund.ret5Y ?? fund.cagr5Y),
  ].filter(v => v !== null).length < 3) missing.push('Consistency periods');
  return missing;
}

function computeAgeYears(fund: MutualFund): number {
  if (!fund.launch) return 0;
  return (Date.now() - new Date(String(fund.launch)).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

async function runScoringBreakdown() {
  const outputDir = join(__dirname, 'output');
  mkdirSync(outputDir, { recursive: true });

  const fundsData = JSON.parse(readFileSync(join(__dirname, 'funds_data.json'), 'utf-8')) as MutualFund[];

  let md = `# Scoring Breakdown Report — Target Funds\n\n`;
  md += `**Date:** ${new Date().toISOString().slice(0, 10)}  \n`;
  md += `**Fund Universe:** ${fundsData.length} funds  \n\n`;

  md += `## Target Funds\n\n`;
  for (const id of TARGET_FUND_IDS) {
    const fund = fundsData.find(f => f.id === id);
    if (fund) {
      const age = computeAgeYears(fund);
      const missing = getMissingList(fund);
      md += `### ${fund.name}\n\n`;
      md += `| Field | Value |\n|---|---:|\n`;
      md += `| Category | ${fund.category} |\n`;
      md += `| Launch | ${fund.launch || 'N/A'} |\n`;
      md += `| Age | ${age.toFixed(1)} years |\n`;
      md += `| AUM | ${fund.aum ?? 'N/A'} Cr |\n`;
      md += `| Sharpe | ${fund.sharpeRatio ?? 'null'} |\n`;
      md += `| Sortino | ${fund.sortinoRatio ?? 'null'} |\n`;
      md += `| Volatility | ${fund.volatility ?? 'null'} |\n`;
      md += `| CAGR3Y | ${fund.cagr3Y ?? fund.ret3Y ?? 'null'} |\n`;
      md += `| Expense | ${fund.expenseRatio ?? 'null'}% |\n`;
      md += `| Benchmark | ${fund.benchmark ? fund.benchmark : 'null'} |\n`;
      md += `| Fund Manager | ${fund.fundManager ? fund.fundManager : 'null'} |\n`;
      md += `| Missing Fields | ${missing.join(', ') || 'None'} |\n`;
      md += `| Critical Missing | ${['Sharpe', 'Volatility', 'CAGR3Y'].filter(m => missing.includes(m)).join(', ') || 'None'} |\n\n`;
    }
  }

  md += `---\n\n## Detailed Per-Persona Breakdown\n\n`;

  for (const persona of PERSONAS) {
    md += `## Persona ${persona.id}: ${persona.name}\n\n`;
    md += `| Setting | Value |\n|---|---:|\n`;
    md += `| Risk | ${persona.riskTolerance} |\n`;
    md += `| Goal | ${persona.goal} |\n`;
    md += `| Horizon | ${persona.investmentHorizon} |\n`;
    md += `| Experience | ${persona.experienceLevel} |\n`;
    md += `| Amount | ${persona.investmentAmount} |\n\n`;

    const prefs: RecommendationPreferences = {
      riskTolerance: persona.riskTolerance,
      investmentGoal: persona.goal,
      investmentHorizon: persona.investmentHorizon,
      experienceLevel: persona.experienceLevel,
      investmentAmount: persona.investmentAmount,
    };

    const recommended = recommendFundsV2(fundsData, prefs);
    const medians = computeCategoryMedians(fundsData);
    const stats = computeNormStats(fundsData);

    const targetFundsInResult = recommended.filter(f => TARGET_FUND_IDS.includes(f.id));
    if (targetFundsInResult.length === 0) {
      md += `*None of the target funds appear in recommendations for this persona.*\n\n`;
      continue;
    }

    for (const scoredFund of targetFundsInResult) {
      const fund = fundsData.find(f => f.id === scoredFund.id)!;
      const breakdown = computeDetailedBreakdown(
        fund, stats, medians,
        persona.riskTolerance, persona.goal,
        persona.investmentHorizon, persona.experienceLevel,
      );
      breakdown.rank = recommended.indexOf(scoredFund) + 1;

      const profileWeights = PROFILE_WEIGHTS[breakdown.profileType] || PROFILE_WEIGHTS.moderate;

      md += `### ${fund.name}\n\n`;
      md += `**Rank:** #${breakdown.rank} | **Final Score:** ${breakdown.finalScore} | **Profile Type:** ${breakdown.profileType}\n\n`;

      md += `#### Weights Applied\n\n`;
      md += `| Factor | Weight |\n|---|---:|\n`;
      md += `| Sortino | ${(profileWeights.sortino * 100).toFixed(0)}% |\n`;
      md += `| CAGR Relative | ${(profileWeights.cagrRelative * 100).toFixed(0)}% |\n`;
      md += `| Consistency | ${(profileWeights.consistency * 100).toFixed(0)}% |\n`;
      md += `| Sharpe | ${(profileWeights.sharpe * 100).toFixed(0)}% |\n`;
      md += `| Low Volatility | ${(profileWeights.volatility * 100).toFixed(0)}% |\n`;
      md += `| Expense | ${(profileWeights.expense * 100).toFixed(0)}% |\n`;
      md += `| AUM | ${(profileWeights.aum * 100).toFixed(0)}% |\n`;
      md += `| Diversification | ${(profileWeights.diversificationBonus * 100).toFixed(0)}% |\n\n`;

      md += `#### Raw Metrics\n\n`;
      md += `| Metric | Raw Value | Missing? |\n|---|---|---:|\n`;
      md += `| Sharpe | ${breakdown.raw.sharpe} | ${safeNum(fund.sharpeRatio) === null ? 'YES' : 'no'} |\n`;
      md += `| Sortino | ${breakdown.raw.sortinoRaw} | ${safeNum(fund.sortinoRatio) === null ? 'YES' : 'no'} |\n`;
      md += `| CAGR3Y | ${breakdown.raw.cagr3} | ${safeNum(fund.ret3Y ?? fund.cagr3Y) === null ? 'YES' : 'no'} |\n`;
      md += `| Volatility | ${breakdown.raw.vol} | ${(safeNum(fund.volatility) ?? safeNum(fund.stdDev)) === null ? 'YES' : 'no'} |\n`;
      md += `| Expense | ${breakdown.raw.expense}% | ${safeNum(fund.expenseRatio) === null ? 'YES' : 'no'} |\n`;
      md += `| AUM | ${breakdown.raw.aum} Cr | N/A |\n`;
      md += `| Age | ${computeAgeYears(fund).toFixed(1)} years | N/A |\n\n`;

      md += `#### Normalized Scores (0-1)\n\n`;
      md += `| Factor | Normalized | Weight | Contribution |\n`;
      md += `|---|---|---:|---:|\n`;

      // Sortino contribution
      const sContrib = breakdown.weighted.sortinoContrib || breakdown.weights.sortino * breakdown.normalized.sortinoN;
      md += `| Sortino | ${formatScore(breakdown.normalized.sortinoN)} | ${(breakdown.weights.sortino * 100).toFixed(0)}% | ${formatScore(sContrib)} |\n`;

      // CAGR contribution
      const cContrib = breakdown.weights.cagrRelative * breakdown.normalized.cagrN;
      md += `| CAGR | ${formatScore(breakdown.normalized.cagrN)} | ${(breakdown.weights.cagrRelative * 100).toFixed(0)}% | ${formatScore(cContrib)} |\n`;

      // Consistency contribution
      const csContrib = breakdown.weights.consistency * breakdown.normalized.consistency;
      md += `| Consistency | ${formatScore(breakdown.normalized.consistency)} | ${(breakdown.weights.consistency * 100).toFixed(0)}% | ${formatScore(csContrib)} |\n`;

      // Sharpe contribution
      const shContrib = breakdown.weights.sharpe * breakdown.normalized.sharpeN;
      md += `| Sharpe | ${formatScore(breakdown.normalized.sharpeN)} | ${(breakdown.weights.sharpe * 100).toFixed(0)}% | ${formatScore(shContrib)} |\n`;

      // Vol contribution
      const vContrib = breakdown.weights.volatility * breakdown.normalized.volN;
      md += `| Volatility (inv) | ${formatScore(breakdown.normalized.volN)} | ${(breakdown.weights.volatility * 100).toFixed(0)}% | ${formatScore(vContrib)} |\n`;

      // Expense contribution
      const eContrib = breakdown.weights.expense * breakdown.normalized.expenseN;
      md += `| Expense | ${formatScore(breakdown.normalized.expenseN)} | ${(breakdown.weights.expense * 100).toFixed(0)}% | ${formatScore(eContrib)} |\n`;

      // AUM contribution
      const aContrib = breakdown.weights.aum * breakdown.normalized.aumN;
      md += `| AUM | ${formatScore(breakdown.normalized.aumN)} | ${(breakdown.weights.aum * 100).toFixed(0)}% | ${formatScore(aContrib)} |\n`;

      // Diversification contribution
      const dContrib = breakdown.weights.diversificationBonus * breakdown.normalized.diversificationBonusN;
      md += `| Diversification | ${formatScore(breakdown.normalized.diversificationBonusN)} | ${(breakdown.weights.diversificationBonus * 100).toFixed(0)}% | ${formatScore(dContrib)} |\n`;

      md += `| **Total (pre-penalty)** | | | **${formatScore(breakdown.prePenaltyScore)}** |\n\n`;

      md += `#### Penalties Applied\n\n`;
      md += `| Penalty | Value | Running Score |\n|---|---:|---:|\n`;
      if (breakdown.penalties.experienceModifier !== 1) {
        const afterExp = breakdown.prePenaltyScore * breakdown.penalties.experienceModifier;
        md += `| Experience Modifier | ×${formatScore(breakdown.penalties.experienceModifier)} | ${formatScore(afterExp)} |\n`;
      }
      md += `| Completeness (×${formatScore(breakdown.penalties.completenessMultiplier)}) | ${breakdown.penalties.criticalNulls} critical + ${breakdown.penalties.optionalNulls} optional nulls | ${formatScore(breakdown.prePenaltyScore * breakdown.penalties.experienceModifier * breakdown.penalties.completenessMultiplier)} |\n`;
      if (breakdown.penalties.ageMultiplier !== 1) {
        md += `| Age Penalty | ×${formatScore(breakdown.penalties.ageMultiplier)} | ${formatScore(breakdown.finalScore)} |\n`;
      }
      md += `| **Final Score** | | | **${formatScore(breakdown.finalScore)}** |\n\n`;

      md += `#### Top Competitors (Rank 1-5)\n\n`;
      md += `| Rank | Fund | Score | Missing Critical? |\n|---|---:|---:|---|\n`;
      for (let i = 0; i < Math.min(5, recommended.length); i++) {
        const rf = recommended[i];
        const reFund = fundsData.find(f => f.id === rf.id)!;
        const reMissing = getMissingList(reFund);
        const reCrit = ['Sharpe', 'Volatility', 'CAGR3Y'].filter(m => reMissing.includes(m));
        md += `| ${i + 1} | ${rf.name} | ${rf.compositeScore} | ${reCrit.length > 0 ? `YES (${reCrit.join(', ')})` : 'no'} |\n`;
      }
      md += `\n`;
    }

    md += `---\n\n`;
  }

  writeFileSync(join(outputDir, 'scoring_breakdown_report.md'), md, 'utf-8');
  console.log('Scoring breakdown report written');
}

runScoringBreakdown();
