import { ScoredFund } from './intersectionEngine';
import { normalizeAmcName, toCategoryCode, SECTORAL_CATEGORIES } from './categoryMappings';
import { EQUITY_CATEGORIES } from './categoryMappings';

// ── Types ──

export interface PortfolioAllocation {
  eqPct: number;
  dtPct: number;
  hyPct: number;
}

export interface CategoryBudget {
  category: string;
  budgetPct: number;
  fundCount: number;
}

export interface WeightedFund extends ScoredFund {
  allocationPercent: number;
}

export interface AllocationInput {
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  market_reaction?: string;
  investor_stage?: string;
  emergency_fund?: string;
  existing_investments?: string;
}

// ── Goal/Horizon normalizers (mirrors intersectionEngine) ──

const GOAL_NORMALIZE: Record<string, string> = {
  wealth: 'wealth_creation',
  wealth_creation: 'wealth_creation',
  retirement: 'retirement',
  child_education: 'child_education',
  income: 'passive_income',
  passive_income: 'passive_income',
  tax: 'tax_saving',
  tax_saving: 'tax_saving',
  preservation: 'capital_preservation',
  capital_preservation: 'capital_preservation',
};

const HORIZON_NORMALIZE: Record<string, string> = {
  '<3': 'short',
  '3-5': 'medium',
  '5-10': 'medium',
  '>10': 'long',
  short: 'short',
  medium: 'medium',
  long: 'long',
};

function normGoal(g: string): string { return GOAL_NORMALIZE[g] || 'wealth_creation'; }
function normHorizon(h: string): string { return HORIZON_NORMALIZE[h] || 'medium'; }

const EXPERIENCE_LEVELS = ['beginner', 'intermediate', 'experienced', 'advanced'] as const;
const INVESTOR_STAGES = ['student', 'early_career', 'mid_career', 'business_owner', 'pre_retirement', 'retired'] as const;
const MARKET_REACTIONS = ['invest_more', 'buy_dip', 'wait', 'panic', 'withdraw'] as const;
const EMERGENCY_LEVELS = ['<3_months', '3_6_months', '>6_months'] as const;
const EXISTING_LEVELS = ['none', 'under_5l', '<5l', '5l_25l', '25l_plus'] as const;

// ── Layer 1: Asset Allocation ──

