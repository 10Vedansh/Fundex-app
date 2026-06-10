import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from './intersectionEngine';
import { normalizeAmcName, EXCLUDED_FUND_NAMES, getAllocationModel, BUSINESS_EXCLUDED_CATEGORIES } from './categoryMappings';

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

function loadFundsFromExcel(): any[] {
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

  return allFunds;
}

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
  const funds = loadFundsFromExcel();

  it('should print Aggressive portfolio details', () => {
    const prefs: RecommendationPreferences = {
      riskTolerance: 'aggressive',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'long',
      experienceLevel: 'experienced',
      investmentAmount: 'medium',
    };
    const result = recommendFundsV2(funds, prefs);
    expect(result).toHaveLength(9);

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
    expect(result).toHaveLength(9);

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
    expect(result).toHaveLength(9);

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
