import { MutualFund } from '@/types/mutualFund';
import { recommendFundsV2, RecommendationPreferences } from './recommendation/intersectionEngine';
import { FundWithReason } from './recommendation/portfolioConstructor';
import { deriveRiskFromProfile } from './recommendation/riskCapacity';
import type { AnalyticsHolding } from '@/components/dashboard/PortfolioAnalytics';

export interface PortfolioMetrics {
  expectedReturn: number;
  volatility: number;
  riskLevel: string;
  diversificationScore: number;
  amcCount: number;
  topAmcPct: number;
  equityPct: number;
  debtPct: number;
  hybridPct: number;
}

export interface ImprovementScore {
  returnImprovement: number;
  totalScore: number;
  label: string;
}

export interface ComparisonResult {
  currentPortfolio: PortfolioMetrics;
  recommendedPortfolio: PortfolioMetrics & {
    constructedPortfolio: FundWithReason[];
  };
  improvementScore: ImprovementScore;
  rebalancingSuggestions: string[];
}

function safeNum(val: number | null | undefined): number {
  return val ?? 0;
}

function getCategoryAssetClass(category: string): string {
  if (!category) return 'Other';
  const uc = category.trim().toUpperCase();
  if (uc.startsWith('EQ-') || uc === 'EQUITY') return 'Equity';
  if (uc.startsWith('DT-') || uc === 'DEBT') return 'Debt';
  if (uc.startsWith('HY-') || uc === 'HYBRID') return 'Hybrid';
  if (uc === 'GOLD-FUNDS' || uc === 'SILVER-FUNDS') return 'Commodities';
  return 'Other';
}

function getHealthLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Healthy';
  if (score >= 60) return 'Moderate';
  return 'Needs Attention';
}

function computeDiversificationScore(
  fundCount: number,
  amcCount: number,
  topAmcPct: number,
  assetClassCount: number,
  categoryCount: number,
): number {
  const fundScore = fundCount >= 10 ? 25 : fundCount >= 7 ? 20 : fundCount >= 4 ? 15 : fundCount >= 2 ? 8 : 0;
  const amcSpread = topAmcPct < 20 ? 25 : topAmcPct < 30 ? 20 : topAmcPct < 40 ? 15 : topAmcPct < 50 ? 8 : 0;
  const assetScore = assetClassCount >= 3 ? 25 : assetClassCount === 2 ? 15 : 5;
  const catScore = categoryCount >= 5 ? 25 : categoryCount >= 3 ? 15 : categoryCount >= 2 ? 8 : 0;
  return Math.min(100, fundScore + amcSpread + assetScore + catScore);
}

function computeCurrentMetrics(
  holdings: AnalyticsHolding[],
  funds: MutualFund[],
): PortfolioMetrics | null {
  if (holdings.length === 0) return null;

  const total = holdings.reduce((s, h) => s + h.currentValue, 0);
  if (total === 0) return null;

  // Match holdings to funds for CAGR data
  const fundMap = new Map(funds.map((f) => [f.name.toLowerCase(), f]));
  let weightedReturn = 0;
  let weightedVol = 0;

  for (const h of holdings) {
    const weight = h.currentValue / total;
    const fund = fundMap.get(h.fund_name.toLowerCase());
    const cagr = fund ? safeNum(fund.ret3Y ?? fund.cagr3Y) : 8;
    const vol = fund ? safeNum(fund.volatility ?? fund.stdDev) : 8;
    weightedReturn += cagr * weight;
    weightedVol += vol * weight;
  }

  // AMC groups
  const amcGroups: Record<string, number> = {};
  holdings.forEach((h) => {
    const amc = h.amc || 'Unknown';
    amcGroups[amc] = (amcGroups[amc] || 0) + h.currentValue;
  });
  const amcCount = Object.keys(amcGroups).length;
  const topAmcPct = Math.max(...Object.values(amcGroups).map((v) => (v / total) * 100));

  // Asset class groups
  const assetGroups: Record<string, number> = {};
  holdings.forEach((h) => {
    const ac = h.assetClass || getCategoryAssetClass(h.category);
    assetGroups[ac] = (assetGroups[ac] || 0) + h.currentValue;
  });
  const assetClassCount = Object.keys(assetGroups).length;
  const equityPct = total > 0 ? ((assetGroups['Equity'] || 0) / total) * 100 : 0;
  const debtPct = total > 0 ? ((assetGroups['Debt'] || 0) / total) * 100 : 0;
  const hybridPct = total > 0 ? ((assetGroups['Hybrid'] || 0) / total) * 100 : 0;

  // Categories
  const categories = new Set(holdings.map((h) => h.category).filter(Boolean));

  const riskLevel = weightedVol < 8 ? 'Conservative' : weightedVol < 14 ? 'Moderate' : 'Aggressive';
  const diveScore = computeDiversificationScore(holdings.length, amcCount, topAmcPct, assetClassCount, categories.size);

  return {
    expectedReturn: Math.round(weightedReturn * 10) / 10,
    volatility: Math.round(weightedVol * 10) / 10,
    riskLevel,
    diversificationScore: diveScore,
    amcCount,
    topAmcPct: Math.round(topAmcPct * 10) / 10,
    equityPct: Math.round(equityPct * 10) / 10,
    debtPct: Math.round(debtPct * 10) / 10,
    hybridPct: Math.round(hybridPct * 10) / 10,
  };
}

