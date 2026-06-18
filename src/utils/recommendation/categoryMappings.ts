export const PLAIN_EQUITY = 'Equity';
export const PLAIN_DEBT = 'Debt';
export const PLAIN_HYBRID = 'Hybrid';
export const PLAIN_INDEX = 'Index';
export const PLAIN_LIQUID = 'Liquid';

export const EQUITY_CATEGORIES = [
  'EQ-LC', 'EQ-MC', 'EQ-SC', 'EQ-L&MC', 'EQ-MLC', 'EQ-FLX',
  'EQ-VAL', 'EQ-Quant', 'EQ-ELSS', 'EQ-DIV Y',
  'EQ-BANK', 'EQ-IT', 'EQ-Pharma', 'EQ-INFRA', 'EQ-PSU',
  'EQ-Energy', 'EQ-Consumption', 'EQ-THEMATIC', 'EQ-SA&T',
  'EQ-TBC', 'EQ-Manufacturing', 'EQ-Innovation',
  PLAIN_EQUITY, PLAIN_INDEX,
];

export const DEBT_CATEGORIES = [
  'DT-OVERNHT', 'DT-LIQ', 'DT-USD', 'DT-LD', 'DT-MM',
  'DT-CB', 'DT-BK & PSU', 'DT-Floater', 'DT-GL', 'DT-TM',
  'DT-SD', 'DT-MD', 'DT-LONG D', 'DT-M to LD', 'DT-CR',
  'DT-DB', 'DT-Gilt 10Y CD',
  PLAIN_DEBT, PLAIN_LIQUID,
];

export const HYBRID_CATEGORIES = [
  'HY-CH', 'HY-BH', 'HY-DAA', 'HY-AH', 'HY-AR',
  'HY-MAA', 'HY-EQ S', 'HY-IPA',
  PLAIN_HYBRID,
];

export const SECTORAL_CATEGORIES = [
  'EQ-BANK', 'EQ-IT', 'EQ-Pharma', 'EQ-INFRA', 'EQ-PSU',
  'EQ-Energy', 'EQ-Consumption', 'EQ-THEMATIC', 'EQ-SA&T',
  'EQ-TBC', 'EQ-Manufacturing', 'EQ-Innovation',
];

// Maps production category names (full English) to internal short codes.
// The recommendation engine operates on short codes; production data from
// fund_master_enriched stores long-form names like "Equity - Large Cap".
export const CATEGORY_NAME_TO_CODE: Record<string, string> = {
  'Equity - Large Cap': 'EQ-LC',
  'Equity - Flexi Cap': 'EQ-FLX',
  'Equity - Mid Cap': 'EQ-MC',
  'Equity - Small Cap': 'EQ-SC',
  'Equity - Large & Mid Cap': 'EQ-L&MC',
  'Equity - Multi Cap': 'EQ-MLC',
  'Equity - Value': 'EQ-VAL',
  'Equity - ELSS': 'EQ-ELSS',
  'Equity - Dividend Yield': 'EQ-DIV Y',
  'Equity - Focused': 'EQ-Focused',
  'Equity - Index': 'Index',
  'Equity - Thematic': 'EQ-THEMATIC',
  'Equity - Sectoral - Banking': 'EQ-BANK',
  'Equity - Sectoral - Technology': 'EQ-IT',
  'Equity - Sectoral - Pharma': 'EQ-Pharma',
  'Equity - Sectoral - Infrastructure': 'EQ-INFRA',
  'Equity - Sectoral - PSU': 'EQ-PSU',
  'Equity - Sectoral - Consumption': 'EQ-Consumption',
  'Equity - Sectoral - Manufacturing': 'EQ-Manufacturing',
  'Other - International': 'EQ-INTL',
  'Other - Fund of Funds': 'EQ-FOF',
  'Other - Solution Oriented': 'EQ-SOLUTION',
  'Other - Unclassified': 'Unknown',
  'Commodity - Gold': 'Gold-Funds',
  'Debt - Income': 'DT-IN',
  'Debt - Liquid': 'DT-LIQ',
  'Debt - Overnight': 'DT-OS',
  'Debt - Money Market': 'DT-MM',
  'Debt - Gilt': 'DT-GSEC',
  'Debt - Dynamic Bond': 'DT-DB',
  'Debt - Long Duration': 'DT-LONG D',
  'Debt - Short Duration': 'DT-SD',
  'Debt - Medium Duration': 'DT-MD',
  'Debt - Low Duration': 'DT-LD',
  'Debt - Corporate Bond': 'DT-CB',
  'Debt - Banking and PSU': 'DT-BK & PSU',
  'Debt - Floater': 'DT-Floater',
  'Debt - Credit Risk': 'DT-CR',
  'Debt - IDF': 'DT-IDF',
  'Hybrid - Aggressive': 'HY-AH',
  'Hybrid - Conservative': 'HY-CH',
  'Hybrid - Arbitrage': 'HY-AR',
  'Hybrid - Balanced': 'HY-DAA',
  'Hybrid - Equity Savings': 'HY-EQ S',
  'Hybrid - Multi Asset Allocation': 'HY-MAA',
};

