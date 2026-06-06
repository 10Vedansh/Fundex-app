/**
 * CIFRAA Recommendation Engine V3 — Constraint-Driven + Advanced Scoring
 *
 * Architecture:
 *   Preference Validator → Constraint Builder → Eligible Fund Universe
 *   → V3 Score Engine → Category Diversification → Top 9
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
import {
  scoreV3,
  computeCategoryMedians,
  computeNormStats,
  V3ScoreResult,
} from './scoringEngineV3';

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
  downsideRisk?: 'low' | 'moderate' | 'high';
  suitabilityBadge?: 'aligned' | 'adjusted' | 'limited';
  consistencyScore?: number;
  categoryRelativeScore?: number;
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

function applyGoalEligibility(funds: MutualFund[], goal: string): MutualFund[] {
  const g = GOAL_ELIGIBILITY[goal];
  if (!g) return funds;

  return funds.filter(f => {
    const cat = catCode(f);
    if (g.allowedCategoryPrefixes !== null) {
      const allowed = g.allowedCategoryPrefixes.some(prefix =>
        cat === prefix || cat.startsWith(prefix)
      );
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

function applyHorizonRules(funds: MutualFund[], horizon: string): MutualFund[] {
  const h = HORIZON_RULES[horizon];
  if (!h) return funds;
  return funds.filter(f => !h.blockedCategories.includes(catCode(f)));
}

function applyExperienceFilter(funds: MutualFund[], experience: string): MutualFund[] {
  const mod = EXPERIENCE_MODIFIERS[experience];
  if (!mod) return funds;
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

// ── STEP 2: Diversification Engine ──

function diversify(
  scored: ScoredFund[],
  prefs: RecommendationPreferences,
  target: number,
): ScoredFund[] {
  const model = getAllocationModel(prefs.riskTolerance, prefs.investmentGoal);
  const result: ScoredFund[] = [];
  const usedAmcs = new Map<string, number>();
  const usedIds = new Set<string>();

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

// ── STEP 3: Fallback Strategy ──

function applyFallback(cleanFunds: MutualFund[], prefs: RecommendationPreferences): MutualFund[] {
  let eligible = applyRiskConstraints(cleanFunds, prefs.riskTolerance);
  eligible = applyHorizonRules(eligible, prefs.investmentHorizon);
  eligible = applyGoalEligibility(eligible, prefs.investmentGoal);

  if (eligible.length > 0) return eligible;

  eligible = applyRiskConstraints(cleanFunds, prefs.riskTolerance);
  eligible = applyHorizonRules(eligible, prefs.investmentHorizon);

  if (eligible.length > 0) return eligible;

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

  // Step 3: Compute category medians & V3 scoring
  const medians = computeCategoryMedians(eligible);
  const stats = computeNormStats(eligible);

  const scored: ScoredFund[] = eligible.map(fund => {
    const result: V3ScoreResult = scoreV3(
      fund,
      stats,
      medians,
      prefs.experienceLevel,
      prefs.riskTolerance,
      prefs.investmentHorizon,
    );
    return {
      ...fund,
      compositeScore: result.score,
      reasons: result.reasons,
      matchLevel: result.score > 70 ? 'high' : result.score > 40 ? 'medium' : 'low',
      downsideRisk: result.downsideRisk,
      suitabilityBadge: result.suitabilityBadge,
      consistencyScore: result.consistencyScore,
      categoryRelativeScore: result.categoryRelativeScore,
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  // Step 4: Diversify
  const diversified = diversify(scored, prefs, 9);

  const elapsed = performance.now() - startTime;
  if (elapsed > 200) {
    console.warn(`Recommendation engine took ${elapsed.toFixed(1)}ms (target: 200ms)`);
  }

  return diversified;
}
