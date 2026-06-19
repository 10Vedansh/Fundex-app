import { describe, it, expect } from 'vitest';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from './intersectionEngine';
import { normalizeAmcName, EXCLUDED_FUND_NAMES, getAllocationModel, BUSINESS_EXCLUDED_CATEGORIES } from './categoryMappings';
import { MOCK_FUNDS } from './mockFundUniverse';

function getBucketLabel(category: string, risk: string, goal: string): string {
  if (risk === 'aggressive') {
    const model = getAllocationModel('aggressive', goal);
    for (const b of model) {
      if (b.categories.includes(category)) {
        const label = b.categories.join('/');
        return label;
      }
    }
    return 'fill-remaining';
  }
  if (risk === 'moderate') {
    const model = getAllocationModel('moderate', goal);
    for (const b of model) {
      if (b.categories.includes(category)) {
        return b.categories.join('/');
      }
    }
    return 'fill-remaining';
  }
  if (risk === 'conservative') {
    const model = getAllocationModel('conservative', goal);
    for (const b of model) {
      if (b.categories.includes(category)) {
        return b.categories.join('/');
      }
    }
    return 'fill-remaining';
  }
  return 'unknown';
}

describe('FIX VALIDATION - Full Portfolio Output', () => {
  const funds = MOCK_FUNDS;

  it('should print Aggressive portfolio details', () => {
    const prefs: RecommendationPreferences = {
      riskTolerance: 'aggressive',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'long',
      experienceLevel: 'experienced',
      investmentAmount: 'medium',
    };
    const result = recommendFundsV2(funds, prefs);
    expect(result.length).toBeGreaterThanOrEqual(7);
    expect(result.length).toBeLessThanOrEqual(11);

    console.log('\n' + '='.repeat(70));
    console.log('AGGRESSIVE');
    console.log('='.repeat(70));

    result.forEach((f, i) => {
      const bucket = getBucketLabel(f.category, 'aggressive', 'wealth_creation');
      const normAmc = normalizeAmcName(f.amc);
      console.log(`\n  ${i + 1}. ${f.name}`);
      console.log(`     Category: ${f.category}`);
      console.log(`     AMC: ${f.amc} (normalized: ${normAmc})`);
      console.log(`     Score: ${f.compositeScore}`);
      console.log(`     Bucket: ${bucket}`);
    });

    console.log('\n  Category counts:');
    const catCounts: Record<string, number> = {};
    for (const f of result) {
      catCounts[f.category] = (catCounts[f.category] || 0) + 1;
    }
    for (const [cat, count] of Object.entries(catCounts)) {
      console.log(`    ${cat}=${count}`);
    }

    console.log('\n  AMC counts:');
    const amcCounts: Record<string, number> = {};
    for (const f of result) {
      const norm = normalizeAmcName(f.amc);
      amcCounts[norm] = (amcCounts[norm] || 0) + 1;
    }
    for (const [amc, count] of Object.entries(amcCounts)) {
      console.log(`    ${amc} -> ${count}`);
    }
  });

  it('should print Retirement portfolio details', () => {
    const prefs: RecommendationPreferences = {
      riskTolerance: 'moderate',
      investmentGoal: 'retirement',
      investmentHorizon: 'long',
      experienceLevel: 'intermediate',
      investmentAmount: 'medium',
    };
    const result = recommendFundsV2(funds, prefs);
    expect(result.length).toBeGreaterThanOrEqual(7);

    console.log('\n' + '='.repeat(70));
    console.log('RETIREMENT');
    console.log('='.repeat(70));

    result.forEach((f, i) => {
      const bucket = getBucketLabel(f.category, 'moderate', 'retirement');
      const normAmc = normalizeAmcName(f.amc);
      console.log(`\n  ${i + 1}. ${f.name}`);
      console.log(`     Category: ${f.category}`);
      console.log(`     AMC: ${f.amc} (normalized: ${normAmc})`);
      console.log(`     Score: ${f.compositeScore}`);
      console.log(`     Bucket: ${bucket}`);
    });

    const bAdv = result.filter(f => f.category === 'HY-DAA').length;
    const flexi = result.filter(f => ['EQ-FLX', 'EQ-MLC'].includes(f.category)).length;
    const lc = result.filter(f => f.category === 'EQ-LC').length;
    const val = result.filter(f => f.category === 'EQ-VAL').length;
    const ch = result.filter(f => f.category === 'HY-CH').length;
    const debt = result.filter(f => f.category.startsWith('DT-')).length;
    const arb = result.filter(f => f.category === 'HY-AR').length;
    const eqs = result.filter(f => f.category === 'HY-EQ S').length;

    console.log('\n  Bucket counts:');
    console.log(`    Balanced Advantage (HY-DAA): ${bAdv}`);
    console.log(`    Flexi Cap (EQ-FLX/MLC): ${flexi}`);
    console.log(`    Large Cap (EQ-LC): ${lc}`);
    console.log(`    Value (EQ-VAL): ${val}`);
    console.log(`    Conservative Hybrid (HY-CH): ${ch}`);
    console.log(`    Debt (DT-*): ${debt}`);
    console.log(`    Arbitrage (HY-AR): ${arb}`);
    console.log(`    Equity Savings (HY-EQ S): ${eqs}`);
  });

  it('should print Capital Preservation portfolio details', () => {
    const prefs: RecommendationPreferences = {
      riskTolerance: 'conservative',
      investmentGoal: 'capital_preservation',
      investmentHorizon: 'short',
      experienceLevel: 'beginner',
      investmentAmount: 'medium',
    };
    const result = recommendFundsV2(funds, prefs);
    expect(result.length).toBeGreaterThanOrEqual(7);

    console.log('\n' + '='.repeat(70));
    console.log('CAPITAL PRESERVATION');
    console.log('='.repeat(70));

    result.forEach((f, i) => {
      const normAmc = normalizeAmcName(f.amc);
      console.log(`\n  ${i + 1}. ${f.name}`);
      console.log(`     Category: ${f.category}`);
      console.log(`     AMC: ${f.amc} (normalized: ${normAmc})`);
      console.log(`     Score: ${f.compositeScore}`);
    });
  });

  it('should validate all constraints across all profiles', () => {
    const profiles: { label: string; prefs: RecommendationPreferences }[] = [
      {
        label: 'AGGRESSIVE',
        prefs: { riskTolerance: 'aggressive', investmentGoal: 'wealth_creation', investmentHorizon: 'long', experienceLevel: 'experienced', investmentAmount: 'medium' },
      },
      {
        label: 'RETIREMENT',
        prefs: { riskTolerance: 'moderate', investmentGoal: 'retirement', investmentHorizon: 'long', experienceLevel: 'intermediate', investmentAmount: 'medium' },
      },
      {
        label: 'CAPITAL_PRESERVATION',
        prefs: { riskTolerance: 'conservative', investmentGoal: 'capital_preservation', investmentHorizon: 'short', experienceLevel: 'beginner', investmentAmount: 'medium' },
      },
    ];

    console.log('\n' + '='.repeat(70));
    console.log('VALIDATION');
    console.log('='.repeat(70));

    let allPass = true;

    for (const profile of profiles) {
      const result = recommendFundsV2(funds, profile.prefs);
      const label = profile.label;

      console.log(`\n  --- ${label} ---`);

      // 1. AMC cap
      const amcCounts: Record<string, number> = {};
      for (const f of result) {
        const norm = normalizeAmcName(f.amc);
        amcCounts[norm] = (amcCounts[norm] || 0) + 1;
      }
      let amcFail = false;
      for (const [amc, count] of Object.entries(amcCounts)) {
        if (count > 2) {
          console.log(`  [FAIL] AMC ${amc} has ${count} funds (max 2)`);
          amcFail = true;
          allPass = false;
        }
      }
      if (!amcFail) console.log(`  [PASS] 1. No AMC > 2`);

      // 2. Child fund check
      const childFund = result.find(f =>
        EXCLUDED_FUND_NAMES.some(ex => f.name.toLowerCase().includes(ex))
      );
      if (childFund) {
        console.log(`  [FAIL] 2. Child fund present: ${childFund.name}`);
        allPass = false;
      } else {
        console.log(`  [PASS] 2. No child fund present`);
      }

      // 3. Gold fund check
      const goldFund = result.find(f =>
        f.category.toLowerCase().includes('gold') || f.name.toLowerCase().includes('gold')
      );
      if (goldFund) {
        console.log(`  [FAIL] 3. Gold fund present: ${goldFund.name}`);
        allPass = false;
      } else {
        console.log(`  [PASS] 3. No gold fund present`);
      }

      // 4. International fund check
      const intlFund = result.find(f =>
        BUSINESS_EXCLUDED_CATEGORIES.some(ex =>
          f.category.startsWith(ex) || f.category === ex
        )
      );
      if (intlFund) {
        console.log(`  [FAIL] 4. International fund present: ${intlFund.name}`);
        allPass = false;
      } else {
        console.log(`  [PASS] 4. No international fund present`);
      }

      // 5. Retirement arbitrage check
      if (label === 'RETIREMENT') {
        const arb = result.filter(f => f.category === 'HY-AR').length;
        if (arb > 1) {
          console.log(`  [FAIL] 5. Retirement has ${arb} arbitrage funds (max 1)`);
          allPass = false;
        } else {
          console.log(`  [PASS] 5. Retirement arbitrage count = ${arb} (max 1)`);
        }
      }

      // 6. Aggressive must have Mid Cap
      if (label === 'AGGRESSIVE') {
        const hasMC = result.some(f => f.category === 'EQ-MC');
        if (!hasMC) {
          console.log(`  [FAIL] 6. Aggressive portfolio missing Mid Cap (EQ-MC)`);
          allPass = false;
        } else {
          console.log(`  [PASS] 6. Aggressive has Mid Cap`);
        }

        // 7. Aggressive must have Flexi Cap
        const hasFLX = result.some(f => ['EQ-FLX', 'EQ-MLC'].includes(f.category));
        if (!hasFLX) {
          console.log(`  [FAIL] 7. Aggressive portfolio missing Flexi Cap (EQ-FLX/MLC)`);
          allPass = false;
        } else {
          console.log(`  [PASS] 7. Aggressive has Flexi Cap`);
        }
      }
    }

    expect(allPass).toBe(true);
  });
});