export function toCategoryCode(name: string): string {
  const trimmed = name.trim();
  if (!trimmed || trimmed === 'Unknown') return trimmed;
  const mapped = CATEGORY_NAME_TO_CODE[trimmed];
  if (mapped) return mapped;
  // Fallback: extract first word as plain-text code
  const firstWord = trimmed.split(' - ')[0];
  if (firstWord === 'Equity') return PLAIN_EQUITY;
  if (firstWord === 'Debt') return PLAIN_DEBT;
  if (firstWord === 'Hybrid') return PLAIN_HYBRID;
  if (firstWord === 'Commodity') return trimmed.split(' - ').slice(1).join(' - ') + '-Funds';
  if (firstWord === 'Other') return 'Unknown';
  return trimmed;
}

// Full list of all expected category codes for logging
export const ALL_EQUITY = EQUITY_CATEGORIES;
export const ALL_DEBT = DEBT_CATEGORIES;
export const ALL_HYBRID = HYBRID_CATEGORIES;

// ── 1. Risk Tolerance → Hard Constraints ──
export interface RiskConstraint {
  maxVolatility: number | null;
  maxDrawdown: number | null;
  minCreditQuality: string | null;
  blockedCategories: string[];
}

export const RISK_CONSTRAINTS: Record<string, RiskConstraint> = {
  conservative: {
    maxVolatility: 4,
    maxDrawdown: 8,
    minCreditQuality: 'AA+',
    blockedCategories: [
      'EQ-SC', 'EQ-MC', 'EQ-L&MC', 'EQ-MLC', 'EQ-FLX', 'EQ-VAL', 'EQ-Quant', 'EQ-ELSS', 'EQ-DIV Y',
      ...SECTORAL_CATEGORIES,
      'DT-CR',
      'HY-AH', 'HY-BH', 'HY-DAA', 'HY-MAA',
    ],
  },
  moderate: {
    maxVolatility: 8,
    maxDrawdown: null,
    minCreditQuality: null,
    blockedCategories: [
      'EQ-SC', 'EQ-MC', 'EQ-L&MC',
      ...SECTORAL_CATEGORIES.filter(c => !['EQ-BANK', 'EQ-IT', 'EQ-Pharma'].includes(c)),
      'EQ-Quant',
      'DT-CR',
      'HY-AH', 'HY-MAA',
    ],
  },
  aggressive: {
    maxVolatility: null,
    maxDrawdown: null,
    minCreditQuality: null,
    blockedCategories: [],
  },
};

// ── 2. Investment Goal → Structural Eligibility ──
export interface GoalEligibility {
  allowedCategoryPrefixes: string[] | null;
  blockedCategories: string[];
  maxVolatility: number | null;
  minSharpe: number | null;
  requirePositive3Y: boolean;
  lockInFlag: boolean;
}