function computeRecommendedMetrics(
  constructed: FundWithReason[],
  funds: MutualFund[],
): PortfolioMetrics {
  const count = constructed.length;
  if (count === 0) {
    return {
      expectedReturn: 0, volatility: 0, riskLevel: 'Conservative',
      diversificationScore: 0, amcCount: 0, topAmcPct: 0,
      equityPct: 0, debtPct: 0, hybridPct: 0,
    };
  }

  const equalWeight = 100 / count;

  // Build allocation-like entries for metric computation
  const allocations = constructed.map(fund => ({
    fund,
    allocationPercent: equalWeight,
  }));

  const expectedCagr = allocations.reduce((sum, a) => {
    const cagr = safeNum(a.fund.ret3Y ?? a.fund.cagr3Y);
    return sum + (cagr * a.allocationPercent / 100);
  }, 0);

  const expectedVolatility = allocations.reduce((sum, a) => {
    const vol = safeNum(a.fund.volatility) || safeNum(a.fund.stdDev);
    return sum + (vol * a.allocationPercent / 100);
  }, 0);

  // AMC groups
  const amcGroups: Record<string, number> = {};
  allocations.forEach((a) => {
    amcGroups[a.fund.amc] = (amcGroups[a.fund.amc] || 0) + a.allocationPercent;
  });
  const amcCount = Object.keys(amcGroups).length;
  const topAmcPct = Math.max(...Object.values(amcGroups));

  // Asset class groups
  const assetGroups: Record<string, number> = {};
  allocations.forEach((a) => {
    const cat = a.fund.category || '';
    const ac = getCategoryAssetClass(cat);
    assetGroups[ac] = (assetGroups[ac] || 0) + a.allocationPercent;
  });
  const totalPct = Object.values(assetGroups).reduce((s, v) => s + v, 0);
  const equityPct = totalPct > 0 ? ((assetGroups['Equity'] || 0) / totalPct) * 100 : 0;
  const debtPct = totalPct > 0 ? ((assetGroups['Debt'] || 0) / totalPct) * 100 : 0;
  const hybridPct = totalPct > 0 ? ((assetGroups['Hybrid'] || 0) / totalPct) * 100 : 0;

  const categories = new Set(allocations.map((a) => a.fund.category).filter(Boolean));

  const riskLevel = expectedVolatility < 8 ? 'Conservative' : expectedVolatility < 14 ? 'Moderate' : 'Aggressive';

  const diveScore = computeDiversificationScore(
    allocations.length,
    amcCount,
    topAmcPct,
    Object.keys(assetGroups).length,
    categories.size,
  );

  return {
    expectedReturn: Math.round(expectedCagr * 10) / 10,
    volatility: Math.round(expectedVolatility * 10) / 10,
    riskLevel,
    diversificationScore: diveScore,
    amcCount,
    topAmcPct: Math.round(topAmcPct * 10) / 10,
    equityPct: Math.round(equityPct * 10) / 10,
    debtPct: Math.round(debtPct * 10) / 10,
    hybridPct: Math.round(hybridPct * 10) / 10,
  };
}

function computeImprovementScore(
  current: PortfolioMetrics,
  recommended: PortfolioMetrics,
): ImprovementScore {
  const returnImprovement = recommended.expectedReturn - current.expectedReturn;

  const returnScore = returnImprovement > 0 ? Math.min(40, returnImprovement * 10) : 0;
  const diveDiff = recommended.diversificationScore - current.diversificationScore;
  const diveScore = diveDiff > 0 ? Math.min(20, diveDiff * 2) : 0;
  const volDiff = current.volatility - recommended.volatility;
  const volScore = volDiff > 0 ? Math.min(20, volDiff * 3) : 0;
  const allocDiff = Math.abs(current.equityPct - recommended.equityPct);
  const allocScore = allocDiff < 15 ? 20 : allocDiff < 30 ? 10 : 0;

  const totalScore = Math.min(100, Math.round(returnScore + diveScore + volScore + allocScore));

  let label: string;
  if (totalScore >= 70) label = 'Significant improvement potential';
  else if (totalScore >= 40) label = 'Moderate improvement potential';
  else if (totalScore >= 15) label = 'Minor improvement potential';
  else label = 'Portfolio is well aligned';

  return {
    returnImprovement: Math.round(returnImprovement * 10) / 10,
    totalScore,
    label,
  };
}

