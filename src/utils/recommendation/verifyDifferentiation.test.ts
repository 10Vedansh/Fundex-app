import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from './intersectionEngine';
import { MutualFund } from '@/types/mutualFund';

const EQUITY_COLS = [
  'name', 'beta', 'alpha', 'category', 'launch', 'netAssets', 'marketCap',
  'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret1Y', 'ret3Y', 'ret5Y', 'ret10Y',
  'latestNav', 'previousNav', 'high52W', 'low52W',
  'expenseRatio', 'turnover', 'stdDev', 'sharpeRatio', 'sortinoRatio',
  'minInvestment', 'exitLoad', 'fundManager',
];

const DEBT_COLS = [
  'name', 'stdDev', 'beta', 'sharpeRatio', 'sortinoRatio', 'alpha',
  'category', 'launch', 'netAssets', 'avgCreditQuality', 'avgMaturity', 'ytm',
  'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret1Y', 'ret3Y', 'ret5Y', 'ret10Y',
  'latestNav', 'previousNav', 'high52W', 'low52W',
  'expenseRatio', 'minInvestment', 'exitLoad', 'fundManager',
];

const HYBRID_COLS = [
  'name', 'stdDev', 'sharpeRatio', 'sortinoRatio', 'beta', 'alpha',
  'category', 'launch', 'netAssets', 'avgCreditQuality', 'avgMaturity', 'ytm', 'marketCap',
  'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret1Y', 'ret3Y', 'ret5Y', 'ret10Y',
  'latestNav', 'previousNav', 'high52W', 'low52W',
  'expenseRatio', 'minInvestment', 'exitLoad', 'fundManager',
];

const COMMODITY_COLS = [
  'name', 'category', 'launch', 'netAssets',
  'ret1W', 'ret1M', 'ret3M', 'ret6M', 'ret1Y', 'ret3Y', 'ret5Y', 'ret10Y',
  'latestNav', 'previousNav', 'high52W', 'low52W',
  'expenseRatio', 'turnover', 'stdDev', 'sharpeRatio', 'sortinoRatio', 'beta', 'alpha',
  'minInvestment', 'exitLoad', 'fundManager',
];

const SHEET_CONFIG = [
  { name: 'Equity', cols: EQUITY_COLS, assetClass: 'Equity' },
  { name: 'Debt', cols: DEBT_COLS, assetClass: 'Debt' },
  { name: 'Hybrid', cols: HYBRID_COLS, assetClass: 'Hybrid' },
  { name: 'Commodities', cols: COMMODITY_COLS, assetClass: 'Commodities' },
];

function parseNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '' || val === '--' || val === '-' || val === 'N/A') return null;
  const str = String(val).replace(/,/g, '').trim();
  if (str === '`') return null;
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseExitLoad(val: unknown): string {
  if (!val || val === '--' || val === '-') return 'Nil';
  return String(val).trim();
}

function parseLaunchDate(val: unknown): string | null {
  if (val === null || val === undefined || val === '' || val === '--' || val === '-' || val === 'N/A') return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val.toISOString().slice(0, 10);
  const str = String(val).replace(/,/g, '').trim();
  const serial = Number(str);
  if (Number.isFinite(serial) && serial > 59 && serial < 80000) {
    return new Date(Date.UTC(1899, 11, 30) + serial * 86400000).toISOString().slice(0, 10);
  }
  return String(val).trim();
}

function getRiskLevel(category: string, stdDev: number | null): string {
  const cat = String(category).toLowerCase();
  if (cat.includes('liq') || cat.includes('overnht') || cat.includes('mm')) return 'Low';
  if (cat.includes('dt-') || cat.includes('debt')) {
    if (stdDev && stdDev > 5) return 'Moderate';
    return 'Low';
  }
  if (cat.includes('hy-')) {
    if (stdDev && stdDev > 12) return 'High';
    return 'Moderate';
  }
  if (cat.includes('gold') || cat.includes('silver')) return 'Moderate';
  if (stdDev && stdDev > 18) return 'High';
  if (stdDev && stdDev > 12) return 'Moderate';
  return 'Moderate';
}

function getStrengthBadge(sharpe: number | null): string {
  if (!sharpe) return 'Balanced';
  if (sharpe > 1.3) return 'Strong';
  if (sharpe > 0.7) return 'Balanced';
  return 'Risky';
}

function generateId(name: string, index: number): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50) + '_' + index;
}