export const GOAL_ELIGIBILITY: Record<string, GoalEligibility> = {
  wealth_creation: {
    allowedCategoryPrefixes: ['EQ-', PLAIN_EQUITY, PLAIN_INDEX],
    blockedCategories: ['EQ-DIV Y', 'EQ-INTL', 'EQ-T-ESG', 'EQ-FOF'],
    maxVolatility: null,
    minSharpe: null,
    requirePositive3Y: false,
    lockInFlag: false,
  },
  retirement: {
    allowedCategoryPrefixes: ['EQ-', 'HY-', 'DT-', PLAIN_EQUITY, PLAIN_HYBRID, PLAIN_DEBT, PLAIN_INDEX],
    blockedCategories: [
      'EQ-SC', 'EQ-DIV Y',
      ...SECTORAL_CATEGORIES,
      'EQ-Quant',
      'EQ-INTL', 'EQ-T-ESG', 'EQ-FOF',
      'HY-AH',
      'DT-CR',
    ],
    maxVolatility: 8,
    minSharpe: null,
    requirePositive3Y: false,
    lockInFlag: false,
  },
  child_education: {
    allowedCategoryPrefixes: ['EQ-', 'HY-', PLAIN_EQUITY, PLAIN_HYBRID, PLAIN_INDEX],
    blockedCategories: [
      'EQ-SC', 'EQ-DIV Y',
      ...SECTORAL_CATEGORIES,
      'EQ-Quant',
      'EQ-INTL', 'EQ-T-ESG', 'EQ-FOF',
      'HY-AH',
    ],
    maxVolatility: 10,
    minSharpe: null,
    requirePositive3Y: false,
    lockInFlag: false,
  },
  passive_income: {
    allowedCategoryPrefixes: ['DT-', 'HY-CH', 'HY-AR', 'HY-EQ S', 'HY-IPA', PLAIN_DEBT, PLAIN_LIQUID, PLAIN_HYBRID],
    blockedCategories: [
      'HY-AH', 'HY-BH', 'HY-DAA', 'HY-MAA', 'DT-CR',
    ],
    maxVolatility: null,
    minSharpe: 1.5,
    requirePositive3Y: true,
    lockInFlag: false,
  },
  tax_saving: {
    allowedCategoryPrefixes: ['EQ-ELSS', PLAIN_EQUITY],
    blockedCategories: [],
    maxVolatility: null,
    minSharpe: null,
    requirePositive3Y: false,
    lockInFlag: true,
  },
  capital_preservation: {
    allowedCategoryPrefixes: ['DT-', 'HY-CH', 'HY-AR', 'HY-EQ S', PLAIN_DEBT, PLAIN_LIQUID],
    blockedCategories: [...EQUITY_CATEGORIES, 'HY-AH', 'HY-BH', 'HY-DAA', 'HY-MAA', PLAIN_EQUITY, PLAIN_HYBRID, PLAIN_INDEX],
    maxVolatility: 4,
    minSharpe: null,
    requirePositive3Y: false,
    lockInFlag: false,
  },
};

// ── 3. Investment Horizon → Category Rules ──
export interface HorizonRule {
  blockedCategories: string[];
  maxDuration: number | null;
}

export const HORIZON_RULES: Record<string, HorizonRule> = {
  short: {
    blockedCategories: [
      ...EQUITY_CATEGORIES,
      'HY-AH', 'HY-BH', 'HY-DAA', 'HY-MAA',
      'DT-CR', 'DT-LONG D', 'DT-M to LD',
    ],
    maxDuration: 3,
  },
  medium: {
    blockedCategories: [
      'EQ-SC',
      ...SECTORAL_CATEGORIES,
      'EQ-Quant',
      'DT-CR',
    ],
    maxDuration: 7,
  },
  long: {
    blockedCategories: [
      'DT-OVERNHT', 'DT-LIQ', 'DT-MM',
    ],
    maxDuration: null,
  },
};

// ── 4. Experience Level → Weight Modifiers (NOT hard filters) ──
export interface ExperienceModifier {
  volatilityPenaltyMultiplier: number;
  expensePenaltyMultiplier: number;
  aumBonusMultiplier: number;
  allowSectoral: boolean;
}

