/**
 * CIFRAA Portfolio Construction Engine
 *
 * Builds a diversified portfolio based on risk capacity, horizon, and goal.
 * Selects 2-6 funds across equity/debt/hybrid allocation.
 */

import { MutualFund } from '@/types/mutualFund';
import { ScoredFund } from './intersectionEngine';
import { getEquityAllocation } from './riskCapacity';

export interface PortfolioAllocation {
  fund: ScoredFund;
  allocationPercent: number;
  bucket: string; // e.g. 'Large/Flexi Cap', 'Corporate Bond'
}

export interface ConstructedPortfolio {
  allocations: PortfolioAllocation[];
  expectedCagr: number;
  expectedVolatility: number;
  downsideRisk: 'low' | 'moderate' | 'high';
  rebalancingFrequency: string;
  sipSplit: { fundName: string; amount: number }[];
  reasons: string[];
}

interface AllocationBucket {
  name: string;
  categories: string[];
  targetPercent: number;
  maxFunds: number;
}

function safeNum(val: number | string | null | undefined): number {
  if (val === null || val === undefined || val === '' || val === '--') return 0;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? 0 : n;
}

function getEquityBuckets(riskScore: number): AllocationBucket[] {
  if (riskScore <= 2) {
    return [
      { name: 'Large Cap / Flexi Cap', categories: ['EQ-LC', 'EQ-FLX', 'EQ-L&MC'], targetPercent: 100, maxFunds: 2 },
    ];
  }
  if (riskScore <= 3) {
    return [
      { name: 'Large Cap / Flexi Cap', categories: ['EQ-LC', 'EQ-FLX', 'EQ-L&MC', 'EQ-MLC'], targetPercent: 50, maxFunds: 1 },
      { name: 'Balanced / Multi-Asset', categories: ['HY-BH', 'HY-DAA', 'HY-MAA'], targetPercent: 30, maxFunds: 1 },
      { name: 'Value / ELSS', categories: ['EQ-VAL', 'EQ-ELSS', 'EQ-DIV Y'], targetPercent: 20, maxFunds: 1 },
    ];
  }
  // Aggressive (4-5)
  return [
    { name: 'Large Cap / Flexi Cap', categories: ['EQ-LC', 'EQ-FLX', 'EQ-L&MC', 'EQ-MLC'], targetPercent: 40, maxFunds: 1 },
    { name: 'Mid Cap', categories: ['EQ-MC', 'EQ-L&MC'], targetPercent: 30, maxFunds: 1 },
    { name: 'Small Cap / Sectoral', categories: ['EQ-SC', 'EQ-BANK', 'EQ-IT', 'EQ-Pharma', 'EQ-THEMATIC'], targetPercent: 30, maxFunds: 1 },
  ];
}

function getDebtBuckets(): AllocationBucket[] {
  return [
    { name: 'Corporate Bond', categories: ['DT-CB', 'DT-BK & PSU'], targetPercent: 50, maxFunds: 1 },
    { name: 'Short / Low Duration', categories: ['DT-SD', 'DT-LD', 'DT-USD', 'DT-LIQ'], targetPercent: 30, maxFunds: 1 },
    { name: 'Gilt / Banking PSU', categories: ['DT-GL', 'DT-Floater', 'DT-TM'], targetPercent: 20, maxFunds: 1 },
  ];
}

