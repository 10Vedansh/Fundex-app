export type FundCategory = 'Equity' | 'Debt' | 'Hybrid' | 'Index' | 'Liquid';
export type AssetClass = 'Equity' | 'Debt' | 'Hybrid' | 'Commodities';
export type RiskLevel = 'Low' | 'Moderate' | 'High';
export type StrengthBadge = 'Strong' | 'Balanced' | 'Risky';
export type RiskProfile = 'Conservative' | 'Moderate' | 'Aggressive';

export interface MutualFund {
  id: string;
  name: string;
  category: string; // Original workbook category code (EQ-LC, DT-LIQ, HY-AH, etc.)
  assetClass?: AssetClass;
  amc: string;
  nav: number;
  aum: number; // Net Assets in crores
  expenseRatio: number;
  cagr1Y: number;
  cagr3Y: number;
  cagr5Y: number;
  volatility: number;
  sharpeRatio: number;
  beta: number;
  alpha: number;
  rank: number;
  strengthBadge: StrengthBadge;
  riskLevel: RiskLevel;
  minInvestment: number;
  exitLoad: string;
  benchmark: string;

  // Extended workbook fields
  launch?: string | number | Date | null;
  marketCap?: number | null;
  latestNav?: number | null;
  previousNav?: number | null;
  high52W?: number | null;
  low52W?: number | null;
  turnover?: number | null;
  stdDev?: number | null;
  sortinoRatio?: number | null;
  infoRatio?: number | null;
  rSquared?: number | null;
  fundManager?: string | null;

  // Granular return periods
  ret1W?: number | null;
  ret1M?: number | null;
  ret3M?: number | null;
  ret6M?: number | null;
  ret1Y?: number | null;
  ret3Y?: number | null;
  ret5Y?: number | null;
  ret10Y?: number | null;

  // Debt/Hybrid specific
  avgCreditQuality?: string | null;
  avgMaturity?: number | null;
  ytm?: number | null;

  // Backward compat
  netAssets?: number | null;
}

export interface SectorAllocation {
  sector: string;
  percentage: number;
  color: string;
}

export interface FundSectorData {
  fundId: string;
  fundName: string;
  sectors: SectorAllocation[];
}

export interface AIInsight {
  fundId: string;
  insight: string;
  rationale: string;
}

export interface FundRecommendation {
  fund: MutualFund;
  insight: AIInsight;
  matchScore: number;
}

export const CATEGORY_COLORS: Record<string, string> = {
  Equity: 'hsl(217, 91%, 60%)',
  Debt: 'hsl(142, 71%, 45%)',
  Hybrid: 'hsl(38, 92%, 50%)',
  Index: 'hsl(265, 83%, 67%)',
  Liquid: 'hsl(173, 80%, 40%)',
  Commodities: 'hsl(45, 93%, 47%)',
};

export const SECTOR_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(265, 83%, 67%)',
  'hsl(173, 80%, 40%)',
  'hsl(340, 82%, 52%)',
  'hsl(45, 93%, 47%)',
  'hsl(200, 98%, 39%)',
  'hsl(291, 64%, 42%)',
  'hsl(16, 100%, 66%)',
];

// Category code to human-readable mapping
export const CATEGORY_LABELS: Record<string, string> = {
  // Equity
  'EQ-LC': 'Large Cap',
  'EQ-MC': 'Mid Cap',
  'EQ-SC': 'Small Cap',
  'EQ-L&MC': 'Large & Mid Cap',
  'EQ-MLC': 'Multi Cap',
  'EQ-FLX': 'Flexi Cap',
  'EQ-VAL': 'Value',
  'EQ-Quant': 'Quant',
  'EQ-ELSS': 'ELSS (Tax Saving)',
  'EQ-DIV Y': 'Dividend Yield',
  'EQ-BANK': 'Banking & Financial',
  'EQ-IT': 'IT & Technology',
  'EQ-Pharma': 'Pharma & Healthcare',
  'EQ-INFRA': 'Infrastructure',
  'EQ-PSU': 'PSU',
  'EQ-Energy': 'Energy',
  'EQ-Consumption': 'Consumption',
  'EQ-THEMATIC': 'Thematic',
  'EQ-SA&T': 'Sectoral',
  'EQ-INTL': 'International',
  'EQ-TBC': 'Business Cycle',
  'EQ-Manufacturing': 'Manufacturing',
  'EQ-Innovation': 'Innovation',
  'EQ-T-ESG': 'ESG',
  // Debt
  'DT-LIQ': 'Liquid',
  'DT-USD': 'Ultra Short Duration',
  'DT-SD': 'Short Duration',
  'DT-MD': 'Medium Duration',
  'DT-LONG D': 'Long Duration',
  'DT-M to LD': 'Medium to Long',
  'DT-CB': 'Corporate Bond',
  'DT-CR': 'Credit Risk',
  'DT-GL': 'Gilt',
  'DT-DB': 'Dynamic Bond',
  'DT-OVERNHT': 'Overnight',
  'DT-MM': 'Money Market',
  'DT-LD': 'Low Duration',
  'DT-BK & PSU': 'Banking & PSU',
  'DT-Floater': 'Floating Rate',
  'DT-TM': 'Target Maturity',
  'DT-Gilt 10Y CD': 'Gilt 10Y',
  // Hybrid
  'HY-AH': 'Aggressive Hybrid',
  'HY-CH': 'Conservative Hybrid',
  'HY-DAA': 'Balanced Advantage',
  'HY-AR': 'Arbitrage',
  'HY-MAA': 'Multi Asset Allocation',
  'HY-EQ S': 'Equity Savings',
  'HY-BH': 'Balanced Hybrid',
  'HY-IPA': 'Income Plus Arbitrage',
  // Commodities
  'Gold-Funds': 'Gold Funds',
  'Silver-Funds': 'Silver Funds',
};
