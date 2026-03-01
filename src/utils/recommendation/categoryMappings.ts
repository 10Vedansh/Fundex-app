/**
 * Category Mappings for Multi-Factor Recommendation Engine
 * 
 * Maps user preferences to fund category codes from the workbook.
 * All mappings are editable arrays — no logic is embedded here.
 */

// ── Risk Tolerance → Category Codes ──
export const RISK_CATEGORY_MAP: Record<string, string[]> = {
  conservative: [
    'DT-OVERNHT',   // Overnight
    'DT-LIQ',       // Liquid
    'DT-USD',       // Ultra Short Duration
    'DT-LD',        // Low Duration
    'DT-MM',        // Money Market
    'DT-CB',        // Corporate Bond
    'DT-BK & PSU',  // Banking & PSU
    'DT-Floater',   // Floating Rate
    'DT-GL',        // Gilt
    'DT-TM',        // Target Maturity
  ],
  moderate: [
    'DT-SD',        // Short Duration
    'DT-CB',        // Corporate Bond
    'HY-CH',        // Hybrid Conservative
    'HY-BH',        // Balanced Hybrid
    'HY-DAA',       // Balanced Advantage
    'EQ-LC',        // Large Cap
    'EQ-L&MC',      // Large & Mid Cap
    'HY-MAA',       // Multi Asset Allocation
    'HY-EQ S',      // Equity Savings
  ],
  aggressive: [
    'EQ-FLX',       // Flexi Cap
    'EQ-L&MC',      // Large & Mid Cap
    'EQ-MC',        // Mid Cap
    'EQ-SC',        // Small Cap
    'EQ-SA&T',      // Sectoral
    'EQ-THEMATIC',  // Thematic
    'EQ-ELSS',      // ELSS
    'EQ-MLC',       // Multi Cap
    'EQ-VAL',       // Value
    'EQ-Quant',     // Quant
    'EQ-BANK',      // Banking
    'EQ-IT',        // IT
    'EQ-Pharma',    // Pharma
    'EQ-INFRA',     // Infrastructure
    'EQ-PSU',       // PSU
    'EQ-Energy',    // Energy
    'EQ-Consumption', // Consumption
    'EQ-TBC',       // Business Cycle
    'EQ-Manufacturing', // Manufacturing
    'EQ-Innovation',    // Innovation
  ],
};

// ── Investment Goal → Category Codes ──
export const GOAL_CATEGORY_MAP: Record<string, string[]> = {
  wealth: [
    'EQ-FLX', 'EQ-LC', 'EQ-MC', 'EQ-SC', 'EQ-ELSS',
    'EQ-MLC', 'EQ-L&MC', 'EQ-VAL', 'EQ-Quant',
  ],
  income: [
    'EQ-DIV Y',   // Dividend Yield
    'HY-CH',      // Conservative Hybrid
    'HY-BH',      // Balanced Hybrid
    'DT-CB',      // Corporate Bond
    'DT-SD',      // Short Duration
    'DT-GL',      // Gilt
    'DT-BK & PSU',
  ],
  preservation: [
    'DT-LIQ', 'DT-USD', 'DT-LD', 'DT-CB', 'DT-MM',
    'DT-OVERNHT', 'DT-Floater', 'DT-BK & PSU', 'DT-TM',
  ],
  tax: [
    'EQ-ELSS',
  ],
};

// ── Investment Horizon → Category Codes ──
export const HORIZON_CATEGORY_MAP: Record<string, string[]> = {
  short: [
    'DT-LIQ', 'DT-USD', 'DT-LD', 'DT-CB', 'DT-MM',
    'DT-OVERNHT', 'DT-Floater', 'DT-BK & PSU',
  ],
  medium: [
    'HY-CH', 'HY-BH', 'HY-DAA', 'EQ-LC', 'DT-SD',
    'DT-CB', 'HY-MAA', 'HY-EQ S', 'EQ-L&MC',
  ],
  long: [
    'EQ-FLX', 'EQ-MC', 'EQ-SC', 'EQ-ELSS', 'EQ-L&MC',
    'EQ-MLC', 'EQ-LC', 'EQ-VAL', 'EQ-Quant',
    'EQ-SA&T', 'EQ-THEMATIC',
  ],
};

// ── Experience Level → Category Codes ──
export const EXPERIENCE_CATEGORY_MAP: Record<string, string[]> = {
  beginner: [
    'EQ-LC',       // Large Cap (acts as proxy for Index-like)
    'HY-CH',       // Conservative Hybrid
    'HY-DAA',      // Balanced Advantage
    'DT-LIQ',      // Liquid
    'DT-USD',      // Ultra Short
    'DT-CB',       // Corporate Bond
    'DT-BK & PSU',
    'EQ-FLX',      // Flexi Cap (broad, diversified)
  ],
  intermediate: [
    'EQ-FLX', 'EQ-LC', 'EQ-L&MC', 'EQ-MLC',
    'HY-BH', 'HY-DAA', 'HY-MAA',
    'EQ-VAL', 'EQ-ELSS',
    'DT-SD', 'DT-CB', 'DT-GL',
  ],
  experienced: [
    'EQ-MC', 'EQ-SC', 'EQ-SA&T', 'EQ-THEMATIC',
    'EQ-Quant', 'EQ-BANK', 'EQ-IT', 'EQ-Pharma',
    'EQ-INFRA', 'EQ-PSU', 'EQ-Energy', 'EQ-Consumption',
    'EQ-TBC', 'EQ-Manufacturing', 'EQ-Innovation',
    'EQ-FLX', 'EQ-LC', 'EQ-L&MC', 'EQ-MLC', 'EQ-VAL', 'EQ-ELSS',
    'DT-CR',  // Credit Risk — only for experienced
    'Gold-Funds', 'Silver-Funds',
  ],
};

// ── Exclusion list — permanently excluded fund names ──
export const EXCLUDED_FUND_NAMES = [
  'bharat 22 etf',
];
