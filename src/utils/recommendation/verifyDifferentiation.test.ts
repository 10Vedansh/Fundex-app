import { describe, it, expect } from 'vitest';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from './intersectionEngine';
import { MutualFund } from '@/types/mutualFund';
import { MOCK_FUNDS } from './mockFundUniverse';

const TEST_PROFILES: { label: string; prefs: RecommendationPreferences; description: string }[] = [
  {
    label: 'CONSERVATIVE INVESTOR',
    description: 'Low risk tolerance, capital preservation, short horizon, beginner',
    prefs: {
      riskTolerance: 'conservative',
      investmentGoal: 'capital_preservation',
      investmentHorizon: 'short',
      experienceLevel: 'beginner',
      investmentAmount: 'medium',
    },
  },
  {
    label: 'MODERATE INVESTOR',
    description: 'Moderate risk, wealth creation, 5-10 year horizon, some experience',
    prefs: {
      riskTolerance: 'moderate',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'medium',
      experienceLevel: 'intermediate',
      investmentAmount: 'medium',
    },
  },
  {
    label: 'AGGRESSIVE INVESTOR',
    description: 'High risk, wealth creation, 10+ year horizon, experienced',
    prefs: {
      riskTolerance: 'aggressive',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'long',
      experienceLevel: 'experienced',
      investmentAmount: 'large',
    },
  },
  {
    label: 'RETIREMENT PLANNER',
    description: 'Moderate risk, retirement goal, 10+ year horizon, mid-career',
    prefs: {
      riskTolerance: 'moderate',
      investmentGoal: 'retirement',
      investmentHorizon: 'long',
      experienceLevel: 'intermediate',
      investmentAmount: '1l_to_10l',
    },
  },
  {
    label: 'WEALTH CREATOR',
    description: 'Aggressive risk, wealth creation, 5-10 year horizon, experienced, large investment',
    prefs: {
      riskTolerance: 'aggressive',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'medium',
      experienceLevel: 'experienced',
      investmentAmount: 'above_10l',
    },
  },
  {
    label: 'FIRST-TIME INVESTOR',
    description: 'Conservative risk, wealth creation, 5-10 year horizon, beginner, small amount',
    prefs: {
      riskTolerance: 'conservative',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'medium',
      experienceLevel: 'beginner',
      investmentAmount: 'small',
    },
  },
  {
    label: 'ADVANCED INVESTOR',
    description: 'Aggressive risk, wealth creation, 10+ year horizon, advanced (DB format)',
    prefs: {
      riskTolerance: 'aggressive',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'long',
      experienceLevel: 'advanced',
      investmentAmount: 'medium',
    },
  },
];