export function buildAllocationFromPreferences(input: AllocationInput): PortfolioAllocation {
  const goal = normGoal(input.investmentGoal);
  const horizon = normHorizon(input.investmentHorizon);

  const goalPts = ptsGoal(goal);
  const marketPts = ptsMarket(input.market_reaction);
  const stagePts = ptsStage(input.investor_stage);
  const horizonPts = ptsHorizon(horizon);
  const emergencyPts = ptsEmergency(input.emergency_fund);
  const experiencePts = ptsExperience(input.experienceLevel);
  const existingPts = ptsExisting(input.existing_investments);

  let raw = goalPts + marketPts + stagePts + horizonPts + emergencyPts + experiencePts + existingPts;
  raw = Math.max(0, Math.min(100, raw));

  // Goal caps
  let eqPct: number;
  if (goal === 'capital_preservation') {
    eqPct = Math.min(Math.max(raw, 0), 15);
  } else if (goal === 'retirement') {
    eqPct = Math.min(raw, 65);
  } else if (goal === 'passive_income') {
    eqPct = Math.min(Math.max(raw, 20), 40);
  } else if (goal === 'wealth_creation') {
    eqPct = Math.min(Math.max(raw, 60), 90);
  } else if (goal === 'child_education') {
    if (horizon === 'short') {
      eqPct = Math.min(Math.max(raw, 20), 40);
    } else if (horizon === 'medium') {
      eqPct = Math.min(Math.max(raw, 40), 60);
    } else {
      eqPct = Math.min(Math.max(raw, 60), 80);
    }
  } else {
    eqPct = raw;
  }

  let dtPct = Math.round((100 - eqPct) * 0.65);
  let hyPct = 100 - eqPct - dtPct;

  // Goal-specific post-adjustments
  if (goal === 'retirement') {
    hyPct = Math.max(hyPct, 20);
    dtPct = 100 - eqPct - hyPct;
  }
  if (goal === 'passive_income') {
    hyPct = Math.max(Math.min(hyPct, 30), 20);
    dtPct = 100 - eqPct - hyPct;
    if (dtPct < 40) { dtPct = 40; hyPct = 100 - eqPct - dtPct; }
    if (dtPct > 60) { dtPct = 60; hyPct = 100 - eqPct - dtPct; }
  }
  if (goal === 'capital_preservation') {
    hyPct = 15;
    dtPct = 100 - eqPct - hyPct;
    if (dtPct < 70) { dtPct = 70; hyPct = 100 - eqPct - dtPct; }
    if (dtPct > 90) { dtPct = 90; hyPct = 100 - eqPct - dtPct; }
  }
  if (goal === 'child_education') {
    if (horizon === 'short') {
      hyPct = Math.max(Math.min(hyPct, 30), 20);
      dtPct = 100 - eqPct - hyPct;
      if (dtPct < 40) { dtPct = 40; hyPct = 100 - eqPct - dtPct; }
      if (dtPct > 60) { dtPct = 60; hyPct = 100 - eqPct - dtPct; }
    } else if (horizon === 'medium') {
      hyPct = Math.max(Math.min(hyPct, 25), 15);
      dtPct = 100 - eqPct - hyPct;
      if (dtPct < 20) { dtPct = 20; hyPct = 100 - eqPct - dtPct; }
      if (dtPct > 40) { dtPct = 40; hyPct = 100 - eqPct - dtPct; }
    } else {
      hyPct = Math.max(Math.min(hyPct, 20), 10);
      dtPct = 100 - eqPct - hyPct;
      if (dtPct < 10) { dtPct = 10; hyPct = 100 - eqPct - dtPct; }
      if (dtPct > 25) { dtPct = 25; hyPct = 100 - eqPct - dtPct; }
    }
  }

  return { eqPct, dtPct, hyPct };
}

// ── Layer 1 point helpers ──

function ptsGoal(g: string): number {
  switch (g) {
    case 'tax_saving': return 60;
    case 'wealth_creation': return 50;
    case 'child_education': return 40;
    case 'retirement': return 30;
    case 'passive_income': return 15;
    case 'capital_preservation': return 0;
    default: return 50;
  }
}

function ptsMarket(r?: string): number {
  switch (r) {
    case 'invest_more': return 20;
    case 'buy_dip': return 10;
    case 'wait': return 0;
    case 'panic': return -20;
    case 'withdraw': return -20;
    default: return 0;
  }
}

function ptsStage(s?: string): number {
  switch (s) {
    case 'early_career': return 20;
    case 'business_owner': return 10;
    case 'mid_career': return 0;
    case 'student': return -10;
    case 'pre_retirement': return -15;
    case 'retired': return -30;
    default: return 0;
  }
}

function ptsHorizon(h: string): number {
  switch (h) {
    case 'long': return 15;
    case 'medium': return 10;
    case 'short': return 0;
    default: return 10;
  }
}

function ptsEmergency(e?: string): number {
  switch (e) {
    case '>6_months': return 10;
    case '3_6_months': return 0;
    case '<3_months': return -10;
    default: return 0;
  }
}

function ptsExperience(e: string): number {
  switch (e) {
    case 'advanced': return 20;
    case 'experienced': return 10;
    case 'intermediate': return 0;
    case 'beginner': return -10;
    default: return 0;
  }
}

function ptsExisting(e?: string): number {
  switch (e) {
    case '25l_plus': return 10;
    case '5l_25l': return 5;
    case 'under_5l': case '<5l': return 0;
    case 'none': return -10;
    default: return 0;
  }
}

