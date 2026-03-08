/**
 * CIFRAA Strategy Portfolio Engine
 *
 * Generates 3–4 named portfolio strategies (Conservative, Balanced, Growth, Aggressive)
 * based on user questionnaire responses. Each portfolio contains 4–5 funds with
 * precise allocations that sum to exactly 100%.
 *
 * Allocation logic is deterministic and driven entirely by:
 *   - Risk tolerance
 *   - Investment horizon
 *   - Investment goal
 *   - Experience level
 *   - Financial risk capacity
 */

import { MutualFund, CATEGORY_LABELS } from '@/types/mutualFund';
import { ScoredFund, recommendFundsV2, RecommendationPreferences } from './intersectionEngine';
import { computeRiskCapacity, RiskCapacityInputs, RiskCapacityResult } from './riskCapacity';

// ── Types ──

export interface StrategyFund {
  fund: ScoredFund;
  allocationPercent: number;
  assetClass: string;
  justification: string;
}

export interface PortfolioStrategy {
  name: string;
  riskLevel: 'Low' | 'Low-Medium' | 'Medium' | 'Medium-High' | 'High';
  expectedReturnRange: string;
  horizonSuitability: string;
  description: string;
  funds: StrategyFund[];
  profileFitExplanation: string;
}

export interface StrategyGenerationResult {
  strategies: PortfolioStrategy[];
  capacityResult: RiskCapacityResult;
  userInputSummary: {
    riskTolerance: string;
    goal: string;
    horizon: string;
    experience: string;
    investmentAmount: number;
  };
}

// ── Strategy Templates ──

interface StrategyTemplate {
  name: string;
  riskLevel: PortfolioStrategy['riskLevel'];
  equityRange: [number, number]; // min-max equity %
  debtRange: [number, number];
  hybridRange: [number, number];
  returnRange: string;
  horizonMin: string;
  fundTargetCount: number;
  equityBuckets: { categories: string[]; label: string; maxFunds: number; priority: number }[];
  debtBuckets: { categories: string[]; label: string; maxFunds: number; priority: number }[];
  hybridBuckets: { categories: string[]; label: string; maxFunds: number; priority: number }[];
}