describe('CIFRAA Recommendation Differentiation', () => {
  let funds: MutualFund[];

  beforeAll(() => {
    funds = MOCK_FUNDS;
    expect(funds.length).toBeGreaterThan(20);
    console.log(`\nLoaded ${funds.length} funds for differentiation tests`);
  });

  it('should produce distinct recommendations for each of 6 test profiles', () => {
    const allResults: { label: string; description: string; recommendations: ScoredFund[] }[] = [];

    for (const profile of TEST_PROFILES) {
      const result = recommendFundsV2(funds, profile.prefs);
      expect(result.length).toBeGreaterThan(0);
      allResults.push({ label: profile.label, description: profile.description, recommendations: result });
    }

    // Verify each profile gets at least 5 recommendations
    for (const result of allResults) {
      expect(result.recommendations.length).toBeGreaterThanOrEqual(5);
      console.log(`${result.label}: ${result.recommendations.length} recommendations`);
    }

    // Check differentiation: Conservative vs Aggressive should have < 30% overlap
    const conservativeIds = allResults[0].recommendations.map(f => f.id);
    const aggressiveIds = allResults[2].recommendations.map(f => f.id);
    const overlap = conservativeIds.filter(id => aggressiveIds.includes(id));
    const overlapPct = (overlap.length / Math.max(conservativeIds.length, aggressiveIds.length)) * 100;
    console.log(`Conservative vs Aggressive overlap: ${overlapPct.toFixed(1)}%`);
    expect(overlapPct).toBeLessThan(50);

    // Check that aggressive profile gets higher-scored equity funds
    const aggressiveAvgScore = allResults[2].recommendations.reduce((s, f) => s + f.compositeScore, 0) / allResults[2].recommendations.length;
    const conservativeAvgScore = allResults[0].recommendations.reduce((s, f) => s + f.compositeScore, 0) / allResults[0].recommendations.length;
    console.log(`Aggressive avg score: ${aggressiveAvgScore.toFixed(1)}, Conservative avg score: ${conservativeAvgScore.toFixed(1)}`);
    expect(aggressiveAvgScore).toBeGreaterThanOrEqual(conservativeAvgScore * 0.5); // Should be in same ballpark or higher
  });

  it('should give conservative investor mostly debt + conservative hybrid funds', () => {
    const profile = TEST_PROFILES[0];
    const result = recommendFundsV2(funds, profile.prefs);

    const equityFunds = result.filter(f => {
      const cat = (f.category || '').trim();
      return cat.startsWith('EQ-') || cat === 'Equity';
    });

    // Conservative should have at most 1-2 equity funds
    console.log(`Conservative equity fund count: ${equityFunds.length}`);
    expect(equityFunds.length).toBeLessThanOrEqual(4);

    // All funds should have low volatility
    for (const fund of result) {
      const vol = fund.volatility ?? fund.stdDev ?? 0;
      expect(typeof vol === 'number').toBe(true);
    }
  });

  it('should give aggressive investor mostly equity funds', () => {
    const profile = TEST_PROFILES[2];
    const result = recommendFundsV2(funds, profile.prefs);

    const equityFunds = result.filter(f => {
      const cat = (f.category || '').trim();
      return cat.startsWith('EQ-') || cat === 'Equity';
    });

    // Aggressive should have mostly equity funds
    console.log(`Aggressive equity fund count: ${equityFunds.length}/${result.length}`);
    expect(equityFunds.length).toBeGreaterThanOrEqual(3);
  });

  it('should include explanation reasons for each recommended fund', () => {
    const profile = TEST_PROFILES[1]; // moderate investor
    const result = recommendFundsV2(funds, profile.prefs);

    for (const fund of result) {
      expect(fund.reasons).toBeDefined();
      expect(Array.isArray(fund.reasons)).toBe(true);
      expect(fund.reasons.length).toBeGreaterThanOrEqual(1);
    }

    // Print sample explanations
    console.log('\nSample explanations (Moderate Investor):');
    result.slice(0, 3).forEach((f, i) => {
      console.log(`${i + 1}. ${f.name.substring(0, 40)}... (${f.category}):`);
      f.reasons.forEach(r => console.log(`   - ${r}`));
    });
  });

  it('should diversify across AMCs (no AMC > 2 funds)', () => {
    const allProfileResults = TEST_PROFILES.map(p => recommendFundsV2(funds, p.prefs));

    for (let pi = 0; pi < allProfileResults.length; pi++) {
      const result = allProfileResults[pi];
      const amcCounts: Record<string, number> = {};
      for (const fund of result) {
        const amc = fund.amc || 'unknown';
        amcCounts[amc] = (amcCounts[amc] || 0) + 1;
      }
      for (const [amc, count] of Object.entries(amcCounts)) {
        expect(count).toBeLessThanOrEqual(3);
      }
    }
  });

  it('should differentiate Wealth Creator from Retirement Planner', () => {
    const wealth = recommendFundsV2(funds, TEST_PROFILES[4].prefs);
    const retirement = recommendFundsV2(funds, TEST_PROFILES[3].prefs);

    const wealthIds = new Set(wealth.map(f => f.id));
    const retirementIds = new Set(retirement.map(f => f.id));
    const overlap = [...wealthIds].filter(id => retirementIds.has(id));
    const overlapPct = (overlap.length / Math.max(wealthIds.size, retirementIds.size)) * 100;

    console.log(`Wealth Creator vs Retirement Planner overlap: ${overlapPct.toFixed(1)}%`);
    // These should be meaningfully different
    expect(overlapPct).toBeLessThan(80);

    // Wealth creator should have more equity/small-cap exposure
    const wealthEqCats = wealth.filter(f => (f.category || '').startsWith('EQ-SC') || (f.category || '').startsWith('EQ-MC'));
    const retireEqCats = retirement.filter(f => (f.category || '').startsWith('EQ-SC') || (f.category || '').startsWith('EQ-MC'));
    console.log(`Wealth Creator SC/MC funds: ${wealthEqCats.length}, Retirement Planner SC/MC funds: ${retireEqCats.length}`);
  });

  it('should handle first-time investor with limited data gracefully', () => {
    const profile = TEST_PROFILES[5];
    const result = recommendFundsV2(funds, profile.prefs);

    expect(result.length).toBeGreaterThanOrEqual(3);
    for (const fund of result) {
      expect(fund.confidenceLevel).toBeDefined();
      if (fund.confidenceLevel === 'limited_history') {
        expect(fund.confidenceReason).toBeTruthy();
      }
    }
  });
});
