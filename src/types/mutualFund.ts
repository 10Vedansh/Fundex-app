export type FundCategory = 'Equity' | 'Debt' | 'Hybrid' | 'Index' | 'Liquid';
export type RiskLevel = 'Low' | 'Moderate' | 'High';
export type StrengthBadge = 'Strong' | 'Balanced' | 'Risky';
export type RiskProfile = 'Conservative' | 'Moderate' | 'Aggressive';

export interface MutualFund {
  id: string;
  name: string;
  category: FundCategory;
  amc: string;
  nav: number;
  aum: number; // in crores
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

export const CATEGORY_COLORS: Record<FundCategory, string> = {
  Equity: 'hsl(217, 91%, 60%)',
  Debt: 'hsl(142, 71%, 45%)',
  Hybrid: 'hsl(38, 92%, 50%)',
  Index: 'hsl(265, 83%, 67%)',
  Liquid: 'hsl(173, 80%, 40%)',
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