function getStrategyTemplates(
  riskTolerance: string,
  goal: string,
  horizon: string,
  capacityScore: number,
): StrategyTemplate[] {
  const templates: StrategyTemplate[] = [];

  // Conservative Portfolio — always available
  templates.push({
    name: 'Conservative Portfolio',
    riskLevel: 'Low',
    equityRange: [10, 25],
    debtRange: [55, 75],
    hybridRange: [10, 25],
    returnRange: '6–9%',
    horizonMin: '1+ years',
    fundTargetCount: 5,
    equityBuckets: [
      { categories: ['EQ-LC', 'EQ-FLX', 'EQ-L&MC'], label: 'Large Cap / Flexi Cap', maxFunds: 1, priority: 1 },
    ],
    debtBuckets: [
      { categories: ['DT-CB', 'DT-BK & PSU'], label: 'Corporate Bond / Banking PSU', maxFunds: 1, priority: 1 },
      { categories: ['DT-SD', 'DT-LD', 'DT-USD'], label: 'Short / Low Duration', maxFunds: 1, priority: 2 },
      { categories: ['DT-GL', 'DT-Floater', 'DT-TM'], label: 'Gilt / Floating Rate', maxFunds: 1, priority: 3 },
    ],
    hybridBuckets: [
      { categories: ['HY-CH', 'HY-DAA', 'HY-AR'], label: 'Conservative Hybrid / Arbitrage', maxFunds: 1, priority: 1 },
    ],
  });

  // Balanced Portfolio
  templates.push({
    name: 'Balanced Portfolio',
    riskLevel: 'Medium',
    equityRange: [40, 55],
    debtRange: [25, 35],
    hybridRange: [15, 25],
    returnRange: '10–13%',
    horizonMin: '3+ years',
    fundTargetCount: 5,
    equityBuckets: [
      { categories: ['EQ-LC', 'EQ-FLX', 'EQ-L&MC'], label: 'Large Cap / Flexi Cap', maxFunds: 1, priority: 1 },
      { categories: ['EQ-VAL', 'EQ-ELSS', 'EQ-DIV Y'], label: 'Value / ELSS', maxFunds: 1, priority: 2 },
    ],
    debtBuckets: [
      { categories: ['DT-CB', 'DT-BK & PSU', 'DT-SD'], label: 'Corporate Bond / Short Duration', maxFunds: 1, priority: 1 },
    ],
    hybridBuckets: [
      { categories: ['HY-BH', 'HY-DAA', 'HY-MAA'], label: 'Balanced Hybrid / Multi Asset', maxFunds: 1, priority: 1 },
    ],
  });

  // Growth Portfolio — only if capacity >= 3 or risk is moderate/aggressive
  if (capacityScore >= 3 || riskTolerance !== 'conservative') {
    templates.push({
      name: 'Growth Portfolio',
      riskLevel: 'Medium-High',
      equityRange: [65, 80],
      debtRange: [10, 20],
      hybridRange: [5, 15],
      returnRange: '13–17%',
      horizonMin: '5+ years',
      fundTargetCount: 5,
      equityBuckets: [
        { categories: ['EQ-FLX', 'EQ-MLC', 'EQ-L&MC'], label: 'Flexi / Multi Cap', maxFunds: 1, priority: 1 },
        { categories: ['EQ-MC', 'EQ-L&MC'], label: 'Mid Cap', maxFunds: 1, priority: 2 },
        { categories: ['EQ-VAL', 'EQ-ELSS'], label: 'Value / Tax Saver', maxFunds: 1, priority: 3 },
      ],
      debtBuckets: [
        { categories: ['DT-CB', 'DT-SD', 'DT-BK & PSU'], label: 'Corporate Bond / Short Duration', maxFunds: 1, priority: 1 },
      ],
      hybridBuckets: [
        { categories: ['HY-AH', 'HY-BH', 'HY-MAA'], label: 'Aggressive Hybrid / Multi Asset', maxFunds: 1, priority: 1 },
      ],
    });
  }

  // Aggressive Portfolio — only if capacity >= 4 or risk is aggressive
  if (capacityScore >= 4 || riskTolerance === 'aggressive') {
    templates.push({
      name: 'Aggressive Portfolio',
      riskLevel: 'High',
      equityRange: [85, 95],
      debtRange: [0, 10],
      hybridRange: [0, 5],
      returnRange: '16–22%',
      horizonMin: '7+ years',
      fundTargetCount: 5,
      equityBuckets: [
        { categories: ['EQ-FLX', 'EQ-MLC'], label: 'Flexi / Multi Cap', maxFunds: 1, priority: 1 },
        { categories: ['EQ-MC', 'EQ-L&MC'], label: 'Mid Cap', maxFunds: 1, priority: 2 },
        { categories: ['EQ-SC'], label: 'Small Cap', maxFunds: 1, priority: 3 },
        { categories: ['EQ-BANK', 'EQ-IT', 'EQ-Pharma', 'EQ-THEMATIC', 'EQ-INFRA'], label: 'Sectoral / Thematic', maxFunds: 1, priority: 4 },
      ],
      debtBuckets: [
        { categories: ['DT-CB', 'DT-SD'], label: 'Short Term Debt', maxFunds: 1, priority: 1 },
      ],
      hybridBuckets: [],
    });
  }

  // Adjust return ranges based on horizon
  if (horizon === 'short') {
    templates.forEach(t => {
      if (t.name === 'Aggressive Portfolio' || t.name === 'Growth Portfolio') {
        t.horizonMin = 'Not recommended for short horizon';
      }
    });
  }

  return templates;
}

// ── Helpers ──

function safeNum(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '' || val === '--') return 0;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? 0 : n;
}

