/**
 * CIFRAA Recommendation Engine V2 — Constraint-Driven Scoring
 *
 * Architecture:
 *   Preference Validator → Constraint Builder → Eligible Fund Universe
 *   → Score Engine → Category Diversification → Top 9
 */

import { MutualFund } from '@/types/mutualFund';
import {
  RISK_CONSTRAINTS,
  GOAL_ELIGIBILITY,
  HORIZON_RULES,
  EXPERIENCE_MODIFIERS,
  AMOUNT_CONSTRAINTS,
  EXCLUDED_FUND_NAMES,
  SECTORAL_CATEGORIES,
  getAllocationModel,
} from './categoryMappings';

export interface RecommendationPreferences {
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
}

export interface ScoredFund extends MutualFund {
  compositeScore: number;
  reasons: string[];
  matchLevel: 'high' | 'medium' | 'low';
}

// ── Helpers ──

function safeNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

function catCode(fund: MutualFund): string {
  return (fund.category || '').trim();
}

function isExcluded(fund: MutualFund): boolean {
  const name = fund.name.toLowerCase();
  return EXCLUDED_FUND_NAMES.some(ex => name.includes(ex));
}

// ── STEP 1: Eligibility Engine (hard constraints) ──

function applyRiskConstraints(funds: MutualFund[], risk: string): MutualFund[] {
  const c = RISK_CONSTRAINTS[risk];
  if (!c) return funds;

  return funds.filter(f => {
    const cat = catCode(f);

    // Blocked categories
    if (c.blockedCategories.includes(cat)) return false;

    // Volatility cap
    if (c.maxVolatility !== null) {
      const vol = safeNum(f.volatility) ?? safeNum(f.stdDev);
      if (vol !== null && vol > c.maxVolatility) return false;
    }

    // Max drawdown — use stdDev as proxy if no dedicated field
    if (c.maxDrawdown !== null) {
      const vol = safeNum(f.volatility) ?? safeNum(f.stdDev);
      if (vol !== null && vol > c.maxDrawdown) return false;
    }

    return true;
  });
}

function applyGoalEligibility(funds: MutualFund[], goal: string): MutualFund[] {
  const g = GOAL_ELIGIBILITY[goal];
  if (!g) return funds;

  return funds.filter(f => {
    const cat = catCode(f);

    // Allowed category prefixes
    if (g.allowedCategoryPrefixes !== null) {
      const allowed = g.allowedCategoryPrefixes.some(prefix =>
        cat === prefix || cat.startsWith(prefix)
      );
      if (!allowed) return false;
    }

    // Blocked categories
    if (g.blockedCategories.includes(cat)) return false;

    // Volatility cap
    if (g.maxVolatility !== null) {
      const vol = safeNum(f.volatility) ?? safeNum(f.stdDev);
      if (vol !== null && vol > g.maxVolatility) return false;
    }

    // Min sharpe
    if (g.minSharpe !== null) {
      const sharpe = safeNum(f.sharpeRatio);
      if (sharpe !== null && sharpe < g.minSharpe) return false;
    }

    // Require positive 3Y returns
    if (g.requirePositive3Y) {
      const ret3 = safeNum(f.ret3Y ?? f.cagr3Y);
      if (ret3 !== null && ret3 <= 0) return false;
    }

    return true;
  });
}

function applyHorizonRules(funds: MutualFund[], horizon: string): MutualFund[] {
  const h = HORIZON_RULES[horizon];
  if (!h) return funds;

  return funds.filter(f => {
    const cat = catCode(f);
    if (h.blockedCategories.includes(cat)) return false;
    return true;
  });
}

function applyExperienceFilter(funds: MutualFund[], experience: string): MutualFund[] {
  const mod = EXPERIENCE_MODIFIERS[experience];
  if (!mod) return funds;

  // Only hard filter: beginners cannot see sectoral
  if (!mod.allowSectoral) {
    return funds.filter(f => !SECTORAL_CATEGORIES.includes(catCode(f)));
  }
  return funds;
}

