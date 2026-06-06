/**
 * CIFRAA Recommendation Engine V2 — Constraint Definitions
 *
 * Defines risk constraints, goal eligibility, horizon rules,
 * experience weight modifiers, and amount constraints.
 * All config is modular and editable — NO logic here.
 */

// ── Category groups used across constraints ──
export const EQUITY_CATEGORIES = [
  'EQ-LC', 'EQ-MC', 'EQ-SC', 'EQ-L&MC', 'EQ-MLC', 'EQ-FLX',
  'EQ-VAL', 'EQ-Quant', 'EQ-ELSS', 'EQ-DIV Y',
  'EQ-BANK', 'EQ-IT', 'EQ-Pharma', 'EQ-INFRA', 'EQ-PSU',
  'EQ-Energy', 'EQ-Consumption', 'EQ-THEMATIC', 'EQ-SA&T',
  'EQ-TBC', 'EQ-Manufacturing', 'EQ-Innovation',
];

export const DEBT_CATEGORIES = [
  'DT-OVERNHT', 'DT-LIQ', 'DT-USD', 'DT-LD', 'DT-MM',
  'DT-CB', 'DT-BK & PSU', 'DT-Floater', 'DT-GL', 'DT-TM',
  'DT-SD', 'DT-MD', 'DT-LONG D', 'DT-M to LD', 'DT-CR',
  'DT-DB', 'DT-Gilt 10Y CD',
];

export const HYBRID_CATEGORIES = [
  'HY-CH', 'HY-BH', 'HY-DAA', 'HY-AH', 'HY-AR',
  'HY-MAA', 'HY-EQ S', 'HY-IPA',
];

export const SECTORAL_CATEGORIES = [
  'EQ-BANK', 'EQ-IT', 'EQ-Pharma', 'EQ-INFRA', 'EQ-PSU',
  'EQ-Energy', 'EQ-Consumption', 'EQ-THEMATIC', 'EQ-SA&T',
  'EQ-TBC', 'EQ-Manufacturing', 'EQ-Innovation',
];

// ── 1. Risk Tolerance → Hard Constraints ──
export interface RiskConstraint {
  maxVolatility: number | null;  // null = no cap
  maxDrawdown: number | null;
  minCreditQuality: string | null; // e.g. 'AA+'
  blockedCategories: string[];
}

export const RISK_CONSTRAINTS: Record<string, RiskConstraint> = {
  conservative: {
    maxVolatility: 4,
    maxDrawdown: 8,
    minCreditQuality: 'AA+',
    blockedCategories: [
      'EQ-SC', 'EQ-MC', 'EQ-L&MC', 'EQ-MLC',
      ...SECTORAL_CATEGORIES,
      'EQ-Quant', 'EQ-FLX', 'EQ-VAL', 'EQ-ELSS',
      'DT-CR', // credit risk
      'HY-AH', // aggressive hybrid
    ],
  },
  moderate: {
    maxVolatility: 12,
    maxDrawdown: null,
    minCreditQuality: null,
    blockedCategories: [
      'EQ-SC', // limited small cap
      ...SECTORAL_CATEGORIES.filter(c => !['EQ-BANK', 'EQ-IT', 'EQ-Pharma'].includes(c)),
      'DT-CR',
    ],
  },
  aggressive: {
    maxVolatility: null,
    maxDrawdown: null,
    minCreditQuality: null,
    blockedCategories: [], // all equity allowed
  },
};

// ── 2. Investment Goal → Structural Eligibility ──
export interface GoalEligibility {
  allowedCategoryPrefixes: string[] | null; // null = no restriction on category type
  blockedCategories: string[];
  maxVolatility: number | null;
  minSharpe: number | null;
  requirePositive3Y: boolean;
  lockInFlag: boolean; // for ELSS
}

export const GOAL_ELIGIBILITY: Record<string, GoalEligibility> = {
  preservation: {
    allowedCategoryPrefixes: ['DT-', 'HY-CH', 'HY-AR', 'HY-EQ S'],
    blockedCategories: [...EQUITY_CATEGORIES, 'HY-AH', 'HY-BH', 'HY-DAA', 'HY-MAA'],
    maxVolatility: 5,
    minSharpe: null,
    requirePositive3Y: false,
    lockInFlag: false,
  },
  income: {
    allowedCategoryPrefixes: ['DT-', 'HY-CH', 'HY-BH', 'HY-AR', 'EQ-DIV Y'],
    blockedCategories: [
      'EQ-SC', 'EQ-MC', ...SECTORAL_CATEGORIES, 'EQ-Quant',
      'HY-AH', 'DT-CR',
    ],
    maxVolatility: null,
    minSharpe: 1.5,
    requirePositive3Y: true,
    lockInFlag: false,
  },
  wealth: {
    allowedCategoryPrefixes: null, // equity-oriented, but controlled by risk
    blockedCategories: [],
    maxVolatility: null,
    minSharpe: null,
    requirePositive3Y: false,
    lockInFlag: false,
  },
  tax: {
    allowedCategoryPrefixes: ['EQ-ELSS'],
    blockedCategories: [],
    maxVolatility: null,
    minSharpe: null,
    requirePositive3Y: false,
    lockInFlag: true,
  },
};