function getAssetClass(category: string): string {
  if (category.startsWith('EQ-')) return 'Equity';
  if (category.startsWith('DT-')) return 'Debt';
  if (category.startsWith('HY-')) return 'Hybrid';
  if (category.startsWith('Gold') || category.startsWith('Silver')) return 'Commodities';
  return 'Other';
}

function generateJustification(
  fund: ScoredFund,
  bucketLabel: string,
  riskTolerance: string,
  goal: string,
  horizon: string,
): string {
  const cat = (fund.category || '').trim();
  const catLabel = CATEGORY_LABELS[cat] || cat;
  const cagr3 = safeNum(fund.ret3Y ?? fund.cagr3Y);
  const sharpe = safeNum(fund.sharpeRatio);
  const vol = safeNum(fund.volatility) || safeNum(fund.stdDev);

  const parts: string[] = [];

  // Asset class fit
  if (cat.startsWith('DT-')) {
    if (riskTolerance === 'conservative') {
      parts.push('Provides capital stability with predictable returns');
    } else {
      parts.push('Adds portfolio stability and reduces overall volatility');
    }
  } else if (cat.startsWith('EQ-')) {
    if (goal === 'wealth') {
      parts.push(`${catLabel} fund selected for long-term wealth creation`);
    } else if (goal === 'tax') {
      parts.push('Tax-efficient equity exposure under Section 80C');
    } else {
      parts.push(`${catLabel} fund for equity growth potential`);
    }
  } else if (cat.startsWith('HY-')) {
    parts.push('Balanced equity-debt exposure for risk-adjusted returns');
  }

  // Performance justification
  if (cagr3 > 15) {
    parts.push(`Strong 3Y CAGR of ${cagr3.toFixed(1)}%`);
  } else if (cagr3 > 10) {
    parts.push(`Solid 3Y CAGR of ${cagr3.toFixed(1)}%`);
  }

  if (sharpe > 1.5) {
    parts.push('Excellent risk-adjusted returns');
  }

  if (vol < 5 && cat.startsWith('DT-')) {
    parts.push('Low volatility suitable for capital preservation');
  }

  // Horizon fit
  if (horizon === 'long' && cat.startsWith('EQ-')) {
    parts.push('Long investment horizon supports equity compounding');
  } else if (horizon === 'short' && cat.startsWith('DT-')) {
    parts.push('Short-duration debt matches your investment timeline');
  }

  return parts.slice(0, 2).join('. ') + '.';
}

// ── Core Engine ──