function generateRebalancingSuggestions(
  current: PortfolioMetrics,
  recommended: PortfolioMetrics,
  currentHoldings: AnalyticsHolding[],
  recommendedAllocations: { name: string; percent: number }[],
): string[] {
  const suggestions: string[] = [];

  // AMC concentration
  if (current.topAmcPct > 35 && recommended.topAmcPct < current.topAmcPct) {
    suggestions.push(`Reduce ${current.amcCount === 1 ? 'single AMC' : 'top AMC'} concentration from ${current.topAmcPct.toFixed(0)}%`);
  }

  // Asset allocation gaps
  const eqDiff = recommended.equityPct - current.equityPct;
  if (eqDiff > 15) suggestions.push(`Increase equity allocation from ${current.equityPct.toFixed(0)}% to ~${recommended.equityPct.toFixed(0)}% for better growth`);
  else if (eqDiff < -15) suggestions.push(`Reduce equity allocation from ${current.equityPct.toFixed(0)}% to ~${recommended.equityPct.toFixed(0)}% to align with risk profile`);

  const debtDiff = recommended.debtPct - current.debtPct;
  if (debtDiff > 10) suggestions.push(`Add debt allocation from ${current.debtPct.toFixed(0)}% to ~${recommended.debtPct.toFixed(0)}% for stability`);
  else if (debtDiff < -10 && current.debtPct > 10) suggestions.push(`Reduce debt allocation from ${current.debtPct.toFixed(0)}% to ~${recommended.debtPct.toFixed(0)}%`);

  // Diversification
  if (current.diversificationScore < recommended.diversificationScore && recommended.diversificationScore - current.diversificationScore > 15) {
    suggestions.push('Improve diversification by adding funds across more categories and AMCs');
  }

  // Risk alignment
  if (current.riskLevel !== recommended.riskLevel) {
    suggestions.push(`Align portfolio risk profile from ${current.riskLevel} to ${recommended.riskLevel}`);
  }

  // Fund count
  if (currentHoldings.length < 3) {
    suggestions.push('Add at least 2-3 more funds for adequate diversification');
  }
  if (currentHoldings.length > 12) {
    suggestions.push('Consolidate overlapping funds to reduce portfolio complexity');
  }

  // Specific area suggestions based on recommended allocations
  if (recommendedAllocations.length > 0) {
    const topRecFunds = recommendedAllocations.slice(0, 3);
    suggestions.push(`Consider adding: ${topRecFunds.map((a) => a.name).join(', ')}`);
  }

  return suggestions.slice(0, 6);
}

export interface ComparisonInput {
  holdings: AnalyticsHolding[];
  funds: MutualFund[];
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
  market_reaction?: string | null;
  investor_stage?: string | null;
  emergency_fund?: string | null;
  existing_investments?: string | null;
  dependents?: number | null;
}

export function comparePortfolios(input: ComparisonInput): ComparisonResult | null {
  const { holdings, funds, riskTolerance, investmentGoal, investmentHorizon, experienceLevel, investmentAmount } = input;

  if (holdings.length === 0 || funds.length === 0) return null;

  // 1. Compute current portfolio metrics
  const currentMetrics = computeCurrentMetrics(holdings, funds);
  if (!currentMetrics) return null;

  // 2. Derive effective risk from profile
  const marketReaction = input.market_reaction ||
    (riskTolerance === 'conservative' ? 'withdraw' :
     riskTolerance === 'aggressive' ? 'invest_more' : 'wait');
  const riskProfileResult = deriveRiskFromProfile({
    market_reaction: marketReaction,
    investor_stage: input.investor_stage || 'mid_career',
    emergency_fund: input.emergency_fund || '>6_months',
    existing_investments: input.existing_investments || 'none',
    investment_horizon: investmentHorizon,
    primary_goal: investmentGoal,
    dependents: input.dependents,
  });
  const effectiveRisk = riskProfileResult.riskTolerance;

  // 3. Run recommendation engine
  const prefs: RecommendationPreferences = {
    riskTolerance: effectiveRisk,
    investmentGoal,
    investmentHorizon,
    experienceLevel,
    investmentAmount,
    market_reaction: marketReaction,
    investor_stage: input.investor_stage || undefined,
    emergency_fund: input.emergency_fund || undefined,
    existing_investments: input.existing_investments || undefined,
  };

  const constructedFunds = recommendFundsV2(funds, prefs);

  // 4. Compute recommended portfolio metrics
  const recommendedMetrics = computeRecommendedMetrics(constructedFunds, funds);

  // 6. Compute improvement score
  const improvementScore = computeImprovementScore(currentMetrics, recommendedMetrics);

  // 7. Generate rebalancing suggestions
  const recommendedAllocations = constructedFunds.map((a) => ({
    name: a.name,
    percent: 100 / constructedFunds.length,
  }));

  const rebalancingSuggestions = generateRebalancingSuggestions(
    currentMetrics,
    recommendedMetrics,
    holdings,
    recommendedAllocations,
  );

  return {
    currentPortfolio: currentMetrics,
    recommendedPortfolio: {
      ...recommendedMetrics,
      constructedPortfolio: constructedFunds,
    },
    improvementScore,
    rebalancingSuggestions,
  };
}