// ── 3. Investment Horizon → Category Rules ──
export interface HorizonRule {
  blockedCategories: string[];
  maxDuration: number | null; // years, for debt
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
    ],
    maxDuration: null,
  },
  long: {
    blockedCategories: [], // all eligible per risk tolerance
    maxDuration: null,
  },
};

// ── 4. Experience Level → Weight Modifiers (NOT hard filters) ──
export interface ExperienceModifier {
  volatilityPenaltyMultiplier: number;  // 1.0 = neutral
  expensePenaltyMultiplier: number;
  aumBonusMultiplier: number;           // higher = prefer high AUM
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
};

// ── 5. Investment Amount → Constraints ──
export interface AmountConstraint {
  minAum: number | null;        // Crores
  maxExpense: number | null;    // %
  directPlanOnly: boolean;
}

export const AMOUNT_CONSTRAINTS: Record<string, AmountConstraint> = {
  small: { minAum: null, maxExpense: null, directPlanOnly: false },
  medium: { minAum: 200, maxExpense: null, directPlanOnly: false },
  large: { minAum: 500, maxExpense: 1, directPlanOnly: true },
};

// ── Permanently excluded funds ──
export const EXCLUDED_FUND_NAMES = ['bharat 22 etf'];

// ── Category Allocation Models for Diversification ──
export interface AllocationBucket {
  categories: string[];
  maxFunds: number;
}

export function getAllocationModel(risk: string, goal: string): AllocationBucket[] {
  if (risk === 'conservative') {
    if (goal === 'preservation') {
      return [
        { categories: ['DT-CB', 'DT-BK & PSU'], maxFunds: 3 },
        { categories: ['DT-LIQ', 'DT-USD', 'DT-OVERNHT', 'DT-MM'], maxFunds: 2 },
        { categories: ['DT-GL', 'DT-TM', 'DT-Floater'], maxFunds: 2 },
        { categories: ['DT-SD', 'DT-LD'], maxFunds: 2 },
      ];
    }
    if (goal === 'income') {
      return [
        { categories: ['DT-CB', 'DT-BK & PSU', 'DT-SD'], maxFunds: 3 },
        { categories: ['DT-GL', 'DT-Floater'], maxFunds: 2 },
        { categories: ['HY-CH', 'HY-AR'], maxFunds: 2 },
        { categories: ['EQ-DIV Y'], maxFunds: 1 },
        { categories: ['DT-LIQ', 'DT-USD'], maxFunds: 1 },
      ];
    }
    return [
      { categories: ['DT-CB', 'DT-BK & PSU'], maxFunds: 2 },
      { categories: ['DT-SD', 'DT-GL', 'DT-Floater'], maxFunds: 2 },
      { categories: ['EQ-LC'], maxFunds: 2 },
      { categories: ['HY-CH', 'HY-DAA'], maxFunds: 2 },
      { categories: ['DT-LIQ', 'DT-USD'], maxFunds: 1 },
    ];
  }

  if (risk === 'moderate') {
    if (goal === 'tax') {
      return [
        { categories: ['EQ-ELSS'], maxFunds: 4 },
        { categories: ['EQ-LC', 'EQ-L&MC'], maxFunds: 2 },
        { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
        { categories: ['HY-BH', 'HY-DAA'], maxFunds: 1 },
      ];
    }
    if (goal === 'wealth') {
      return [
        { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
        { categories: ['EQ-LC', 'EQ-L&MC'], maxFunds: 2 },
        { categories: ['EQ-VAL', 'EQ-ELSS'], maxFunds: 2 },
        { categories: ['HY-BH', 'HY-DAA', 'HY-MAA'], maxFunds: 2 },
        { categories: ['DT-SD', 'DT-CB'], maxFunds: 1 },
      ];
    }
    return [
      { categories: ['EQ-LC', 'EQ-L&MC'], maxFunds: 2 },
      { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
      { categories: ['EQ-VAL', 'EQ-DIV Y'], maxFunds: 1 },
      { categories: ['HY-BH', 'HY-DAA'], maxFunds: 2 },
      { categories: ['DT-CB', 'DT-SD'], maxFunds: 1 },
      { categories: ['EQ-ELSS'], maxFunds: 1 },
    ];
  }

  // Aggressive
  if (goal === 'wealth') {
    return [
      { categories: ['EQ-SC'], maxFunds: 2 },
      { categories: ['EQ-MC'], maxFunds: 2 },
      { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
      { categories: SECTORAL_CATEGORIES, maxFunds: 1 },
      { categories: ['EQ-VAL', 'EQ-Quant'], maxFunds: 1 },
      { categories: ['EQ-L&MC', 'EQ-LC'], maxFunds: 1 },
    ];
  }
  return [
    { categories: ['EQ-SC'], maxFunds: 2 },
    { categories: ['EQ-MC'], maxFunds: 2 },
    { categories: ['EQ-FLX', 'EQ-MLC'], maxFunds: 2 },
    { categories: ['EQ-LC', 'EQ-L&MC'], maxFunds: 1 },
    { categories: ['EQ-VAL', 'EQ-Quant'], maxFunds: 1 },
    { categories: SECTORAL_CATEGORIES, maxFunds: 1 },
  ];
}
