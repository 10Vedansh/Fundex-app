import { describe, it, beforeAll } from 'vitest';
import { fetchFundMasterFunds } from '@/utils/fundMasterAdapter';
import { recommendFundsV2 } from './intersectionEngine';
import { toCategoryCode } from './categoryMappings';

function getAssetClass(cat: string): string {
  if (!cat) return 'Unknown';
  if (cat.startsWith('EQ-') || cat === 'Index') return 'EQUITY';
  if (cat.startsWith('DT-')) return 'DEBT';
  if (cat.startsWith('HY-')) return 'HYBRID';
  if (cat.includes('Gold') || cat.includes('Silver')) return 'GOLD';
  return 'OTHER';
}

describe('PHASE 1: Portfolio Verification After Corrections', () => {
  let funds: any[];

  beforeAll(async () => {
    const result = await fetchFundMasterFunds({ perPage: 100000, activeOnly: false });
    funds = result.funds;
    console.log(`Loaded ${funds.length} funds`);
  }, 120000);

  function auditPortfolio(label: string, portfolio: any[]) {
    console.log(`\n${'='.repeat(120)}`);
    console.log(`  ${label}`);
    console.log(`${'='.repeat(120)}`);
    
    const alloc: Record<string, { count: number; funds: string[] }> = {};
    for (const f of portfolio) {
      const cc = toCategoryCode(f.category || '');
      const ac = getAssetClass(cc);
      if (!alloc[ac]) alloc[ac] = { count: 0, funds: [] };
      alloc[ac].count++;
      alloc[ac].funds.push(`${f.name?.substring(0, 50)} (${cc})`);
    }

    for (const [ac, info] of Object.entries(alloc).sort()) {
      const pct = (info.count / portfolio.length * 100).toFixed(1);
      console.log(`  ${ac.padEnd(12)} ${String(info.count).padEnd(4)}/9 = ${pct.padEnd(5)}%`);
      for (const f of info.funds) {
        console.log(`    • ${f}`);
      }
    }
  }

  it('1C: Retirement (moderate) portfolio after corrections', () => {
    const portfolio = recommendFundsV2(funds, {
      riskTolerance: 'moderate',
      investmentGoal: 'retirement',
      investmentHorizon: 'medium',
      experienceLevel: 'intermediate',
      investmentAmount: 500000,
      includeExisting: true,
    });
    auditPortfolio('RETIREMENT (moderate) — POST-CORRECTION', portfolio);
  }, 180000);

  it('1D: Aggressive Growth portfolio after corrections', () => {
    const portfolio = recommendFundsV2(funds, {
      riskTolerance: 'aggressive',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'long',
      experienceLevel: 'experienced',
      investmentAmount: 500000,
      includeExisting: true,
    });
    auditPortfolio('AGGRESSIVE GROWTH — POST-CORRECTION', portfolio);
  }, 180000);

  it('1E: Capital Preservation portfolio after corrections', () => {
    const portfolio = recommendFundsV2(funds, {
      riskTolerance: 'conservative',
      investmentGoal: 'capital_preservation',
      investmentHorizon: 'short',
      experienceLevel: 'beginner',
      investmentAmount: 500000,
      includeExisting: true,
    });
    auditPortfolio('CAPITAL PRESERVATION — POST-CORRECTION', portfolio);
  }, 180000);
});
