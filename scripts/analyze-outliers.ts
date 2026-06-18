import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

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
      } else {
        fund[key] = parseNumber(val);
      }
    }

    if (fund.name && fund.name.length > 5) {
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

  return allFunds;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function analyze() {
  const allFunds = loadFundsFromExcel();

  const sheetCounts: Record<string, number> = {};
  for (const fund of allFunds) {
    if (!sheetCounts[fund.assetClass]) sheetCounts[fund.assetClass] = 0;
    sheetCounts[fund.assetClass]++;
  }

  console.log('=' .repeat(70));
  console.log('  OUTLIER ANALYSIS REPORT - ALL METRICS');
  console.log('=' .repeat(70));
  console.log();
  console.log(`Total funds loaded: ${allFunds.length}`);
  console.log();
  console.log('Per-sheet fund counts:');
  for (const [sheet, count] of Object.entries(sheetCounts)) {
    console.log(`  ${sheet}: ${count}`);
  }
  console.log();

  const metrics: { key: string; label: string; col: string; thresholds: { label: string; min?: number; max?: number }[]; computeMedian?: boolean }[] = [
    {
      key: 'ret1Y', label: 'cagr_1y (ret1Y)', col: 'ret1Y',
      thresholds: [{ label: 'count > 5', min: 5 }, { label: 'count < -1', max: -1 }],
      computeMedian: true,
    },
    {
      key: 'ret3Y', label: 'cagr_3y (ret3Y)', col: 'ret3Y',
      thresholds: [{ label: 'count > 5', min: 5 }, { label: 'count < -1', max: -1 }],
      computeMedian: true,
    },
    {
      key: 'ret5Y', label: 'cagr_5y (ret5Y)', col: 'ret5Y',
      thresholds: [{ label: 'count > 5', min: 5 }, { label: 'count < -1', max: -1 }],
      computeMedian: true,
    },
    {
      key: 'sharpeRatio', label: 'sharpeRatio', col: 'sharpeRatio',
      thresholds: [{ label: 'count > 10', min: 10 }, { label: 'count < -10', max: -10 }],
    },
    {
      key: 'sortinoRatio', label: 'sortinoRatio', col: 'sortinoRatio',
      thresholds: [{ label: 'count > 20', min: 20 }, { label: 'count < -20', max: -20 }],
    },
    {
      key: 'stdDev', label: 'volatility_1y (stdDev)', col: 'stdDev',
      thresholds: [{ label: 'count > 0.5', min: 0.5 }, { label: 'count > 1.0', min: 1.0 }],
    },
    {
      key: 'expenseRatio', label: 'expenseRatio', col: 'expenseRatio',
      thresholds: [{ label: 'count > 0.05 (5%)', min: 0.05 }, { label: 'count > 0.10 (10%)', min: 0.10 }],
    },
    {
      key: 'alpha', label: 'alpha', col: 'alpha',
      thresholds: [{ label: 'count > 50', min: 50 }, { label: 'count < -50', max: -50 }],
    },
    {
      key: 'beta', label: 'beta', col: 'beta',
      thresholds: [{ label: 'count > 3', min: 3 }, { label: 'count < -3', max: -3 }],
    },
  ];

  for (const metric of metrics) {
    const values: number[] = [];
    let nullCount = 0;

    for (const fund of allFunds) {
      const v = fund[metric.col];
      if (v === null || v === undefined) {
        nullCount++;
      } else {
        values.push(v);
      }
    }

    console.log(('-'.repeat(70)));
    console.log(`  ${metric.label}`);
    console.log(('-'.repeat(70)));

    const avg = mean(values);
    const minVal = values.length > 0 ? Math.min(...values) : 0;
    const maxVal = values.length > 0 ? Math.max(...values) : 0;
    const med = metric.computeMedian ? median(values) : undefined;

    console.log(`    Total non-null values: ${values.length}`);
    console.log(`    NULL/missing count:    ${nullCount}`);
    console.log(`    Mean:                  ${avg.toFixed(4)}`);
    console.log(`    Min:                   ${minVal.toFixed(4)}`);
    console.log(`    Max:                   ${maxVal.toFixed(4)}`);
    if (med !== undefined) {
      console.log(`    Median:                ${med.toFixed(4)}`);
    }

    for (const t of metric.thresholds) {
      let count: number;
      if (t.min !== undefined) {
        count = values.filter(v => v > t.min!).length;
      } else if (t.max !== undefined) {
        count = values.filter(v => v < t.max!).length;
      } else {
        count = 0;
      }
      console.log(`    ${t.label}:            ${count}`);
    }

    console.log();
  }

  console.log('=' .repeat(70));
  console.log('  END OF REPORT');
  console.log('=' .repeat(70));
}

analyze();