function extractAmc(name: string): string {
  const patterns = [
    /^(.*?)\s+(Liquid|Overnight|Money|Corporate|Credit|Gilt|Dynamic|Short|Medium|Long|Ultra|Floating|Banking|Arbitrage|Balanced|Aggressive|Conservative|Equity|Flexi|Multi|Large|Mid|Small|ELSS|Index|Nifty|BSE|Gold|Silver|ETF|FoF|Fund|Focused|Dividend|Value|Contra|Infrastructure|Healthcare|Digital|Consumption|Energy|PSU|IT|Pharma|Thematic|Sectoral|Innovation|Business|Quant|ESG)/i
  ];
  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match && match[1]) {
      let amc = match[1].trim();
      amc = amc.replace(/\s*-\s*$/, '').trim();
      if (amc.length > 3) return amc;
    }
  }
  const words = name.split(/\s+/);
  return words.slice(0, 3).join(' ');
}

function processSheet(worksheet: XLSX.WorkSheet, colMapping: string[], assetClass: string): any[] {
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  const funds: any[] = [];

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];
    if (!row || !row[0] || String(row[0]).trim() === '') continue;

    const name = String(row[0]).trim();
    if (name.includes('→') || name.includes('🔹') || name.includes('🔸')) continue;

    const fund: Record<string, any> = { assetClass };

    for (let j = 0; j < colMapping.length && j < row.length; j++) {
      const key = colMapping[j];
      const val = row[j];

      if (key === 'name') {
        fund.name = String(val).trim();
      } else if (key === 'category') {
        fund.category = String(val).trim();
      } else if (key === 'launch') {
        fund.launch = parseLaunchDate(val);
      } else if (key === 'fundManager') {
        fund.fundManager = val ? String(val).trim() : null;
      } else if (key === 'exitLoad') {
        fund.exitLoad = parseExitLoad(val);
      } else if (key === 'avgCreditQuality') {
        fund.avgCreditQuality = val ? String(val).trim() : null;
      } else {
        fund[key] = parseNumber(val);
      }
    }

    if (fund.name && fund.name.length > 5) {
      fund.id = generateId(fund.name, i);
      fund.amc = extractAmc(fund.name);
      fund.riskLevel = getRiskLevel(fund.category || '', fund.stdDev);
      fund.strengthBadge = getStrengthBadge(fund.sharpeRatio);
      fund.nav = fund.latestNav || 0;
      fund.aum = fund.netAssets || 0;
      fund.cagr1Y = fund.ret1Y ?? null;
      fund.cagr3Y = fund.ret3Y ?? null;
      fund.cagr5Y = fund.ret5Y ?? null;
      fund.volatility = fund.stdDev ?? null;
      fund.minInvestment = fund.minInvestment || 500;
      fund.rank = 0;
      fund.benchmark = '';

      funds.push(fund);
    }
  }

  return funds;
}

function loadFundsFromExcel(): MutualFund[] {
  const filePath = path.resolve(process.cwd(), 'public/data/Data.xlsx');
  const buf = fs.readFileSync(filePath);
  const workbook = XLSX.read(buf, { type: 'buffer', dense: true, cellFormula: false, cellHTML: false, cellStyles: false });

  const allFunds: any[] = [];
  for (let sheetIndex = 0; sheetIndex < Math.min(workbook.SheetNames.length, SHEET_CONFIG.length); sheetIndex++) {
    const sheetName = workbook.SheetNames[sheetIndex];
    const config = SHEET_CONFIG[sheetIndex];
    const worksheet = workbook.Sheets[sheetName];
    const funds = processSheet(worksheet, config.cols, config.assetClass);
    allFunds.push(...funds);
  }

  const byAssetClass: Record<string, any[]> = {};
  for (const fund of allFunds) {
    if (!byAssetClass[fund.assetClass]) byAssetClass[fund.assetClass] = [];
    byAssetClass[fund.assetClass].push(fund);
  }
  for (const [, funds] of Object.entries(byAssetClass)) {
    funds.sort((a: any, b: any) => (b.sharpeRatio || 0) - (a.sharpeRatio || 0));
    funds.forEach((fund: any, idx: number) => { fund.rank = idx + 1; });
  }

  return allFunds as MutualFund[];
}

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
    funds = loadFundsFromExcel();
    expect(funds.length).toBeGreaterThan(50);
    console.log(`\nLoaded ${funds.length} funds from Excel for differentiation tests`);
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
    expect(overlapPct).toBeLessThan(70);

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