export const EXPERIENCE_MODIFIERS: Record<string, ExperienceModifier> = {
  beginner: {
    volatilityPenaltyMultiplier: 1.8,
    expensePenaltyMultiplier: 1.5,
    aumBonusMultiplier: 1.5,
    allowSectoral: false,
  },
  intermediate: {
    volatilityPenaltyMultiplier: 1.0,
    expensePenaltyMultiplier: 1.0,
    aumBonusMultiplier: 1.0,
    allowSectoral: true,
  },
  experienced: {
    volatilityPenaltyMultiplier: 0.5,
    expensePenaltyMultiplier: 0.7,
    aumBonusMultiplier: 0.5,
    allowSectoral: true,
  },
  advanced: {
    volatilityPenaltyMultiplier: 0.5,
    expensePenaltyMultiplier: 0.7,
    aumBonusMultiplier: 0.5,
    allowSectoral: true,
  },
};

// ── 5. Investment Amount → Constraints ──
export interface AmountConstraint {
  minAum: number | null;
  maxExpense: number | null;
  directPlanOnly: boolean;
}

export const AMOUNT_CONSTRAINTS: Record<string, AmountConstraint> = {
  small: { minAum: null, maxExpense: null, directPlanOnly: false },
  under_1l: { minAum: null, maxExpense: null, directPlanOnly: false },
  medium: { minAum: 200, maxExpense: null, directPlanOnly: false },
  '1l_to_10l': { minAum: 200, maxExpense: null, directPlanOnly: false },
  large: { minAum: 500, maxExpense: 1, directPlanOnly: true },
  above_10l: { minAum: 500, maxExpense: 1, directPlanOnly: true },
  '50k-5lakhs': { minAum: 200, maxExpense: null, directPlanOnly: false },
  '5lakhs+': { minAum: 500, maxExpense: 1, directPlanOnly: true },
};

// ── Categories excluded by business policy (e.g., International, ESG) ──
export const BUSINESS_EXCLUDED_CATEGORIES = ['EQ-INTL', 'EQ-T-ESG', 'EQ-FOF', 'Gold-Funds', 'Silver-Funds'];

// ── Permanently excluded funds ──
export const EXCLUDED_FUND_NAMES = ['bharat 22 etf', 'children', 'child', 'kids', 'bal bhavishya'];