export function constructPortfolio(
  scoredFunds: ScoredFund[],
  riskCapacityScore: number,
  investmentAmount: number,
  monthlySip: number,
  goal: string,
  skipFundIds: Set<string> = new Set(),
): ConstructedPortfolio {
  const equityPercent = getEquityAllocation(riskCapacityScore);
  const debtPercent = 100 - equityPercent;

  const equityBuckets = getEquityBuckets(riskCapacityScore);
  const debtBuckets = getDebtBuckets();

  const allocations: PortfolioAllocation[] = [];
  const usedAmcs = new Map<string, number>();
  const usedIds = new Set<string>(skipFundIds);

  // Select funds for equity buckets
  for (const bucket of equityBuckets) {
    const bucketAllocationPercent = (equityPercent / 100) * bucket.targetPercent;
    const eligible = scoredFunds
      .filter(f => bucket.categories.includes((f.category || '').trim()) && !usedIds.has(f.id))
      .sort((a, b) => b.compositeScore - a.compositeScore);

    let count = 0;
    for (const fund of eligible) {
      if (count >= bucket.maxFunds) break;
      const amcCount = usedAmcs.get(fund.amc) || 0;
      if (amcCount >= 2) continue;

      allocations.push({
        fund,
        allocationPercent: Math.round(bucketAllocationPercent / bucket.maxFunds * 100) / 100,
        bucket: bucket.name,
      });
      usedIds.add(fund.id);
      usedAmcs.set(fund.amc, amcCount + 1);
      count++;
    }
  }

  // Select funds for debt buckets
  if (debtPercent > 0) {
    for (const bucket of debtBuckets) {
      const bucketAllocationPercent = (debtPercent / 100) * bucket.targetPercent;
      const eligible = scoredFunds
        .filter(f => bucket.categories.includes((f.category || '').trim()) && !usedIds.has(f.id))
        .sort((a, b) => b.compositeScore - a.compositeScore);

      let count = 0;
      for (const fund of eligible) {
        if (count >= bucket.maxFunds) break;
        const amcCount = usedAmcs.get(fund.amc) || 0;
        if (amcCount >= 2) continue;

        allocations.push({
          fund,
          allocationPercent: Math.round(bucketAllocationPercent / bucket.maxFunds * 100) / 100,
          bucket: bucket.name,
        });
        usedIds.add(fund.id);
        usedAmcs.set(fund.amc, amcCount + 1);
        count++;
      }
    }
  }

  // Normalize allocations to 100%
  const totalAlloc = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  if (totalAlloc > 0) {
    for (const a of allocations) {
      a.allocationPercent = Math.round((a.allocationPercent / totalAlloc) * 100 * 100) / 100;
    }
  }

  // Cap at max 40% per fund
  for (const a of allocations) {
    if (a.allocationPercent > 40) a.allocationPercent = 40;
  }
  // Re-normalize after cap
  const totalAfterCap = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  if (totalAfterCap > 0 && Math.abs(totalAfterCap - 100) > 0.5) {
    const factor = 100 / totalAfterCap;
    for (const a of allocations) {
      a.allocationPercent = Math.round(a.allocationPercent * factor * 100) / 100;
    }
  }

  // Compute portfolio metrics
  const expectedCagr = allocations.reduce((sum, a) => {
    const cagr = safeNum(a.fund.ret3Y ?? a.fund.cagr3Y);
    return sum + (cagr * a.allocationPercent / 100);
  }, 0);

  const expectedVolatility = allocations.reduce((sum, a) => {
    const vol = safeNum(a.fund.volatility) || safeNum(a.fund.stdDev);
    return sum + (vol * a.allocationPercent / 100);
  }, 0);

  const downsideRisk: 'low' | 'moderate' | 'high' =
    expectedVolatility < 5 ? 'low' : expectedVolatility < 12 ? 'moderate' : 'high';

  // SIP split
  const sipSplit = allocations.map(a => ({
    fundName: a.fund.name,
    amount: Math.round(monthlySip * a.allocationPercent / 100),
  }));

  // Reasons
  const reasons: string[] = [];
  reasons.push(`${equityPercent}% equity, ${debtPercent}% debt allocation based on your risk capacity`);
  if (riskCapacityScore <= 2) reasons.push('Conservative allocation prioritizes capital safety');
  if (riskCapacityScore >= 4) reasons.push('Growth-oriented allocation for long-term wealth creation');
  reasons.push(`${allocations.length} funds across ${new Set(allocations.map(a => a.bucket)).size} categories for diversification`);

  return {
    allocations,
    expectedCagr: Math.round(expectedCagr * 100) / 100,
    expectedVolatility: Math.round(expectedVolatility * 100) / 100,
    downsideRisk,
    rebalancingFrequency: 'Annual',
    sipSplit,
    reasons,
  };
}