function selectFundsForTemplate(
  template: StrategyTemplate,
  scoredFunds: ScoredFund[],
  globalUsedIds: Set<string>,
  riskTolerance: string,
  goal: string,
  horizon: string,
): StrategyFund[] {
  const selected: StrategyFund[] = [];
  const usedIds = new Set<string>(globalUsedIds);
  const usedAmcs = new Map<string, number>();

  // Determine target allocations
  const eqTarget = (template.equityRange[0] + template.equityRange[1]) / 2;
  const dtTarget = (template.debtRange[0] + template.debtRange[1]) / 2;
  const hyTarget = (template.hybridRange[0] + template.hybridRange[1]) / 2;

  // Collect all buckets with their allocation class
  type BucketEntry = {
    categories: string[];
    label: string;
    maxFunds: number;
    priority: number;
    classTarget: number;
    assetPrefix: string;
  };

  const allBuckets: BucketEntry[] = [
    ...template.equityBuckets.map(b => ({ ...b, classTarget: eqTarget, assetPrefix: 'Equity' })),
    ...template.debtBuckets.map(b => ({ ...b, classTarget: dtTarget, assetPrefix: 'Debt' })),
    ...template.hybridBuckets.map(b => ({ ...b, classTarget: hyTarget, assetPrefix: 'Hybrid' })),
  ].sort((a, b) => a.priority - b.priority);

  // Calculate per-bucket allocation
  const totalBucketWeight = allBuckets.reduce((sum, b) => sum + (1 / b.priority), 0);

  for (const bucket of allBuckets) {
    const eligible = scoredFunds
      .filter(f => {
        const cat = (f.category || '').trim();
        return bucket.categories.includes(cat) && !usedIds.has(f.id);
      })
      .sort((a, b) => b.compositeScore - a.compositeScore);

    let count = 0;
    for (const fund of eligible) {
      if (count >= bucket.maxFunds) break;
      if (selected.length >= template.fundTargetCount) break;

      const amcCount = usedAmcs.get(fund.amc) || 0;
      if (amcCount >= 2) continue;

      selected.push({
        fund,
        allocationPercent: 0, // will be computed after
        assetClass: getAssetClass((fund.category || '').trim()),
        justification: generateJustification(fund, bucket.label, riskTolerance, goal, horizon),
      });

      usedIds.add(fund.id);
      usedAmcs.set(fund.amc, amcCount + 1);
      count++;
    }
  }

  if (selected.length === 0) return [];

  // Compute allocations based on asset class targets
  const classCounts: Record<string, number> = {};
  selected.forEach(s => {
    classCounts[s.assetClass] = (classCounts[s.assetClass] || 0) + 1;
  });

  const classTargets: Record<string, number> = {
    Equity: eqTarget,
    Debt: dtTarget,
    Hybrid: hyTarget,
    Commodities: 0,
    Other: 0,
  };

  // Distribute allocation within each asset class equally
  let totalRawAlloc = 0;
  selected.forEach(s => {
    const classCount = classCounts[s.assetClass] || 1;
    const target = classTargets[s.assetClass] || 0;
    s.allocationPercent = target / classCount;
    totalRawAlloc += s.allocationPercent;
  });

  // Normalize to exactly 100%
  if (totalRawAlloc > 0) {
    const factor = 100 / totalRawAlloc;
    selected.forEach(s => {
      s.allocationPercent = Math.round(s.allocationPercent * factor * 10) / 10;
    });
  }

  // Fix rounding to exactly 100
  const total = selected.reduce((sum, s) => sum + s.allocationPercent, 0);
  const diff = Math.round((100 - total) * 10) / 10;
  if (diff !== 0 && selected.length > 0) {
    // Add/subtract from the largest allocation
    const largest = selected.reduce((a, b) => a.allocationPercent > b.allocationPercent ? a : b);
    largest.allocationPercent = Math.round((largest.allocationPercent + diff) * 10) / 10;
  }

  return selected;
}

function getProfileFitExplanation(
  strategyName: string,
  riskTolerance: string,
  goal: string,
  horizon: string,
  capacityScore: number,
): string {
  const goalLabels: Record<string, string> = {
    wealth: 'wealth creation',
    income: 'regular income generation',
    preservation: 'capital preservation',
    tax: 'tax-efficient investing',
  };
  const horizonLabels: Record<string, string> = {
    short: 'short-term (1–3 years)',
    medium: 'medium-term (3–7 years)',
    long: 'long-term (7+ years)',
  };

  const goalLabel = goalLabels[goal] || goal;
  const horizonLabel = horizonLabels[horizon] || horizon;

  if (strategyName.includes('Conservative')) {
    return `This portfolio prioritizes capital safety with ${riskTolerance === 'conservative' ? 'full alignment to' : 'a more cautious approach than'} your ${riskTolerance} risk profile. Designed for ${goalLabel} over a ${horizonLabel} horizon with minimal downside exposure.`;
  }
  if (strategyName.includes('Balanced')) {
    return `A balanced mix of equity and debt tailored for ${goalLabel}. Suitable for your ${horizonLabel} investment horizon with moderate risk exposure aligned to a capacity score of ${capacityScore}/5.`;
  }
  if (strategyName.includes('Growth')) {
    return `Growth-oriented allocation emphasizing equity for ${goalLabel} over a ${horizonLabel} horizon. This strategy leverages your risk capacity of ${capacityScore}/5 to target higher returns.`;
  }
  if (strategyName.includes('Aggressive')) {
    return `Maximum equity exposure for aggressive ${goalLabel}. Best suited for investors with a ${horizonLabel} commitment and high risk capacity (${capacityScore}/5). Expect higher volatility in exchange for superior long-term returns.`;
  }
  return `Diversified portfolio designed for ${goalLabel} matching your ${riskTolerance} risk profile.`;
}