// ── AMC Name Normalization ──
// Canonicalizes heuristic AMC names so the AMC cap works correctly.
// "Aditya Birla Sun Life Arbitrage" → "Aditya Birla Sun Life"
// "SBI Contra Fund" → "SBI"
// "ICICI Prudential BHARAT 22" → "ICICI Prudential"
export function normalizeAmcName(amc: string): string {
  const lower = amc.toLowerCase().trim();
  if (!lower) return amc;

  const PREFIXES: { match: string; canonical: string }[] = [
    { match: '360 one', canonical: '360 ONE' },
    { match: 'aditya birla sun life', canonical: 'Aditya Birla' },
    { match: 'aditya birla', canonical: 'Aditya Birla' },
    { match: 'axis', canonical: 'Axis' },
    { match: 'bajaj finserv', canonical: 'Bajaj Finserv' },
    { match: 'bandhan', canonical: 'Bandhan' },
    { match: 'bank of india', canonical: 'Bank of India' },
    { match: 'baroda bnp paribas', canonical: 'Baroda BNP Paribas' },
    { match: 'boi', canonical: 'BOI' },
    { match: 'canara robeco', canonical: 'Canara Robeco' },
    { match: 'dsp', canonical: 'DSP' },
    { match: 'edelweiss', canonical: 'Edelweiss' },
    { match: 'franklin india', canonical: 'Franklin India' },
    { match: 'franklin', canonical: 'Franklin India' },
    { match: 'groww', canonical: 'Groww' },
    { match: 'hdfc', canonical: 'HDFC' },
    { match: 'helios', canonical: 'Helios' },
    { match: 'hsbc', canonical: 'HSBC' },
    { match: 'icici prudential', canonical: 'ICICI Prudential' },
    { match: 'invesco india', canonical: 'Invesco India' },
    { match: 'invesco', canonical: 'Invesco India' },
    { match: 'iti', canonical: 'ITI' },
    { match: 'jm financial', canonical: 'JM Financial' },
    { match: 'kotak', canonical: 'Kotak' },
    { match: 'lic mf', canonical: 'LIC MF' },
    { match: 'lic', canonical: 'LIC MF' },
    { match: 'mahindra manulife', canonical: 'Mahindra Manulife' },
    { match: 'mirae asset', canonical: 'Mirae Asset' },
    { match: 'mirae', canonical: 'Mirae Asset' },
    { match: 'motilal oswal', canonical: 'Motilal Oswal' },
    { match: 'motilal', canonical: 'Motilal Oswal' },
    { match: 'navi', canonical: 'Navi' },
    { match: 'nippon india', canonical: 'Nippon India' },
    { match: 'nippon', canonical: 'Nippon India' },
    { match: 'nj', canonical: 'NJ' },
    { match: 'old bridge', canonical: 'Old Bridge' },
    { match: 'parag parikh', canonical: 'PPFAS' },
    { match: 'pgim india', canonical: 'PGIM India' },
    { match: 'pgim', canonical: 'PGIM India' },
    { match: 'quant', canonical: 'Quant' },
    { match: 'samco', canonical: 'Samco' },
    { match: 'sbi', canonical: 'SBI' },
    { match: 'shriram', canonical: 'Shriram' },
    { match: 'sundaram', canonical: 'Sundaram' },
    { match: 'tata', canonical: 'Tata' },
    { match: 'taurus', canonical: 'Taurus' },
    { match: 'the wealth company', canonical: 'WhiteOak Capital' },
    { match: 'trust', canonical: 'TRUST' },
    { match: 'union', canonical: 'Union' },
    { match: 'uti', canonical: 'UTI' },
    { match: 'whiteoak capital', canonical: 'WhiteOak Capital' },
    { match: 'whiteoak', canonical: 'WhiteOak Capital' },
    { match: 'zerodha', canonical: 'Zerodha' },
    { match: 'ppfas', canonical: 'PPFAS' },
    { match: 'cpse', canonical: 'CPSE' },
  ];

  for (const { match, canonical } of PREFIXES) {
    if (lower.startsWith(match)) return canonical;
  }

  // For any remaining heuristic names, take only the first 2–3 meaningful words
  const words = lower.split(/\s+/).filter(w => w.length > 2);
  if (words.length > 2) {
    const title = words.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (title.length > 3) return title;
  }

  return amc;
}

// ── Category Allocation Models for Diversification ──
export interface AllocationBucket {
  categories: string[];
  maxFunds: number;
}

const GOAL_TO_ALLOC_MODEL: Record<string, string> = {
  wealth_creation: 'wealth',
  retirement: 'retirement',
  child_education: 'wealth',
  passive_income: 'income',
  tax_saving: 'tax',
  capital_preservation: 'preservation',
};

export function normalizeGoalForModel(goal: string): string {
  return GOAL_TO_ALLOC_MODEL[goal] || goal || 'wealth';
}

