import { describe, it, beforeAll } from 'vitest';
import { fetchFundMasterFunds } from '@/utils/fundMasterAdapter';
import { toCategoryCode } from './categoryMappings';
import { applyGoalEligibility } from './intersectionEngine';

describe('Debug retirement eligibility', () => {
  let funds: any[];

  beforeAll(async () => {
    const result = await fetchFundMasterFunds({ perPage: 100000, activeOnly: false });
    funds = result.funds;
  }, 120000);

  it('Check Eq funds passing retirement filter', () => {
    // Count EQ funds by category
    const eqCats = ['EQ-LC', 'EQ-FLX', 'EQ-MLC', 'EQ-MC', 'EQ-VAL'];
    for (const cat of eqCats) {
      // Just count how many funds have this category code
      const matching = funds.filter(f => toCategoryCode(f.category || '') === cat);
      console.log(`  ${cat}: ${matching.length} total`);
      
      // Check a few sample volatilities
      const withVol = matching.filter(f => f.volatility != null && f.volatility !== 0);
      const volValues = withVol.map(f => f.volatility).sort((a, b) => a - b);
      if (volValues.length > 5) {
        const p25 = volValues[Math.floor(volValues.length * 0.25)];
        const p50 = volValues[Math.floor(volValues.length * 0.50)];
        const p75 = volValues[Math.floor(volValues.length * 0.75)];
        console.log(`    vol percentiles: p25=${p25?.toFixed(1)} p50=${p50?.toFixed(1)} p75=${p75?.toFixed(1)}`);
        console.log(`    funds with vol <= 18: ${volValues.filter(v => v <= 18).length}/${volValues.length}`);
      }
    }
    
    // Also check how many EQ funds pass ALL filters
    console.log(`\n  Checking intersectionEngine.applyGoalEligibility...`);
    // Let's check volatility of the current portfolio's equity funds
    const portfolioFunds = [
      'Nippon India Nifty AAA CPSE Bond Plus SDL',
      'ICICI Prudential Value Fund',
    ];
    for (const f of funds) {
      if (f.name?.includes('ICICI Prudential Value Fund - Direct Plan')) {
        console.log(`\n  ICICI Value Fund volatility: ${f.volatility}`);
        console.log(`  Category: ${f.category} → ${toCategoryCode(f.category || '')}`);
        break;
      }
    }
  }, 60000);
});
