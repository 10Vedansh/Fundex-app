/**
 * Category corrections for misclassified funds in fund_master_enriched.
 *
 * The Supabase database has ~289 funds with incorrect category values.
 * These corrections are applied automatically when data flows through
 * toMutualFund() in fundMasterAdapter.ts.
 *
 * Corrections are organized by pattern groups and applied in order.
 * More specific patterns must come before generic ones.
 */

export interface CategoryCorrection {
  /** Regex to match scheme_name */
  namePattern: RegExp;
  /** Correct category value */
  correctCategory: string;
  /** Only apply if current category matches one of these patterns */
  ifCurrentCategory?: RegExp;
  /** Human-readable description */
  description: string;
  /** Exclusion: skip if name matches this */
  excludeIf?: RegExp;
}

export const CATEGORY_CORRECTIONS: CategoryCorrection[] = [
  // ── GOLD FUNDS → Commodity - Gold ──
  // IDBI GOLD FUND, Canara Robeco Gold Savings Fund — these are commodity gold funds
  {
    namePattern: /\bgold\s+(fund|savings)/i,
    correctCategory: 'Commodity - Gold',
    ifCurrentCategory: /^(Equity|Other)/i,
    description: 'Gold fund/savings → Commodity - Gold',
  },

  // ── BOND INDEX FUNDS (labeled "Equity - Index") → Debt - Income ──
  // Bond/Gilt/SDL index funds are categorized as "Equity - Index" but track debt indices
  {
    namePattern: /(?:G[- ]?[Ss]ec|SDL|CRISIL|Bharat\s+Bond|AAA\s+CPSE|Bond\s+Plus\s+SDL)/i,
    correctCategory: 'Debt - Income',
    ifCurrentCategory: /^Equity/i,
    description: 'Bond index fund labeled as Equity → Debt - Income',
  },

  // ── BANKING & PSU DEBT → Debt - Banking and PSU ──
  // These are labeled as "Equity - Sectoral - Banking" or "Debt - Income" but are debt funds
  {
    namePattern: /Banking\s+(and|&)\s+PSU/i,
    correctCategory: 'Debt - Banking and PSU',
    ifCurrentCategory: /^(Equity|Debt)/i,
    description: 'Banking & PSU debt → Debt - Banking and PSU',
  },

  // ── GILT INDEX FUNDS → Debt - Gilt ──
  // These track CRISIL IBX Gilt indices but are labeled as "Equity - Index" or "Debt - Income"
  {
    namePattern: /Gilt/i,
    correctCategory: 'Debt - Gilt',
    ifCurrentCategory: /^(Equity|Debt)/i,
    description: 'Gilt fund labeled as Equity → Debt - Gilt',
  },

  // ── GOLD ETF FoFs → Commodity - Gold ──
  // Gold ETF Fund of Funds labeled as "Equity - Index"
  {
    namePattern: /gold\s+etf/i,
    correctCategory: 'Commodity - Gold',
    ifCurrentCategory: /^Equity/i,
    description: 'Gold ETF FoF labeled as Equity → Commodity - Gold',
  },
  {
    namePattern: /\bgold\s+fund/i,
    correctCategory: 'Commodity - Gold',
    ifCurrentCategory: /^Equity/i,
    description: 'Gold Fund labeled as Equity → Commodity - Gold',
  },
  {
    namePattern: /\bgold\b/i,
    correctCategory: 'Commodity - Gold',
    ifCurrentCategory: /^Equity/i,
    excludeIf: /Goldman\s+Sachs/i,
    description: 'Gold-labeled fund → Commodity - Gold',
  },

  // ── LIQUID FUNDS → Debt - Liquid ──
  // Some AMCs (BOI AXA, Essel) misclassified as Equity
  {
    namePattern: /\bliquid\s+fund\b/i,
    correctCategory: 'Debt - Liquid',
    ifCurrentCategory: /^Equity/i,
    description: 'Liquid fund labeled as Equity → Debt - Liquid',
  },

  // ── ULTRA SHORT DURATION → Debt - Ultra Short Duration ──
  {
    namePattern: /ultra\s+short/i,
    correctCategory: 'Debt - Ultra Short Duration',
    ifCurrentCategory: /^Equity/i,
    description: 'Ultra Short Duration fund labeled as Equity → Debt - Ultra Short Duration',
  },

  // ── SHORT TERM INCOME → Debt - Short Duration ──
  {
    namePattern: /Short\s+Term\s+Income/i,
    correctCategory: 'Debt - Short Duration',
    ifCurrentCategory: /^Equity/i,
    description: 'Short Term Income fund labeled as Equity → Debt - Short Duration',
  },

  // ── ARBITRAGE FUNDS → Hybrid - Arbitrage ──
  // Indiabulls Arbitrage Fund misclassified as Equity
  {
    namePattern: /\barbitrage\b/i,
    correctCategory: 'Hybrid - Arbitrage',
    ifCurrentCategory: /^Equity/i,
    description: 'Arbitrage fund labeled as Equity → Hybrid - Arbitrage',
  },

  // ── DEBT-CLASSIFIED EQUITY INDEX FUNDS → Equity - Index ──
  // Bank BeES, Sensex Index funds labeled as "Debt - Income"
  {
    namePattern: /(?:Index\s+Fund.*Sensex|Sensex\s+Advantage|Bank\s+BeES|PSU\s+Bank\s+BeES|Goldman\s+Sachs.*Bank\s+BeES|GS\s+Bank\s+BeES|GS\s+PSU\s+Bank\s+BeES)/i,
    correctCategory: 'Equity - Index',
    ifCurrentCategory: /^Debt/i,
    description: 'Sensex/Bank BeES ETF labeled as Debt → Equity - Index',
  },
];

/**
 * Apply category corrections to a fund based on its scheme name and current category.
 * Returns the corrected category, or the original if no correction applies.
 */
export function applyCorrections(name: string, currentCategory: string): string {
  for (const correction of CATEGORY_CORRECTIONS) {
    // Skip exclusion markers (handled by excludeIf on other rules)
    if (!correction.correctCategory) continue;

    // Check exclusion
    if (correction.excludeIf && correction.excludeIf.test(name)) continue;

    // Check current category filter
    if (correction.ifCurrentCategory && !correction.ifCurrentCategory.test(currentCategory)) continue;

    // Check name pattern
    if (correction.namePattern.test(name)) {
      return correction.correctCategory;
    }
  }
  return currentCategory;
}