// ── Category Slot Definitions ──

interface SlotDef {
  category: string;
  weight: number;
  condition?: (input: AllocationInput) => boolean;
}

export const RETIREMENT_EQ_SLOTS: SlotDef[] = [
  { category: 'EQ-LC', weight: 0.30 },
  { category: 'EQ-FLX', weight: 0.25 },
  { category: 'EQ-MLC', weight: 0.18 },
  { category: 'EQ-VAL', weight: 0.15 },
  {
    category: 'EQ-MC', weight: 0.12,
    condition: (p) =>
      p.market_reaction === 'invest_more' &&
      p.emergency_fund === '>6_months' &&
      p.investor_stage !== 'retired' &&
      p.experienceLevel !== 'beginner',
  },
];

export const DEBT_SLOTS: SlotDef[] = [
  { category: 'DT-BK & PSU', weight: 0.25 },
  { category: 'DT-CB', weight: 0.25 },
  { category: 'DT-SD', weight: 0.25 },
  { category: 'DT-LIQ', weight: 0.15 },
  { category: 'DT-GL', weight: 0.10 },
];

export const RETIREMENT_HY_SLOTS: SlotDef[] = [
  { category: 'HY-DAA', weight: 0.40 },
  { category: 'HY-MAA', weight: 0.30 },
  { category: 'HY-CH', weight: 0.30 },
];

export const WEALTH_EQ_SLOTS: SlotDef[] = [
  { category: 'EQ-LC', weight: 0.26 },
  { category: 'EQ-FLX', weight: 0.21 },
  { category: 'EQ-MLC', weight: 0.16 },
  { category: 'EQ-MC', weight: 0.16 },
  { category: 'EQ-SC', weight: 0.10 },
  { category: 'EQ-VAL', weight: 0.11 },
];

export const WEALTH_DT_SLOTS: SlotDef[] = [
  { category: 'DT-BK & PSU', weight: 0.30 },
  { category: 'DT-CB', weight: 0.30 },
  { category: 'DT-SD', weight: 0.25 },
  { category: 'DT-GL', weight: 0.15 },
];

export const WEALTH_HY_SLOTS: SlotDef[] = [
  { category: 'HY-DAA', weight: 0.40 },
  { category: 'HY-MAA', weight: 0.30 },
  { category: 'HY-CH', weight: 0.30 },
];

export const PRESERVATION_EQ_SLOTS: SlotDef[] = [
  { category: 'EQ-LC', weight: 0.40 },
  { category: 'EQ-FLX', weight: 0.30 },
  { category: 'EQ-VAL', weight: 0.15 },
  { category: 'EQ-MLC', weight: 0.15 },
];

export const PRESERVATION_DT_SLOTS: SlotDef[] = [
  { category: 'DT-LIQ', weight: 0.30 },
  { category: 'DT-USD', weight: 0.25 },
  { category: 'DT-SD', weight: 0.20 },
  { category: 'DT-BK & PSU', weight: 0.15 },
  { category: 'DT-CB', weight: 0.10 },
];

export const PRESERVATION_HY_SLOTS: SlotDef[] = [
  { category: 'HY-DAA', weight: 0.50 },
  { category: 'HY-CH', weight: 0.40 },
  {
    category: 'HY-MAA', weight: 0.10,
    condition: (p) => {
      const exp = p.experienceLevel;
      return exp === 'intermediate' || exp === 'experienced' || exp === 'advanced';
    },
  },
];

export const PASSIVE_EQ_SLOTS: SlotDef[] = [
  { category: 'EQ-LC', weight: 0.50 },
  { category: 'EQ-DIV Y', weight: 0.30 },
  { category: 'EQ-VAL', weight: 0.20 },
];

