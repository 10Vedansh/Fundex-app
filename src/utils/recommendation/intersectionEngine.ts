import { MutualFund } from '@/types/mutualFund';
import {
  RISK_CONSTRAINTS,
  GOAL_ELIGIBILITY,
  HORIZON_RULES,
  EXPERIENCE_MODIFIERS,
  AMOUNT_CONSTRAINTS,
  EXCLUDED_FUND_NAMES,
  BUSINESS_EXCLUDED_CATEGORIES,
  SECTORAL_CATEGORIES,
  getAllocationModel,
  normalizeAmcName,
  toCategoryCode,
  PLAIN_EQUITY,
  PLAIN_DEBT,
  PLAIN_HYBRID,
  PLAIN_INDEX,
  PLAIN_LIQUID,
} from './categoryMappings';
import {
  scoreV3,
  computeCategoryMedians,
  computeNormStats,
  determineProfileType,
  V3ScoreResult,
} from './scoringEngineV3';
import { generateExplanations } from './explainabilityEngine';
import { constructPortfolio, FundWithReason } from './portfolioConstructor';

export interface RecommendationPreferences {
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
  market_reaction?: string;
  emergency_fund?: string;
  existing_investments?: string;
  investor_stage?: string;
}

export type ConfidenceLevel = 'high' | 'medium' | 'limited_history';

export interface ScoredFund extends MutualFund {
  compositeScore: number;
  reasons: string[];
  matchLevel: 'high' | 'medium' | 'low';
  downsideRisk?: 'low' | 'moderate' | 'high';
  suitabilityBadge?: 'aligned' | 'adjusted' | 'limited';
  consistencyScore?: number;
  categoryRelativeScore?: number;
  profileType?: string;
  diversificationBonusScore?: number;
  expenseScore?: number;
  confidenceLevel?: ConfidenceLevel;
  confidenceReason?: string;
  selectionReason?: string;
}