export function getAllocationModel(risk: string, goal: string): AllocationBucket[] {
  const g = normalizeGoalForModel(goal);

  if (risk === 'conservative') {
    if (g === 'preservation') {
      return [
        { categories: ['DT-CB', 'DT-BK & PSU', PLAIN_DEBT], maxFunds: 3 },
        { categories: ['DT-LIQ', 'DT-USD', 'DT-OVERNHT', 'DT-MM', PLAIN_LIQUID], maxFunds: 2 },
        { categories: ['DT-GL', 'DT-TM', 'DT-Floater'], maxFunds: 2 },
        { categories: ['DT-SD', 'DT-LD'], maxFunds: 2 },
      ];
    }
    if (g === 'income') {
      return [
        { categories: ['DT-CB', 'DT-BK & PSU', 'DT-SD', PLAIN_DEBT], maxFunds: 3 },
        { categories: ['DT-GL', 'DT-Floater'], maxFunds: 2 },
        { categories: ['HY-CH', 'HY-AR', PLAIN_HYBRID], maxFunds: 2 },
        { categories: ['EQ-DIV Y'], maxFunds: 1 },
        { categories: ['DT-LIQ', 'DT-USD', PLAIN_LIQUID], maxFunds: 1 },
      ];
    }
    return [
      { categories: ['DT-CB', 'DT-BK & PSU', PLAIN_DEBT], maxFunds: 2 },
      { categories: ['DT-SD', 'DT-GL', 'DT-Floater'], maxFunds: 2 },
      { categories: ['EQ-LC', PLAIN_EQUITY], maxFunds: 2 },
      { categories: ['HY-CH', 'HY-DAA', PLAIN_HYBRID], maxFunds: 2 },
      { categories: ['DT-LIQ', 'DT-USD', PLAIN_LIQUID], maxFunds: 1 },
    ];
  }

  if (risk === 'moderate') {
    if (g === 'tax') {
      return [
        { categories: ['EQ-ELSS', PLAIN_EQUITY], maxFunds: 4 },
        { categories: ['EQ-LC', 'EQ-L&MC'], maxFunds: 2 },
        { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
        { categories: ['HY-BH', 'HY-DAA', PLAIN_HYBRID], maxFunds: 1 },
      ];
    }
    if (g === 'retirement') {
      return [
        { categories: ['HY-DAA'], maxFunds: 1 },             // Balanced Advantage
        { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },   // Flexi Cap
        { categories: ['EQ-LC'], maxFunds: 1 },               // Large Cap
        { categories: ['EQ-VAL'], maxFunds: 1 },              // Value
        { categories: ['HY-CH'], maxFunds: 1 },               // Conservative Hybrid
        { categories: ['DT-CB', 'DT-BK & PSU', PLAIN_DEBT], maxFunds: 1 }, // Corporate Bond
        { categories: ['HY-AR'], maxFunds: 1 },               // Arbitrage (max 1)
        { categories: ['HY-EQ S'], maxFunds: 1 },             // Equity Savings
      ];
    }
    if (g === 'wealth') {
      return [
        { categories: ['EQ-FLX', 'EQ-MLC', PLAIN_EQUITY], maxFunds: 2 },
        { categories: ['EQ-LC', 'EQ-L&MC', PLAIN_INDEX], maxFunds: 2 },
        { categories: ['EQ-VAL', 'EQ-ELSS'], maxFunds: 2 },
        { categories: ['HY-BH', 'HY-DAA', 'HY-MAA', PLAIN_HYBRID], maxFunds: 2 },
        { categories: ['DT-SD', 'DT-CB', PLAIN_DEBT], maxFunds: 1 },
      ];
    }
    return [
      { categories: ['EQ-LC', 'EQ-L&MC', PLAIN_EQUITY, PLAIN_INDEX], maxFunds: 2 },
      { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
      { categories: ['EQ-VAL', 'EQ-DIV Y'], maxFunds: 1 },
      { categories: ['HY-BH', 'HY-DAA', PLAIN_HYBRID], maxFunds: 2 },
      { categories: ['DT-CB', 'DT-SD', PLAIN_DEBT], maxFunds: 1 },
      { categories: ['EQ-ELSS'], maxFunds: 1 },
    ];
  }

  // Aggressive
  if (g === 'wealth') {
    return [
      { categories: ['EQ-SC', PLAIN_EQUITY], maxFunds: 2 },
      { categories: ['EQ-MC'], maxFunds: 2 },
      { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
      { categories: [...SECTORAL_CATEGORIES], maxFunds: 1 },
      { categories: ['EQ-VAL', 'EQ-Quant'], maxFunds: 1 },
      { categories: ['EQ-L&MC', 'EQ-LC', PLAIN_INDEX], maxFunds: 1 },
    ];
  }
  return [
    { categories: ['EQ-SC', PLAIN_EQUITY], maxFunds: 2 },
    { categories: ['EQ-MC'], maxFunds: 2 },
    { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
    { categories: ['EQ-LC', 'EQ-L&MC', PLAIN_INDEX], maxFunds: 1 },
    { categories: ['EQ-VAL', 'EQ-Quant'], maxFunds: 1 },
    { categories: [...SECTORAL_CATEGORIES], maxFunds: 1 },
  ];
}
