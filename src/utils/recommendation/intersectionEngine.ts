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

export interface RecommendationPreferences {
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
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
  return (fund.category || '').trim();
}

function isExcluded(fund: MutualFund): boolean {
  const name = fund.name.toLowerCase();
  if (EXCLUDED_FUND_NAMES.some(ex => name.includes(ex))) return true;
  const cat = catCode(fund);
  if (BUSINESS_EXCLUDED_CATEGORIES.some(ex => cat.startsWith(ex))) return true;
  return false;
}

// ── Logging helpers ──

function logCategoryDiff(label: string, before: MutualFund[], after: MutualFund[]): void {
  const beforeCats = new Set(before.map(f => catCode(f)));
  const afterCats = new Set(after.map(f => catCode(f)));
  const removed = [...beforeCats].filter(c => !afterCats.has(c));
  const allAllowed = [...afterCats];
  if (removed.length > 0) {
    console.log(`[CIFRAA-RECO] ${label} — removed categories: [${removed.join(', ')}]`);
  }
  if (allAllowed.length > 0) {
    console.log(`[CIFRAA-RECO] ${label} — allowed categories: [${allAllowed.join(', ')}]`);
  }
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
  console.log('[TRACE-GOAL-MAP]', 'goal=' + goal, 'lookup=' + JSON.stringify(g?.allowedCategoryPrefixes));
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
  normalizedGoal?: string,
): ScoredFund[] {
  const model = getAllocationModel(prefs.riskTolerance, prefs.investmentGoal);
  const result: ScoredFund[] = [];
  const usedAmcs = new Map<string, number>();
  const usedIds = new Set<string>();
  let etfCount = 0;
  const MAX_ETF = 3;
  const isRetirement = normalizedGoal === 'retirement';
  let arbitrageCount = 0;
  const MAX_ARBITRAGE_RETIREMENT = 1;

  const totalEtfsBefore = scored.filter(f => isPassiveFund(f)).length;
  console.log(`[CIFRAA-DIVERSIFY] Total passive funds (ETF/Index) in scored set: ${totalEtfsBefore}`);

  for (const bucket of model) {
    const bucketFunds = scored
      .filter(f => bucket.categories.includes(catCode(f)) && !usedIds.has(f.id))
      .sort((a, b) => b.compositeScore - a.compositeScore);

    let count = 0;
    for (const fund of bucketFunds) {
      if (count >= bucket.maxFunds || result.length >= target) break;
      const normAmc = normalizeAmcName(fund.amc);
      const amcCount = usedAmcs.get(normAmc) || 0;
      if (amcCount >= 2) continue;
      if (isPassiveFund(fund) && etfCount >= MAX_ETF) continue;
      if (isRetirement && catCode(fund) === 'HY-AR' && arbitrageCount >= MAX_ARBITRAGE_RETIREMENT) continue;

      result.push(fund);
      usedIds.add(fund.id);
      usedAmcs.set(normAmc, amcCount + 1);
      if (isPassiveFund(fund)) etfCount++;
      if (catCode(fund) === 'HY-AR') arbitrageCount++;
      count++;
    }
  }

  // Fill remaining from top scores
  if (result.length < target) {
    const catCount = new Map<string, number>();
    result.forEach(f => catCount.set(catCode(f), (catCount.get(catCode(f)) || 0) + 1));

    // Determine goal-allowed prefixes for fill-remaining phase to prevent category leakage
    const goalConfig = normalizedGoal ? GOAL_ELIGIBILITY[normalizedGoal] : null;
    const allowedPrefixes = goalConfig?.allowedCategoryPrefixes;

    for (const fund of scored) {
      if (result.length >= target) break;
      if (usedIds.has(fund.id)) continue;
      const normAmc = normalizeAmcName(fund.amc);
      const amcCount = usedAmcs.get(normAmc) || 0;
      if (amcCount >= 2) continue;
      const cc = catCount.get(catCode(fund)) || 0;
      if (cc >= 4) continue;
      if (isPassiveFund(fund) && etfCount >= MAX_ETF) continue;
      if (isRetirement && catCode(fund) === 'HY-AR' && arbitrageCount >= MAX_ARBITRAGE_RETIREMENT) continue;

      // Enforce goal-appropriate category in fill-remaining phase (prevent DT, Gold, etc. leakage)
      if (allowedPrefixes !== null && allowedPrefixes !== undefined) {
        const cat = catCode(fund);
        const matchesGoal = allowedPrefixes.some(p => cat === p || cat.startsWith(p));
        if (!matchesGoal) continue;
      }

      result.push(fund);
      usedIds.add(fund.id);
      usedAmcs.set(normAmc, amcCount + 1);
      if (isPassiveFund(fund)) etfCount++;
      if (catCode(fund) === 'HY-AR') arbitrageCount++;
      catCount.set(catCode(fund), cc + 1);
    }
  }

  const finalEtfCount = result.filter(f => isPassiveFund(f)).length;
  console.log(`[CIFRAA-RECO] ETF_COUNT=${finalEtfCount}`);
  console.log(`[CIFRAA-RECO] ACTIVE_COUNT=${result.length - finalEtfCount}`);

  return result;
}

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
  const risk = prefs.riskTolerance;
  const horizon = normalizeHorizon(prefs.investmentHorizon);
  const goal = normalizeGoal(prefs.investmentGoal);

  const goalConfig = GOAL_ELIGIBILITY[goal];
  const horizonConfig = HORIZON_RULES[horizon];

  // Log what we know before fallback
  console.log(`[CIFRAA-RECO][FALLBACK] riskTolerance=${risk}, goal=${goal}, horizon=${horizon}`);
  console.log(`[CIFRAA-RECO][FALLBACK] Total fund categories in universe: [${allFundCategories.join(', ')}]`);

  if (goalConfig) {
    const matchingPrefixes = (goalConfig.allowedCategoryPrefixes || [])
      .filter(p => allFundCategories.some(c => c === p || c.startsWith(p)));
    console.log(`[CIFRAA-RECO][FALLBACK] Goal "${goal}" allowed prefixes match these categories: [${matchingPrefixes.join(', ') || 'NONE'}]. If empty, goal filter will always produce 0.`);
    console.log('[TRACE-GOAL-DEBUG] allowedPrefixes:', goalConfig.allowedCategoryPrefixes, '| liveCategories:', allFundCategories);
    goalConfig.allowedCategoryPrefixes?.forEach(p => {
      const matched = allFundCategories.filter(c => c === p || c.startsWith(p));
      console.log(`[TRACE-GOAL-DEBUG] prefix="${p}" matches=[${matched.join(', ') || 'NONE'}]`);
    });
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

  const dropped: string[] = [];
  let firstNonEmpty = false;

  for (const step of fallbackChain) {
    const eligible = step.fn(cleanFunds);
    if (eligible.length > 0) {
      if (!firstNonEmpty) {
        firstNonEmpty = true;
        if (dropped.length > 0 || step.dropped) {
          console.log(`[CIFRAA-RECO][WARNING] Fallback Activated — dropped: [${step.dropped}], using "${step.label}", count: ${eligible.length}`);
        }
        return eligible;
      }
    }
    if (step.dropped) {
      dropped.push(step.dropped);
    }
  }

  console.log(`[CIFRAA-RECO][WARNING] Fallback Activated — ALL filters dropped, returning all ${cleanFunds.length} funds`);
  console.log(`[CIFRAA-RECO][WARNING] This indicates a fundamental category mapping issue. Fund categories: [${allFundCategories.join(', ')}] vs expected codes.`);
  return cleanFunds;
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

  console.log('[TRACE-PREFS]', JSON.stringify(prefs));
  console.log('[TRACE-START] START_COUNT=' + funds.length);

  const allCats = [...new Set(funds.map(f => f.category))];
  console.log('[TRACE-CATEGORIES]', allCats);

  let lastCount = funds.length;

  // Step 0: Remove excluded
  const cleanFunds = funds.filter(f => !isExcluded(f));
  if (cleanFunds.length !== lastCount) console.log('[TRACE-EXCLUSIONS]', lastCount, '->', cleanFunds.length);
  lastCount = cleanFunds.length;

  const fundCategories = [...new Set(cleanFunds.map(f => catCode(f)))];

  // Step 1: Eligibility (hard constraints)
  let eligible = applyRiskConstraints(cleanFunds, normalizedPrefs.riskTolerance);
  console.log('[TRACE-RISK]', lastCount, eligible.length);
  lastCount = eligible.length;

  eligible = applyGoalEligibility(eligible, normalizedPrefs.investmentGoal);
  console.log('[TRACE-GOAL]', lastCount, eligible.length);
  lastCount = eligible.length;

  eligible = applyHorizonRules(eligible, normalizedPrefs.investmentHorizon);
  console.log('[TRACE-HORIZON]', lastCount, eligible.length);
  lastCount = eligible.length;

  eligible = applyExperienceFilter(eligible, normalizedPrefs.experienceLevel);
  console.log('[TRACE-EXPERIENCE]', lastCount, eligible.length);
  lastCount = eligible.length;

  eligible = applyAmountConstraints(eligible, normalizedPrefs.investmentAmount);
  console.log('[TRACE-AMOUNT]', lastCount, eligible.length);

  // Step 2: Fallback if empty
  if (eligible.length === 0) {
    console.log('[TRACE-FALLBACK] FALLBACK_TRIGGERED: eligible=0');
    eligible = applyFallback(cleanFunds, normalizedPrefs, fundCategories);
    console.log('[TRACE-FALLBACK] AFTER_FALLBACK:', eligible.length);
  }

  console.log('[TRACE-ELIGIBLE] FINAL_ELIGIBLE:', eligible.length);

  const profileType = determineProfileType(
    normalizedPrefs.riskTolerance,
    normalizedPrefs.investmentGoal,
    normalizedPrefs.investmentHorizon,
    normalizedPrefs.experienceLevel,
  );

  if (eligible.length === 0) {
    console.log('[TRACE-EXIT] returning 0 — scored section skipped');
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
    );
    const confidence = computeConfidence(fund);
    return {
      ...fund,
      compositeScore: result.score,
      reasons: result.reasons,
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

  const diversified = diversify(scored, normalizedPrefs, 9, normalizedPrefs.investmentGoal);
  console.log('[TRACE-OUTPUT] returning diversified:', diversified.length, 'funds');
  if (diversified.length > 0) {
    console.log('[TRACE-OUTPUT] first:', diversified[0].id, diversified[0].name, diversified[0].category);
    console.log('[TRACE-OUTPUT] ids:', diversified.map(f => f.id).join(','));
    console.log('[TRACE-OUTPUT] names:', diversified.map(f => f.name).join(' | '));
  }

  return diversified;
}