export function computeConfidence(fund: MutualFund): { level: ConfidenceLevel; reason: string } {
  const safeNum = (val: number | string | null | undefined): number | null => {
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

function isPassiveFund(fund: MutualFund | ScoredFund): boolean {
  const name = fund.name.toLowerCase();
  return name.includes('etf') || name.includes('index fund');
}

// ── Normalization ──

const GOAL_NORMALIZE: Record<string, string> = {
  wealth: 'wealth_creation',
  wealth_creation: 'wealth_creation',
  retirement: 'retirement',
  child_education: 'child_education',
  income: 'passive_income',
  passive_income: 'passive_income',
  tax: 'tax_saving',
  tax_saving: 'tax_saving',
  preservation: 'capital_preservation',
  capital_preservation: 'capital_preservation',
};

const HORIZON_NORMALIZE: Record<string, string> = {
  '<3': 'short',
  '3-5': 'medium',
  '5-10': 'medium',
  '>10': 'long',
  short: 'short',
  medium: 'medium',
  long: 'long',
};

function normalizeGoal(goal: string): string {
  return GOAL_NORMALIZE[goal] || 'wealth_creation';
}

function normalizeHorizon(horizon: string): string {
  return HORIZON_NORMALIZE[horizon] || 'medium';
}

// ── Helpers ──

function safeNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

function catCode(fund: MutualFund): string {
  return toCategoryCode(fund.category || '');
}

function getAssetClassFromCategory(cat: string): string {
  if (cat.startsWith('EQ-') || cat === 'Equity') return 'equity';
  if (cat.startsWith('DT-') || cat === 'Debt') return 'debt';
  if (cat.startsWith('HY-') || cat === 'Hybrid') return 'hybrid';
  if (cat.startsWith('Gold') || cat.startsWith('Silver')) return 'commodity';
  return 'other';
}

function isExcluded(fund: MutualFund): boolean {
  const name = fund.name.toLowerCase();
  if (EXCLUDED_FUND_NAMES.some(ex => name.includes(ex))) return true;
  const cat = catCode(fund);
  if (BUSINESS_EXCLUDED_CATEGORIES.some(ex => cat.startsWith(ex))) return true;

  // Data-quality safety: catch funds mis-categorized as Equity/Index but with
  // international or commodity keywords in their name (e.g., Silver ETF FoF
  // categorized as "Equity - Index", Nasdaq ETF as "Equity - Large Cap").
  const intlCommodityKeywords = ['nasdaq', 'silver', 'dow jones', 's&p 500', 'us equity', 'global', 'international'];
  if (cat.startsWith('EQ-') || cat === 'Index') {
    if (intlCommodityKeywords.some(kw => name.includes(kw))) return true;
  }

  return false;
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

function applyInvestorStageFilter(funds: MutualFund[], investorStage: string | undefined): MutualFund[] {
  if (!investorStage || investorStage !== 'retired') return funds;
  const retiredBlockedCategories = [
    'EQ-MC', 'EQ-SC', 'EQ-L&MC', 'EQ-MLC',
    ...SECTORAL_CATEGORIES,
    'EQ-Quant', 'EQ-VAL', 'EQ-DIV Y', 'HY-AH',
  ];
  return funds.filter(f => !retiredBlockedCategories.includes(catCode(f)));
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
// (replaced by constructPortfolio in portfolioConstructor.ts)

// ── STEP 3: Fallback Strategy ──

interface FallbackStep {
  label: string;
  fn: (funds: MutualFund[]) => MutualFund[];
  dropped: string;
}

function applyFallback(
  cleanFunds: MutualFund[],
  prefs: RecommendationPreferences,
  allFundCategories: string[],
): MutualFund[] {
  const investorStage = prefs.investor_stage;
  const risk = prefs.riskTolerance;
  const horizon = normalizeHorizon(prefs.investmentHorizon);
  const goal = normalizeGoal(prefs.investmentGoal);

  const goalConfig = GOAL_ELIGIBILITY[goal];
  const horizonConfig = HORIZON_RULES[horizon];

  if (goalConfig) {
    const matchingPrefixes = (goalConfig.allowedCategoryPrefixes || [])
      .filter(p => allFundCategories.some(c => c === p || c.startsWith(p)));
  }

  // For locked goals (e.g., tax_saving), the fallback chain keeps goal eligibility
  // while relaxing risk/horizon, so fallback can never bypass goal category prefixes.
  const isLocked = goalConfig?.lockInFlag && goalConfig.allowedCategoryPrefixes !== null;

  const fallbackChain: FallbackStep[] = isLocked
    ? [
        {
          label: 'Risk+Goal+Horizon',
          fn: (f) => applyHorizonRules(applyGoalEligibility(applyRiskConstraints(f, risk), goal), horizon),
          dropped: '',
        },
        {
          label: 'Goal+Horizon(relaxed risk)',
          fn: (f) => applyHorizonRules(applyGoalEligibility(f, goal), horizon),
          dropped: 'Risk',
        },
        {
          label: 'Risk+Goal(relaxed horizon)',
          fn: (f) => applyGoalEligibility(applyRiskConstraints(f, risk), goal),
          dropped: 'Horizon',
        },
        {
          label: 'Goal-only(relaxed risk+horizon)',
          fn: (f) => applyGoalEligibility(f, goal),
          dropped: 'Risk+Horizon',
        },
      ]
    : [
        {
          label: 'Risk+Goal+Horizon',
          fn: (f) => applyHorizonRules(applyGoalEligibility(applyRiskConstraints(f, risk), goal), horizon),
          dropped: '',
        },
        {
          label: 'Risk+Goal+Horizon(relaxed)',
          fn: (f) => applyHorizonRules(applyGoalEligibility(applyRiskConstraints(f, risk), goal), horizon),
          dropped: '',
        },
        {
          label: 'Risk+Goal',
          fn: (f) => applyGoalEligibility(applyRiskConstraints(f, risk), goal),
          dropped: 'Horizon',
        },
        {
          label: 'Risk+Goal(noPrefix)',
          fn: (f) => {
            const g = goalConfig;
            if (!g) return applyRiskConstraints(f, risk);
            const prefixPass = applyRiskConstraints(f, risk);
            return prefixPass.filter(fund => {
              const cat = catCode(fund);
              if (g.blockedCategories.includes(cat)) return false;
              if (g.maxVolatility !== null) {
                const vol = safeNum(fund.volatility) ?? safeNum(fund.stdDev);
                if (vol !== null && vol > g.maxVolatility) return false;
              }
              if (g.minSharpe !== null) {
                const sharpe = safeNum(fund.sharpeRatio);
                if (sharpe !== null && sharpe < g.minSharpe) return false;
              }
              if (g.requirePositive3Y) {
                const ret3 = safeNum(fund.ret3Y ?? fund.cagr3Y);
                if (ret3 !== null && ret3 <= 0) return false;
              }
              return true;
            });
          },
          dropped: 'Horizon+PrefixCheck',
        },
        {
          label: 'Risk+Horizon',
          fn: (f) => applyHorizonRules(applyRiskConstraints(f, risk), horizon),
          dropped: 'Goal',
        },
        {
          label: 'Risk-only',
          fn: (f) => applyRiskConstraints(f, risk),
          dropped: 'Goal+Horizon',
        },
      ];

  // Apply investor stage filter to each fallback result
  const filterByStage = (funds: MutualFund[]) => {
    if (!investorStage || investorStage !== 'retired') return funds;
    return applyInvestorStageFilter(funds, investorStage);
  };

  for (const step of fallbackChain) {
    const eligible = filterByStage(step.fn(cleanFunds));
    if (eligible.length >= 5) {
      return eligible;
    }
  }

  // Last resort: relaxed risk+goal constraints only, but never return ALL funds
  const lastResort = filterByStage(applyRiskConstraints(cleanFunds, risk));
  const goalFiltered = goalConfig
    ? lastResort.filter(f => {
        const cat = catCode(f);
        if (goalConfig.blockedCategories.includes(cat)) return false;
        return true;
      })
    : lastResort;
  const stageFiltered = filterByStage(goalFiltered);
  return stageFiltered.length >= 5 ? stageFiltered : [];
}

// ── MAIN ENTRY POINT ──

export function recommendFundsV2(
  funds: MutualFund[],
  prefs: RecommendationPreferences,
): ScoredFund[] {
  const startTime = performance.now();

  const normalizedPrefs: RecommendationPreferences = {
    ...prefs,
    investmentGoal: normalizeGoal(prefs.investmentGoal),
    investmentHorizon: normalizeHorizon(prefs.investmentHorizon),
  };

  let lastCount = funds.length;

  // Step 0: Remove excluded
  const cleanFunds = funds.filter(f => !isExcluded(f));
  lastCount = cleanFunds.length;

  const fundCategories = [...new Set(cleanFunds.map(f => catCode(f)))];

  // Step 1: Eligibility (hard constraints)
  let eligible = applyRiskConstraints(cleanFunds, normalizedPrefs.riskTolerance);
  lastCount = eligible.length;

  eligible = applyGoalEligibility(eligible, normalizedPrefs.investmentGoal);
  lastCount = eligible.length;

  eligible = applyHorizonRules(eligible, normalizedPrefs.investmentHorizon);
  lastCount = eligible.length;

  eligible = applyExperienceFilter(eligible, normalizedPrefs.experienceLevel);
  lastCount = eligible.length;

  eligible = applyInvestorStageFilter(eligible, normalizedPrefs.investor_stage);
  lastCount = eligible.length;

  eligible = applyAmountConstraints(eligible, normalizedPrefs.investmentAmount);

  // Step 2: Fallback if empty
  if (eligible.length === 0) {
    eligible = applyFallback(cleanFunds, normalizedPrefs, fundCategories);
  }

  const profileType = determineProfileType(
    normalizedPrefs.riskTolerance,
    normalizedPrefs.investmentGoal,
    normalizedPrefs.investmentHorizon,
    normalizedPrefs.experienceLevel,
  );

  if (eligible.length === 0) {
    return [];
  }

  const medians = computeCategoryMedians(eligible);
  const stats = computeNormStats(eligible);

  const scored: ScoredFund[] = eligible.map(fund => {
    const result: V3ScoreResult = scoreV3(
      fund,
      stats,
      medians,
      normalizedPrefs.experienceLevel,
      normalizedPrefs.riskTolerance,
      normalizedPrefs.investmentHorizon,
      normalizedPrefs.investmentGoal,
      {
        market_reaction: normalizedPrefs.market_reaction,
        emergency_fund: normalizedPrefs.emergency_fund,
        existing_investments: normalizedPrefs.existing_investments,
        investor_stage: normalizedPrefs.investor_stage,
      },
    );
    const confidence = computeConfidence(fund);
    const explanations = generateExplanations({
      fund,
      medians,
      categoryRelativeScore: result.categoryRelativeScore,
      confidenceLevel: confidence.level,
      confidenceReason: confidence.reason,
    });
    return {
      ...fund,
      compositeScore: result.score,
      reasons: explanations,
      matchLevel: result.score > 70 ? 'high' : result.score > 40 ? 'medium' : 'low',
      downsideRisk: result.downsideRisk,
      suitabilityBadge: result.suitabilityBadge,
      consistencyScore: result.consistencyScore,
      categoryRelativeScore: result.categoryRelativeScore,
      profileType: result.profileType,
      diversificationBonusScore: result.diversificationBonusScore,
      expenseScore: result.expenseScore,
      confidenceLevel: confidence.level,
      confidenceReason: confidence.reason,
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const diversified = constructPortfolio(scored, normalizedPrefs, 9, normalizedPrefs.investmentGoal);

  return diversified;
}