function applyAmountConstraints(funds: MutualFund[], amount: string): MutualFund[] {
  const c = AMOUNT_CONSTRAINTS[amount];
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

// ── STEP 2: Scoring Engine ──

interface NormalizationStats {
  maxSharpe: number;
  minSharpe: number;
  maxCagr3Y: number;
  minCagr3Y: number;
  maxVol: number;
  minVol: number;
  maxExpense: number;
  minExpense: number;
  maxAum: number;
  minAum: number;
}

function computeStats(funds: MutualFund[]): NormalizationStats {
  let maxSharpe = -Infinity, minSharpe = Infinity;
  let maxCagr = -Infinity, minCagr = Infinity;
  let maxVol = -Infinity, minVol = Infinity;
  let maxExp = -Infinity, minExp = Infinity;
  let maxAum = -Infinity, minAum = Infinity;

  for (const f of funds) {
    const s = safeNum(f.sharpeRatio) ?? 0;
    const c = safeNum(f.ret3Y ?? f.cagr3Y) ?? 0;
    const v = safeNum(f.volatility) ?? safeNum(f.stdDev) ?? 0;
    const e = safeNum(f.expenseRatio) ?? 0;
    const a = safeNum(f.aum) ?? 0;

    if (s > maxSharpe) maxSharpe = s; if (s < minSharpe) minSharpe = s;
    if (c > maxCagr) maxCagr = c; if (c < minCagr) minCagr = c;
    if (v > maxVol) maxVol = v; if (v < minVol) minVol = v;
    if (e > maxExp) maxExp = e; if (e < minExp) minExp = e;
    if (a > maxAum) maxAum = a; if (a < minAum) minAum = a;
  }

  return {
    maxSharpe, minSharpe: minSharpe === Infinity ? 0 : minSharpe,
    maxCagr3Y: maxCagr, minCagr3Y: minCagr === Infinity ? 0 : minCagr,
    maxVol, minVol: minVol === Infinity ? 0 : minVol,
    maxExpense: maxExp, minExpense: minExp === Infinity ? 0 : minExp,
    maxAum, minAum: minAum === Infinity ? 0 : minAum,
  };
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function scoreFund(
  fund: MutualFund,
  prefs: RecommendationPreferences,
  stats: NormalizationStats,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const expMod = EXPERIENCE_MODIFIERS[prefs.experienceLevel] || EXPERIENCE_MODIFIERS.intermediate;

  const sharpe = safeNum(fund.sharpeRatio) ?? 0;
  const cagr3 = safeNum(fund.ret3Y ?? fund.cagr3Y) ?? 0;
  const vol = safeNum(fund.volatility) ?? safeNum(fund.stdDev) ?? 0;
  const expense = safeNum(fund.expenseRatio) ?? 0;
  const aum = safeNum(fund.aum) ?? 0;

  // Normalized scores (0-1)
  const sharpeN = normalize(sharpe, stats.minSharpe, stats.maxSharpe);
  const cagrN = normalize(cagr3, stats.minCagr3Y, stats.maxCagr3Y);
  const volN = 1 - normalize(vol, stats.minVol, stats.maxVol); // lower = better
  const expenseN = 1 - normalize(expense, stats.minExpense, stats.maxExpense); // lower = better
  const aumN = normalize(aum, stats.minAum, stats.maxAum);

  // Adjust weights based on experience
  const volWeight = prefs.experienceLevel === 'beginner' ? 0.25 : 0.15;
  const sharpeWeight = 0.35;
  const cagrWeight = 0.25;
  const expenseWeight = 0.15 * expMod.expensePenaltyMultiplier;
  const aumWeight = 0.10 * expMod.aumBonusMultiplier;

  // Normalize total weight to 1
  const totalWeight = sharpeWeight + cagrWeight + volWeight + expenseWeight + aumWeight;

  let score = (
    (sharpeWeight * sharpeN) +
    (cagrWeight * cagrN) +
    (volWeight * volN) +
    (expenseWeight * expenseN) +
    (aumWeight * aumN)
  ) / totalWeight;

  // Apply experience volatility penalty
  if (prefs.experienceLevel === 'beginner' && vol > 15) {
    score *= 0.7;
    reasons.push('Penalized: high volatility for beginner');
  }

  // Reason generation
  if (sharpe > 1.5) reasons.push('Strong risk-adjusted returns');
  if (expense < 0.5) reasons.push('Very low expense ratio');
  else if (expense < 1) reasons.push('Low expense ratio');
  if (vol < 5) reasons.push('Stable performance history');
  if (aum > 10000) reasons.push('Large, well-established fund');

  // Goal-specific reasons
  const cat = catCode(fund);
  if (prefs.investmentGoal === 'preservation' && cat.startsWith('DT-')) {
    reasons.push('Low-risk debt fund for capital safety');
  }
  if (prefs.investmentGoal === 'tax' && cat === 'EQ-ELSS') {
    reasons.push('ELSS — eligible for ₹1.5L tax deduction');
  }
  if (prefs.investmentGoal === 'income' && cat === 'EQ-DIV Y') {
    reasons.push('Suitable for dividend income');
  }

  // Horizon-specific reasons
  if (prefs.investmentHorizon === 'long' && (cat === 'EQ-SC' || cat === 'EQ-MC')) {
    reasons.push('Suitable for long-term wealth compounding');
  }
  if (prefs.investmentHorizon === 'short' && (cat.startsWith('DT-') || cat === 'HY-AR')) {
    reasons.push('Matches your short-term timeline');
  }

  // Risk match reason
  if (prefs.riskTolerance === 'conservative' && vol < 4) {
    reasons.push('Matches your conservative risk profile');
  }
  if (prefs.riskTolerance === 'moderate' && vol >= 4 && vol <= 15) {
    reasons.push('Balanced risk for moderate investors');
  }

  return { score: Math.round(score * 10000) / 100, reasons };
}

// ── STEP 3: Diversification Engine ──

function diversify(
  scored: ScoredFund[],
  prefs: RecommendationPreferences,
  target: number,
): ScoredFund[] {
  const model = getAllocationModel(prefs.riskTolerance, prefs.investmentGoal);
  const result: ScoredFund[] = [];
  const usedAmcs = new Map<string, number>();
  const usedIds = new Set<string>();

  // Fill from allocation buckets
  for (const bucket of model) {
    const bucketFunds = scored
      .filter(f => bucket.categories.includes(catCode(f)) && !usedIds.has(f.id))
      .sort((a, b) => b.compositeScore - a.compositeScore);

    let count = 0;
    for (const fund of bucketFunds) {
      if (count >= bucket.maxFunds || result.length >= target) break;
      const amcCount = usedAmcs.get(fund.amc) || 0;
      if (amcCount >= 2) continue;

      result.push(fund);
      usedIds.add(fund.id);
      usedAmcs.set(fund.amc, amcCount + 1);
      count++;
    }
  }

  // Fill remaining from top scores
  if (result.length < target) {
    const catCount = new Map<string, number>();
    result.forEach(f => catCount.set(catCode(f), (catCount.get(catCode(f)) || 0) + 1));

    for (const fund of scored) {
      if (result.length >= target) break;
      if (usedIds.has(fund.id)) continue;
      const amcCount = usedAmcs.get(fund.amc) || 0;
      if (amcCount >= 2) continue;
      const cc = catCount.get(catCode(fund)) || 0;
      if (cc >= 2) continue;

      result.push(fund);
      usedIds.add(fund.id);
      usedAmcs.set(fund.amc, amcCount + 1);
      catCount.set(catCode(fund), cc + 1);
    }
  }

  return result;
}

// ── STEP 4: Fallback Strategy ──

function applyFallback(
  cleanFunds: MutualFund[],
  prefs: RecommendationPreferences,
): MutualFund[] {
  // NEVER relax: risk, horizon
  let eligible = applyRiskConstraints(cleanFunds, prefs.riskTolerance);
  eligible = applyHorizonRules(eligible, prefs.investmentHorizon);
  eligible = applyGoalEligibility(eligible, prefs.investmentGoal);

  if (eligible.length > 0) return eligible;

  // Step 1: Relax experience
  eligible = applyRiskConstraints(cleanFunds, prefs.riskTolerance);
  eligible = applyHorizonRules(eligible, prefs.investmentHorizon);

  if (eligible.length > 0) return eligible;

  // Step 2: Relax goal (keep risk + horizon)
  eligible = applyRiskConstraints(cleanFunds, prefs.riskTolerance);
  return eligible.length > 0 ? eligible : cleanFunds;
}

// ── MAIN ENTRY POINT ──

export function recommendFundsV2(
  funds: MutualFund[],
  prefs: RecommendationPreferences,
): ScoredFund[] {
  const startTime = performance.now();

  // Step 0: Remove excluded
  const cleanFunds = funds.filter(f => !isExcluded(f));

  // Step 1: Eligibility (hard constraints)
  let eligible = applyRiskConstraints(cleanFunds, prefs.riskTolerance);
  eligible = applyGoalEligibility(eligible, prefs.investmentGoal);
  eligible = applyHorizonRules(eligible, prefs.investmentHorizon);
  eligible = applyExperienceFilter(eligible, prefs.experienceLevel);
  eligible = applyAmountConstraints(eligible, prefs.investmentAmount);

  // Step 2: Fallback if empty
  if (eligible.length === 0) {
    eligible = applyFallback(cleanFunds, prefs);
  }

  // Step 3: Compute normalization stats & score
  const stats = computeStats(eligible);
  const scored: ScoredFund[] = eligible.map(fund => {
    const { score, reasons } = scoreFund(fund, prefs, stats);
    return {
      ...fund,
      compositeScore: score,
      reasons,
      matchLevel: score > 70 ? 'high' : score > 40 ? 'medium' : 'low',
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  // Step 4: Diversify
  const diversified = diversify(scored, prefs, 9);

  const elapsed = performance.now() - startTime;
  if (elapsed > 150) {
    console.warn(`Recommendation engine took ${elapsed.toFixed(1)}ms (target: 150ms)`);
  }

  return diversified;
}
