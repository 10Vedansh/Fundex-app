// ── Strategy Groups (for duplicate suppression) ──
// Funds in the same strategy group are interchangeable.
// Only the highest-scoring fund from each group is selected.

export type StrategyGroup =
  | 'ultra_short_debt'
  | 'liquid'
  | 'money_market'
  | 'short_debt'
  | 'medium_debt'
  | 'long_debt'
  | 'dynamic_debt'
  | 'corp_debt'
  | 'floater'
  | 'gilt'
  | 'credit_risk'
  | 'large_cap_index'
  | 'flexi_multi_cap'
  | 'mid_cap'
  | 'small_cap'
  | 'value'
  | 'quant'
  | 'elss'
  | 'thematic_sectoral'
  | 'dividend_yield'
  | 'focused'
  | 'international'
  | 'conservative_hybrid'
  | 'balanced_hybrid'
  | 'multi_asset'
  | 'aggressive_hybrid'
  | 'arbitrage'
  | 'equity_savings'
  | 'other';

export const CATEGORY_TO_STRATEGY_GROUP: Record<string, StrategyGroup> = {
  // Debt - Ultra Short / Liquid
  'DT-OVERNHT': 'ultra_short_debt',
  'DT-LIQ': 'liquid',
  'DT-USD': 'ultra_short_debt',
  'DT-MM': 'money_market',
  'DT-LD': 'short_debt',
  'DT-SD': 'short_debt',
  'DT-MD': 'medium_debt',
  'DT-LONG D': 'long_debt',
  'DT-M to LD': 'long_debt',
  'DT-DB': 'dynamic_debt',
  'DT-CB': 'corp_debt',
  'DT-BK & PSU': 'corp_debt',
  'DT-Floater': 'floater',
  'DT-GL': 'gilt',
  'DT-TM': 'gilt',
  'DT-Gilt 10Y CD': 'gilt',
  'DT-CR': 'credit_risk',
  'DT-IDF': 'credit_risk',
  'DT-IN': 'medium_debt',
  'Debt': 'short_debt',

  // Equity
  'EQ-LC': 'large_cap_index',
  'Index': 'large_cap_index',
  'EQ-FLX': 'flexi_multi_cap',
  'EQ-MLC': 'flexi_multi_cap',
  'EQ-L&MC': 'large_cap_index',
  'EQ-MC': 'mid_cap',
  'EQ-SC': 'small_cap',
  'EQ-VAL': 'value',
  'EQ-Quant': 'quant',
  'EQ-ELSS': 'elss',
  'EQ-DIV Y': 'dividend_yield',
  'EQ-Focused': 'focused',
  'EQ-INTL': 'international',
  'EQ-FOF': 'international',
  'Equity': 'flexi_multi_cap',

  // Sectoral
  'EQ-BANK': 'thematic_sectoral',
  'EQ-IT': 'thematic_sectoral',
  'EQ-Pharma': 'thematic_sectoral',
  'EQ-INFRA': 'thematic_sectoral',
  'EQ-PSU': 'thematic_sectoral',
  'EQ-Energy': 'thematic_sectoral',
  'EQ-Consumption': 'thematic_sectoral',
  'EQ-THEMATIC': 'thematic_sectoral',
  'EQ-SA&T': 'thematic_sectoral',
  'EQ-TBC': 'thematic_sectoral',
  'EQ-Manufacturing': 'thematic_sectoral',
  'EQ-Innovation': 'thematic_sectoral',

  // Hybrid
  'HY-CH': 'conservative_hybrid',
  'HY-DAA': 'balanced_hybrid',
  'HY-MAA': 'multi_asset',
  'HY-AH': 'aggressive_hybrid',
  'HY-AR': 'arbitrage',
  'HY-EQ S': 'equity_savings',
  'HY-IPA': 'arbitrage',
  'HY-BH': 'balanced_hybrid',
  'Hybrid': 'balanced_hybrid',

  // Commodity
  'Gold-Funds': 'other',
  'Liquid': 'liquid',
};

export function getStrategyGroup(category: string): string {
  return CATEGORY_TO_STRATEGY_GROUP[category] || 'other';
}

// ── Core + Satellite Models ──

export interface CoreSatelliteModel {
  coreStrategyGroups: string[];
  satelliteStrategyGroups: string[];
  minCoreCategories: number;
  minSatelliteCategories: number;
}

export const CORE_SATELLITE_MODELS: Record<string, CoreSatelliteModel> = {
  aggressive: {
    coreStrategyGroups: ['large_cap_index', 'flexi_multi_cap', 'mid_cap'],
    satelliteStrategyGroups: ['small_cap', 'value', 'thematic_sectoral', 'quant', 'other'],
    minCoreCategories: 2,
    minSatelliteCategories: 1,
  },
  retirement: {
    coreStrategyGroups: ['large_cap_index', 'flexi_multi_cap', 'conservative_hybrid', 'balanced_hybrid',
      'short_debt', 'corp_debt'],
    satelliteStrategyGroups: ['arbitrage', 'equity_savings', 'multi_asset', 'mid_cap', 'value'],
    minCoreCategories: 2,
    minSatelliteCategories: 1,
  },
  preservation: {
    coreStrategyGroups: ['ultra_short_debt', 'liquid', 'money_market', 'short_debt', 'corp_debt',
      'floater', 'gilt', 'medium_debt', 'dynamic_debt', 'long_debt'],
    satelliteStrategyGroups: ['arbitrage', 'conservative_hybrid'],
    minCoreCategories: 3,
    minSatelliteCategories: 0,
  },
};

export function getProfileTypeForCoreSatellite(risk: string, goal: string): string {
  if (risk === 'aggressive') return 'aggressive';
  if (goal === 'retirement') return 'retirement';
  if (goal === 'capital_preservation') return 'preservation';
  // moderate + wealth_creation defaults to retirement-like (balanced)
  if (goal === 'wealth_creation') return 'retirement';
  return 'aggressive';
}