export const PASSIVE_DT_SLOTS: SlotDef[] = [
  { category: 'DT-BK & PSU', weight: 0.40 },
  { category: 'DT-CB', weight: 0.35 },
  { category: 'DT-SD', weight: 0.25 },
];

export const PASSIVE_HY_SLOTS: SlotDef[] = [
  { category: 'HY-DAA', weight: 0.60 },
  { category: 'HY-CH', weight: 0.30 },
  {
    category: 'HY-MAA', weight: 0.10,
    condition: (p) => {
      const exp = p.experienceLevel;
      return exp === 'intermediate' || exp === 'experienced' || exp === 'advanced';
    },
  },
];

export const CHILD_EDUCATION_EQ_SLOTS: SlotDef[] = [
  { category: 'EQ-LC', weight: 0.30 },
  { category: 'EQ-FLX', weight: 0.25 },
  { category: 'EQ-MLC', weight: 0.20 },
  { category: 'EQ-VAL', weight: 0.15 },
  {
    category: 'EQ-MC', weight: 0.10,
    condition: (p) => {
      const exp = p.experienceLevel;
      const em = p.emergency_fund;
      return (exp === 'intermediate' || exp === 'experienced' || exp === 'advanced') &&
             em === '>6_months';
    },
  },
];

export const CHILD_EDUCATION_DT_SLOTS: SlotDef[] = [
  { category: 'DT-BK & PSU', weight: 0.30 },
  { category: 'DT-CB', weight: 0.25 },
  { category: 'DT-SD', weight: 0.25 },
  { category: 'DT-LIQ', weight: 0.20 },
];

export const CHILD_EDUCATION_HY_SLOTS: SlotDef[] = [
  { category: 'HY-DAA', weight: 0.55 },
  { category: 'HY-MAA', weight: 0.45 },
];

export const DEFAULT_HY_SLOTS: SlotDef[] = [
  { category: 'HY-DAA', weight: 0.35 },
  { category: 'HY-MAA', weight: 0.25 },
  { category: 'HY-CH', weight: 0.25 },
  { category: 'HY-AR', weight: 0.15 },
];

// ── Layer 2: Category Budgets ──

export function computeCategoryBudgets(
  assetPct: number,
  slots: SlotDef[],
  input: AllocationInput,
): CategoryBudget[] {
  if (assetPct <= 0) return [];

  const raw = slots.map(s => ({
    category: s.category,
    rawBudget: assetPct * s.weight,
    active: (s.condition ? s.condition(input) : true),
  }));

  // Filter to categories that pass conditions AND have budget >= 5%
  // (categories with budget < 5% don't get funds unless all are below threshold)
  let active = raw.filter(r => r.active && r.rawBudget >= 5);
  let inactive = raw.filter(r => !r.active || r.rawBudget < 5);

  // Edge case: no active categories → highest priority absorbs all
  if (active.length === 0) {
    return [{
      category: raw[0].category,
      budgetPct: assetPct,
      fundCount: calcFundCount(assetPct),
    }];
  }

  const inactiveTotal = inactive.reduce((s, r) => s + r.rawBudget, 0);
  const activeTotal = active.reduce((s, r) => s + r.rawBudget, 0);

  const result: CategoryBudget[] = active.map(r => {
    const share = inactiveTotal > 0 ? r.rawBudget / activeTotal : 0;
    const budgetPct = r.rawBudget + inactiveTotal * share;
    return {
      category: r.category,
      budgetPct,
      fundCount: calcFundCount(budgetPct),
    };
  });

  return result;
}

function calcFundCount(budgetPct: number): number {
  if (budgetPct >= 30) return 3;
  if (budgetPct >= 15) return 2;
  return 1;
}

// ── Layer 3: Weighted Fund Selection ──