function getHorizonSuitability(strategyName: string, horizon: string): string {
  const map: Record<string, Record<string, string>> = {
    'Conservative Portfolio': {
      short: 'Excellent fit',
      medium: 'Good fit',
      long: 'Suitable but may underperform',
    },
    'Balanced Portfolio': {
      short: 'Moderate fit — some equity risk',
      medium: 'Excellent fit',
      long: 'Good fit',
    },
    'Growth Portfolio': {
      short: 'Not recommended',
      medium: 'Moderate fit — needs patience',
      long: 'Excellent fit',
    },
    'Aggressive Portfolio': {
      short: 'Not recommended',
      medium: 'Below ideal — high volatility risk',
      long: 'Excellent fit',
    },
  };
  return map[strategyName]?.[horizon] || 'Moderate fit';
}

// ── MAIN ENTRY POINT ──

export function generateStrategyPortfolios(
  funds: MutualFund[],
  riskTolerance: string,
  goal: string,
  horizon: string,
  experience: string,
  investmentAmount: number,
  capacityInputs: RiskCapacityInputs,
): StrategyGenerationResult {
  // Step 1: Compute risk capacity
  const capacityResult = computeRiskCapacity(capacityInputs, riskTolerance);

  // Step 2: Get scored fund universe
  const prefs: RecommendationPreferences = {
    riskTolerance: capacityResult.adjustedRiskLevel,
    investmentGoal: goal,
    investmentHorizon: horizon,
    experienceLevel: experience,
    investmentAmount: investmentAmount < 50000 ? 'small' : investmentAmount < 500000 ? 'medium' : 'large',
  };

  // Get a larger pool for strategy selection — use the full scored universe
  const scoredFunds = recommendFundsV2(funds, prefs);

  // Also get a broader pool by relaxing some constraints for non-primary strategies
  const broadPrefs: RecommendationPreferences = {
    ...prefs,
    riskTolerance: riskTolerance, // Use original risk, not adjusted
  };
  const broadScoredFunds = recommendFundsV2(funds, broadPrefs);

  // Merge and deduplicate
  const allScored = new Map<string, ScoredFund>();
  [...scoredFunds, ...broadScoredFunds].forEach(f => {
    if (!allScored.has(f.id) || (allScored.get(f.id)!.compositeScore < f.compositeScore)) {
      allScored.set(f.id, f);
    }
  });
  const fundPool = Array.from(allScored.values()).sort((a, b) => b.compositeScore - a.compositeScore);

  // Step 3: Get strategy templates
  const templates = getStrategyTemplates(riskTolerance, goal, horizon, capacityResult.capacityScore);

  // Step 4: Build each strategy with unique fund sets
  const strategies: PortfolioStrategy[] = [];
  const globalUsedIds = new Set<string>();

  for (const template of templates) {
    const funds = selectFundsForTemplate(
      template, fundPool, globalUsedIds,
      riskTolerance, goal, horizon,
    );

    if (funds.length < 3) continue; // Skip if we can't build a meaningful portfolio

    // Mark funds as used globally to ensure unique combos
    funds.forEach(f => globalUsedIds.add(f.fund.id));

    strategies.push({
      name: template.name,
      riskLevel: template.riskLevel,
      expectedReturnRange: template.returnRange,
      horizonSuitability: getHorizonSuitability(template.name, horizon),
      description: getProfileFitExplanation(template.name, riskTolerance, goal, horizon, capacityResult.capacityScore),
      funds,
      profileFitExplanation: getProfileFitExplanation(template.name, riskTolerance, goal, horizon, capacityResult.capacityScore),
    });
  }

  return {
    strategies,
    capacityResult,
    userInputSummary: {
      riskTolerance,
      goal,
      horizon,
      experience,
      investmentAmount,
    },
  };
}