export function selectWeightedFunds(
  scored: ScoredFund[],
  eqBudgets: CategoryBudget[],
  dtBudgets: CategoryBudget[],
  hyBudgets: CategoryBudget[],
  input: AllocationInput,
  targetFundCount: number = 9,
): WeightedFund[] {
  const goal = normGoal(input.investmentGoal);
  const isRetirement = goal === 'retirement';

  // Combine all budgets and determine mandatory categories
  const allBudgets: { category: string; budgetPct: number; fundCount: number; mandatory: boolean }[] = [
    ...eqBudgets.map(b => ({ ...b, mandatory: isRetirement && (b.category === 'EQ-LC' || b.category === 'EQ-FLX') })),
    ...dtBudgets.map(b => ({ ...b, mandatory: isRetirement })),
    ...hyBudgets.map(b => ({ ...b, mandatory: isRetirement })),
  ];

  // Remove categories with budget < 5% (below fundability threshold)
  // Exception: mandatory categories for retirement stay at their natural budget
  let active = allBudgets.filter(b => b.budgetPct >= 5 || b.mandatory);

  // Calculate initial fund count
  let totalFundSlots = active.reduce((s, b) => s + b.fundCount, 0);

  // Adjust fund counts to hit target
  if (totalFundSlots > targetFundCount + 2) {
    // Too many funds: reduce fundCount in non-mandatory lowest-budget categories
    const reducible = active
      .filter(b => !b.mandatory && b.fundCount > 1)
      .sort((a, b) => a.budgetPct - b.budgetPct);

    while (totalFundSlots > targetFundCount + 2 && reducible.length > 0) {
      const target = reducible.shift()!;
      target.fundCount--;
      totalFundSlots--;
      if (target.fundCount > 1) reducible.push(target);
    }
  }

  if (totalFundSlots < targetFundCount - 2) {
    // Too few funds: add to highest-budget categories (max +1 each round)
    const expandable = [...active].sort((a, b) => b.budgetPct - a.budgetPct);

    while (totalFundSlots < targetFundCount - 2 && expandable.length > 0) {
      let added = false;
      for (const b of expandable) {
        if (b.fundCount >= 3) continue;
        b.fundCount++;
        totalFundSlots++;
        added = true;
        break;
      }
      if (!added) break;
    }
  }

  // Enforce mandatory anchors for retirement: at least 1 debt and 1 hybrid
  if (isRetirement) {
    const hasDebt = active.some(b => b.category.startsWith('DT-'));
    const hasHybrid = active.some(b => b.category.startsWith('HY-'));
    if (!hasDebt || !hasHybrid) {
      // Force anchor by slot definition — add from highest-priority category
      if (!hasDebt) {
        const forcedCat = DEBT_SLOTS[0].category;
        active.push({ category: forcedCat, budgetPct: Math.max(5, assetPctForCat(forcedCat, active, dtBudgets, eqBudgets, hyBudgets)), fundCount: 1, mandatory: true });
        totalFundSlots++;
      }
      if (!hasHybrid) {
        const forcedCat = RETIREMENT_HY_SLOTS[0].category;
        active.push({ category: forcedCat, budgetPct: Math.max(5, assetPctForCat(forcedCat, active, dtBudgets, eqBudgets, hyBudgets)), fundCount: 1, mandatory: true });
        totalFundSlots++;
      }
    }
  }

  // Select funds
  const result: WeightedFund[] = [];
  const usedIds = new Set<string>();
  const usedAmcs = new Map<string, number>();
  const usedCategories = new Map<string, number>();

  function canPick(f: ScoredFund): boolean {
    if (usedIds.has(f.id)) return false;
    const amc = normalizeAmcName(f.amc);
    if ((usedAmcs.get(amc) || 0) >= 1) return false;
    return true;
  }

  function isSectoral(code: string): boolean {
    return SECTORAL_CATEGORIES.includes(code);
  }

  function pickBest(category: string, reason: string): WeightedFund | null {
    const isSectoralSlot = category === '**SECTORAL**';
    const candidates = scored
      .filter(f => {
        const code = toCategoryCode(f.category || '');
        return (isSectoralSlot ? isSectoral(code) : code === category) && canPick(f);
      })
      .sort((a, b) => b.compositeScore - a.compositeScore);
    if (candidates.length === 0) return null;
    const f = candidates[0];
    const amc = normalizeAmcName(f.amc);
    usedIds.add(f.id);
    usedAmcs.set(amc, (usedAmcs.get(amc) || 0) + 1);
    usedCategories.set(category, (usedCategories.get(category) || 0) + 1);
    return { ...f, allocationPercent: 0, selectionReason: reason } as WeightedFund;
  }

  // Phase 1: Pick 1 fund per active category
  for (const b of active) {
    for (let i = 0; i < b.fundCount; i++) {
      const fund = pickBest(b.category, `Allocation: ${b.category}`);
      if (fund) {
        fund.allocationPercent = b.budgetPct / b.fundCount;
        result.push(fund);
        if (result.length >= targetFundCount + 2) break;
      }
    }
    if (result.length >= targetFundCount + 2) break;
  }

  // Phase 2: If below target, add from highest-budget categories not yet at 2
  if (result.length < targetFundCount) {
    const sortedByBudget = [...active].sort((a, b) => b.budgetPct - a.budgetPct);
    for (const b of sortedByBudget) {
      if (result.length >= targetFundCount) break;
      const currentCount = usedCategories.get(b.category) || 0;
      if (currentCount >= 2) continue;
      const fund = pickBest(b.category, `Supplement: ${b.category}`);
      if (fund) {
        fund.allocationPercent = b.budgetPct / (currentCount + 1);
        // Rebalance existing funds in same category
        for (const existing of result.filter(f => toCategoryCode(f.category || '') === b.category)) {
          existing.allocationPercent = b.budgetPct / (currentCount + 1);
        }
        result.push(fund);
      }
    }
  }

  // Normalize weights to exactly 100%
  const totalWeight = result.reduce((s, f) => s + f.allocationPercent, 0);
  if (totalWeight > 0 && Math.abs(totalWeight - 100) > 0.5) {
    const factor = 100 / totalWeight;
    result.forEach(f => { f.allocationPercent = Math.round(f.allocationPercent * factor * 100) / 100; });
  }

  // Fix rounding to exactly 100%
  const finalTotal = result.reduce((s, f) => s + f.allocationPercent, 0);
  const diff = Math.round((100 - finalTotal) * 100) / 100;
  if (diff !== 0 && result.length > 0) {
    const largest = result.reduce((a, b) => a.allocationPercent > b.allocationPercent ? a : b);
    largest.allocationPercent = Math.round((largest.allocationPercent + diff) * 100) / 100;
  }

  return result;
}

function assetPctForCat(category: string, active: any[], dtBudgets: CategoryBudget[], eqBudgets: CategoryBudget[], hyBudgets: CategoryBudget[]): number {
  // Find the asset class for this category and return its total allocation
  const all = [...eqBudgets, ...dtBudgets, ...hyBudgets];
  const inSameClass = all.filter(b => {
    if (category.startsWith('DT-')) return b.category.startsWith('DT-');
    if (category.startsWith('HY-')) return b.category.startsWith('HY-');
    if (category.startsWith('EQ-')) return b.category.startsWith('EQ-');
    return false;
  });
  return inSameClass.reduce((s, b) => s + b.budgetPct, 0);
}

// ── Tax Saver Portfolio ──

export function buildTaxSaverPortfolio(scored: ScoredFund[]): WeightedFund[] {
  const elssFunds = scored
    .filter(f => toCategoryCode(f.category || '') === 'EQ-ELSS')
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, 5);

  const weights = [30, 25, 20, 15, 10];

  return elssFunds.map((f, i) => ({
    ...f,
    allocationPercent: weights[i],
    selectionReason: `Tax Saver ELSS #${i + 1}`,
  })) as WeightedFund[];
}
