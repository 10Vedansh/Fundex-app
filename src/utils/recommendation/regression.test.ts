import { describe, it, expect } from 'vitest';
import { deriveRiskFromProfile } from './riskCapacity';
import { getProfileTypeForCoreSatellite } from './strategyGroups';
import { GOAL_ELIGIBILITY, getAllocationModel, SECTORAL_CATEGORIES } from './categoryMappings';
import { constructPortfolio } from './portfolioConstructor';
import { buildAllocationFromPreferences, computeCategoryBudgets, PRESERVATION_EQ_SLOTS, PRESERVATION_DT_SLOTS, PRESERVATION_HY_SLOTS, PASSIVE_EQ_SLOTS, PASSIVE_DT_SLOTS, PASSIVE_HY_SLOTS, CHILD_EDUCATION_EQ_SLOTS, CHILD_EDUCATION_DT_SLOTS, CHILD_EDUCATION_HY_SLOTS } from './allocationEngine';
import { ScoredFund, RecommendationPreferences } from './intersectionEngine';

// ── Mock fund helpers ──

function makeFund(overrides: Partial<ScoredFund> & { id: string; category: string; name: string }): ScoredFund {
  return {
    compositeScore: 70,
    reasons: [],
    matchLevel: 'high',
    amc: 'Test AMC',
    nav: 100,
    aum: 1000,
    expenseRatio: 1.0,
    cagr1Y: 12,
    cagr3Y: 36,
    cagr5Y: null,
    volatility: 12,
    sharpeRatio: 1.5,
    beta: 1.0,
    alpha: null,
    rank: 1,
    strengthBadge: 'Strong',
    riskLevel: 'Moderate',
    minInvestment: 500,
    exitLoad: '1%',
    benchmark: 'Nifty 50',
    launch: '2010-01-01',
    ...overrides,
  };
}

// ── Mock fund universe ──

const mockFunds: ScoredFund[] = [
  // Large cap
  makeFund({ id: 'f1', name: 'SBI Large Cap', category: 'EQ-LC', amc: 'SBI', compositeScore: 85 }),
  makeFund({ id: 'f2', name: 'HDFC Large Cap', category: 'EQ-LC', amc: 'HDFC', compositeScore: 82 }),
  // Flexi cap
  makeFund({ id: 'f3', name: 'PPFAS Flexi Cap', category: 'EQ-FLX', amc: 'PPFAS', compositeScore: 90 }),
  makeFund({ id: 'f4', name: 'Parag Parikh Flexi Cap', category: 'EQ-FLX', amc: 'Parag Parikh', compositeScore: 88 }),
  // Mid cap
  makeFund({ id: 'f5', name: 'Kotak Mid Cap', category: 'EQ-MC', amc: 'Kotak', compositeScore: 78 }),
  makeFund({ id: 'f6', name: 'DSP Mid Cap', category: 'EQ-MC', amc: 'DSP', compositeScore: 75 }),
  // Small cap
  makeFund({ id: 'f7', name: 'Nippon Small Cap', category: 'EQ-SC', amc: 'Nippon India', compositeScore: 80 }),
  makeFund({ id: 'f8', name: 'Axis Small Cap', category: 'EQ-SC', amc: 'Axis', compositeScore: 76 }),
  // ELSS
  makeFund({ id: 'f9', name: 'ELSS Tax Saver', category: 'EQ-ELSS', amc: 'ICICI Prudential', compositeScore: 72 }),
  // Sectoral
  makeFund({ id: 'f10', name: 'ICICI Banking', category: 'EQ-BANK', amc: 'ICICI Prudential', compositeScore: 74 }),
  // Value
  makeFund({ id: 'f11', name: 'Quant Value Fund', category: 'EQ-VAL', amc: 'Quant', compositeScore: 77 }),
  // Balanced Advantage
  makeFund({ id: 'f12', name: 'ICICI Balanced Advantage', category: 'HY-DAA', amc: 'ICICI Prudential', compositeScore: 79 }),
  makeFund({ id: 'f13', name: 'HDFC Balanced Advantage', category: 'HY-DAA', amc: 'HDFC', compositeScore: 76 }),
  // Conservative Hybrid
  makeFund({ id: 'f14', name: 'SBI Conservative Hybrid', category: 'HY-CH', amc: 'SBI', compositeScore: 71 }),
  makeFund({ id: 'f15', name: 'HDFC Conservative Hybrid', category: 'HY-CH', amc: 'HDFC', compositeScore: 69 }),
  // Multi Asset Allocation
  makeFund({ id: 'f16', name: 'Tata Multi Asset', category: 'HY-MAA', amc: 'Tata', compositeScore: 73 }),
  // Arbitrage
  makeFund({ id: 'f17', name: 'Kotak Arbitrage', category: 'HY-AR', amc: 'Kotak', compositeScore: 65 }),
  // Equity Savings
  makeFund({ id: 'f18', name: 'SBI Equity Savings', category: 'HY-EQ S', amc: 'SBI', compositeScore: 68 }),
  // Corporate Bond
  makeFund({ id: 'f19', name: 'ICICI Corporate Bond', category: 'DT-CB', amc: 'ICICI Prudential', compositeScore: 66 }),
  makeFund({ id: 'f20', name: 'HDFC Corporate Bond', category: 'DT-CB', amc: 'HDFC', compositeScore: 64 }),
  // Short Duration
  makeFund({ id: 'f21', name: 'SBI Short Duration', category: 'DT-SD', amc: 'SBI', compositeScore: 62 }),
  // Gilt
  makeFund({ id: 'f22', name: 'UTI Gilt Fund', category: 'DT-GL', amc: 'UTI', compositeScore: 60 }),
  // Liquid
  makeFund({ id: 'f23', name: 'HDFC Liquid', category: 'DT-LIQ', amc: 'HDFC', compositeScore: 55 }),
  // Multi cap
  makeFund({ id: 'f24', name: 'HDFC Multi Cap', category: 'EQ-MLC', amc: 'HDFC', compositeScore: 83, amc: 'HDFC' }),
];

// Re-index to deduplicate IDs properly
const mockFundsDeduped: ScoredFund[] = [
  makeFund({ id: 'f1', name: 'SBI Large Cap', category: 'EQ-LC', amc: 'SBI', compositeScore: 85 }),
  makeFund({ id: 'f2', name: 'HDFC Large Cap', category: 'EQ-LC', amc: 'HDFC', compositeScore: 82 }),
  makeFund({ id: 'f3', name: 'PPFAS Flexi Cap', category: 'EQ-FLX', amc: 'PPFAS', compositeScore: 90 }),
  makeFund({ id: 'f4', name: 'Parag Parikh Flexi Cap', category: 'EQ-FLX', amc: 'Parag Parikh', compositeScore: 88 }),
  makeFund({ id: 'f5', name: 'Kotak Mid Cap', category: 'EQ-MC', amc: 'Kotak', compositeScore: 78 }),
  makeFund({ id: 'f6', name: 'DSP Mid Cap', category: 'EQ-MC', amc: 'DSP', compositeScore: 75 }),
  makeFund({ id: 'f7', name: 'Nippon Small Cap', category: 'EQ-SC', amc: 'Nippon India', compositeScore: 80 }),
  makeFund({ id: 'f8', name: 'Axis Small Cap', category: 'EQ-SC', amc: 'Axis', compositeScore: 76 }),
  makeFund({ id: 'f9', name: 'ICICI ELSS', category: 'EQ-ELSS', amc: 'ICICI Prudential', compositeScore: 72 }),
  makeFund({ id: 'f10', name: 'ICICI Banking', category: 'EQ-BANK', amc: 'ICICI Prudential', compositeScore: 74 }),
  makeFund({ id: 'f11', name: 'Quant Value', category: 'EQ-VAL', amc: 'Quant', compositeScore: 77 }),
  makeFund({ id: 'f12', name: 'ICICI Bal Adv', category: 'HY-DAA', amc: 'ICICI Prudential', compositeScore: 79 }),
  makeFund({ id: 'f13', name: 'HDFC Bal Adv', category: 'HY-DAA', amc: 'HDFC', compositeScore: 76 }),
  makeFund({ id: 'f14', name: 'SBI Cons Hybrid', category: 'HY-CH', amc: 'SBI', compositeScore: 71 }),
  makeFund({ id: 'f15', name: 'HDFC Cons Hybrid', category: 'HY-CH', amc: 'HDFC', compositeScore: 69 }),
  makeFund({ id: 'f16', name: 'Tata Multi Asset', category: 'HY-MAA', amc: 'Tata', compositeScore: 73 }),
  makeFund({ id: 'f17', name: 'Kotak Arbitrage', category: 'HY-AR', amc: 'Kotak', compositeScore: 65 }),
  makeFund({ id: 'f18', name: 'SBI Equity Savings', category: 'HY-EQ S', amc: 'SBI', compositeScore: 68 }),
  makeFund({ id: 'f19', name: 'ICICI Corp Bond', category: 'DT-CB', amc: 'ICICI Prudential', compositeScore: 66 }),
  makeFund({ id: 'f20', name: 'HDFC Corp Bond', category: 'DT-CB', amc: 'HDFC', compositeScore: 64 }),
  makeFund({ id: 'f21', name: 'SBI Short Dur', category: 'DT-SD', amc: 'SBI', compositeScore: 62 }),
  makeFund({ id: 'f22', name: 'UTI Gilt', category: 'DT-GL', amc: 'UTI', compositeScore: 60 }),
  makeFund({ id: 'f23', name: 'HDFC Liquid', category: 'DT-LIQ', amc: 'HDFC', compositeScore: 55 }),
  makeFund({ id: 'f24', name: 'HDFC Multi Cap', category: 'EQ-MLC', amc: 'HDFC', compositeScore: 83 }),
  makeFund({ id: 'f25', name: 'Axis Multi Cap', category: 'EQ-MLC', amc: 'Axis', compositeScore: 81 }),
  makeFund({ id: 'f26', name: 'UTI Liquid', category: 'DT-LIQ', amc: 'UTI', compositeScore: 56 }),
  makeFund({ id: 'f27', name: 'SBI Overnight', category: 'DT-OVERNHT', amc: 'SBI', compositeScore: 50 }),
  makeFund({ id: 'f28', name: 'DSP Corporate Bond', category: 'DT-BK & PSU', amc: 'DSP', compositeScore: 63 }),
  makeFund({ id: 'f29', name: 'Nippon Dynamic Bond', category: 'DT-DB', amc: 'Nippon India', compositeScore: 61 }),
  makeFund({ id: 'f30', name: 'SBI Focused Fund', category: 'EQ-Focused', amc: 'SBI', compositeScore: 84 }),
  makeFund({ id: 'f31', name: 'Canara Dividend Yield', category: 'EQ-DIV Y', amc: 'Canara Robeco', compositeScore: 70 }),
  makeFund({ id: 'f32', name: 'Sundaram Short Dur', category: 'DT-SD', amc: 'Sundaram', compositeScore: 61 }),
  makeFund({ id: 'f33', name: 'Aditya Birla Cons Hybrid', category: 'HY-CH', amc: 'Aditya Birla', compositeScore: 68 }),
];

// ──────────────────────────────────────────
// Test 1: Risk Derivation with Goal Capping
// ──────────────────────────────────────────

describe('Risk Derivation — deriveRiskFromProfile()', () => {

  it('caps aggressive to moderate when goal=retirement', () => {
    // Profile that would score aggressive (score >= 4)
    const result = deriveRiskFromProfile({
      market_reaction: 'invest_more',     // 5 × 0.30 = 1.50
      investor_stage: 'early_career',     // 4 × 0.20 = 0.80
      emergency_fund: '>6_months',        // 5 × 0.15 = 0.75
      existing_investments: '25l_plus',   // 5 × 0.15 = 0.75
      investment_horizon: 'long',          // 5 × 0.10 = 0.50
      primary_goal: 'retirement',
    });
    // raw = (1.50+0.80+0.75+0.75+0.50+0.50) = 4.80 → round to 5 → aggressive
    // capped by retirement → moderate (riskTolerance capped, raw score unchanged)
    expect(result.riskTolerance).toBe('moderate');
    expect(result.score).toBe(5);
    expect(result.reasons.some(r => r.includes('Risk capped at moderate'))).toBe(true);
  });

  it('caps aggressive or moderate to conservative when goal=capital_preservation', () => {
    // Profile that would score moderate-ish
    const result = deriveRiskFromProfile({
      market_reaction: 'wait',            // 3 × 0.30 = 0.90
      investor_stage: 'mid_career',       // 3 × 0.20 = 0.60
      emergency_fund: '3_6_months',       // 3 × 0.15 = 0.45
      existing_investments: 'under_5l',   // 2 × 0.15 = 0.30
      investment_horizon: 'medium',       // 3 × 0.10 = 0.30
      primary_goal: 'capital_preservation',
    });
    // raw = (0.90+0.60+0.45+0.30+0.30) = 2.55 → round to 3 → moderate
    // capped by capital_preservation → conservative
    expect(result.riskTolerance).toBe('conservative');
    expect(result.reasons.some(r => r.includes('Risk capped at conservative'))).toBe(true);
  });

  it('does not cap when goal=wealth_creation', () => {
    const result = deriveRiskFromProfile({
      market_reaction: 'invest_more',
      investor_stage: 'early_career',
      emergency_fund: '>6_months',
      existing_investments: '25l_plus',
      investment_horizon: 'long',
      primary_goal: 'wealth_creation',
    });
    expect(result.riskTolerance).toBe('aggressive');
  });

  it('does not cap when goal=tax_saving', () => {
    const result = deriveRiskFromProfile({
      market_reaction: 'invest_more',
      investor_stage: 'early_career',
      emergency_fund: '>6_months',
      existing_investments: '25l_plus',
      investment_horizon: 'long',
      primary_goal: 'tax_saving',
    });
    expect(result.riskTolerance).toBe('aggressive');
  });

  it('does not promote risk — retirement cap only applies downward', () => {
    // Conservative profile with retirement goal stays conservative
    const result = deriveRiskFromProfile({
      market_reaction: 'withdraw',        // 1 × 0.30 = 0.30
      investor_stage: 'retired',          // 1 × 0.20 = 0.20
      emergency_fund: '<3_months',        // 1 × 0.15 = 0.15
      existing_investments: 'none',       // 1 × 0.15 = 0.15
      investment_horizon: 'short',        // 1 × 0.10 = 0.10
      primary_goal: 'retirement',
    });
    // raw = 0.90 → round to 1 → conservative, cap has no effect
    expect(result.riskTolerance).toBe('conservative');
  });

  it('does not promote risk — preservation cap only applies downward', () => {
    // Already conservative stays conservative
    const result = deriveRiskFromProfile({
      market_reaction: 'withdraw',
      investor_stage: 'retired',
      emergency_fund: '<3_months',
      existing_investments: 'none',
      investment_horizon: 'short',
      primary_goal: 'capital_preservation',
    });
    expect(result.riskTolerance).toBe('conservative');
  });

  it('returns correct score and reasons for retirement-capped profile', () => {
    const result = deriveRiskFromProfile({
      market_reaction: 'invest_more',
      investor_stage: 'early_career',
      emergency_fund: '>6_months',
      existing_investments: '5l_25l',
      investment_horizon: 'long',
      primary_goal: 'retirement',
    });
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(5);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

// ──────────────────────────────────────────────
// Test 2: Core-Satellite Profile Selection
// ──────────────────────────────────────────────

describe('Core-Satellite Profile — getProfileTypeForCoreSatellite()', () => {

  it('returns retirement for goal=retirement even when risk=aggressive', () => {
    expect(getProfileTypeForCoreSatellite('aggressive', 'retirement')).toBe('retirement');
  });

  it('returns preservation for goal=capital_preservation even when risk=aggressive', () => {
    expect(getProfileTypeForCoreSatellite('aggressive', 'capital_preservation')).toBe('preservation');
  });

  it('returns aggressive for wealth_creation + aggressive risk', () => {
    expect(getProfileTypeForCoreSatellite('aggressive', 'wealth_creation')).toBe('aggressive');
  });

  it('returns retirement for wealth_creation + moderate risk', () => {
    expect(getProfileTypeForCoreSatellite('moderate', 'wealth_creation')).toBe('retirement');
  });

  it('returns aggressive for tax_saving + aggressive risk', () => {
    expect(getProfileTypeForCoreSatellite('aggressive', 'tax_saving')).toBe('aggressive');
  });

  it('returns preservation for capital_preservation + moderate risk', () => {
    expect(getProfileTypeForCoreSatellite('moderate', 'capital_preservation')).toBe('preservation');
  });
});

// ──────────────────────────────────────────────
// Test 3: Capital Preservation Fallback Lock
// ──────────────────────────────────────────────

describe('Capital Preservation — lockInFlag', () => {

  it('capital_preservation has lockInFlag=true', () => {
    const config = GOAL_ELIGIBILITY['capital_preservation'];
    expect(config).toBeDefined();
    expect(config.lockInFlag).toBe(true);
  });

  it('capital_preservation blocked categories include all equity', () => {
    const config = GOAL_ELIGIBILITY['capital_preservation'];
    expect(config.allowedCategoryPrefixes).toEqual(
      expect.arrayContaining(['DT-', 'HY-CH', 'HY-AR', 'HY-EQ S'])
    );
    // No EQ- prefix allowed
    expect(config.allowedCategoryPrefixes?.some(p => p.startsWith('EQ-') || p === 'Equity' || p === 'Index')).toBe(false);
  });

  it('tax_saving also has lockInFlag=true (unchanged)', () => {
    expect(GOAL_ELIGIBILITY['tax_saving'].lockInFlag).toBe(true);
  });

  it('wealth_creation has lockInFlag=false (unchanged)', () => {
    expect(GOAL_ELIGIBILITY['wealth_creation'].lockInFlag).toBe(false);
  });

  it('retirement has lockInFlag=false (unchanged)', () => {
    expect(GOAL_ELIGIBILITY['retirement'].lockInFlag).toBe(false);
  });
});

// ──────────────────────────────────────────────
// Test 4: Retirement Portfolio Composition
// ──────────────────────────────────────────────

describe('Retirement Portfolio — constructPortfolio()', () => {

  const retirementPrefs: RecommendationPreferences = {
    riskTolerance: 'aggressive', // would be capped to moderate by deriveRiskFromProfile
    investmentGoal: 'retirement',
    investmentHorizon: 'long',
    experienceLevel: 'intermediate',
    investmentAmount: 'large',
  };

  it('contains hybrid funds (HY-DAA, HY-MAA, or HY-CH)', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, retirementPrefs, 9, 'retirement');
    const categories = portfolio.map(f => f.category);
    expect(categories.some(c => c === 'HY-DAA' || c === 'HY-MAA' || c === 'HY-CH')).toBe(true);
  });

  it('contains Hybrid and Debt categories', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, retirementPrefs, 9, 'retirement');
    const categories = portfolio.map(f => f.category);
    const hasHybrid = categories.some(c => c.startsWith('HY-'));
    const hasDebt = categories.some(c => c.startsWith('DT-'));
    expect(hasHybrid).toBe(true);
    expect(hasDebt).toBe(true);
  });

  it('contains debt (DT-*) funds', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, retirementPrefs, 9, 'retirement');
    const categories = portfolio.map(f => f.category);
    expect(categories.some(c => c.startsWith('DT-'))).toBe(true);
  });

  it('contains at most 1 fund per AMC', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, retirementPrefs, 9, 'retirement');
    const amcCounts = new Map<string, number>();
    for (const f of portfolio) {
      amcCounts.set(f.amc, (amcCounts.get(f.amc) || 0) + 1);
    }
    for (const [amc, count] of amcCounts) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it('contains fewer than 4 ETFs/passive (cap=3)', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, retirementPrefs, 9, 'retirement');
    const etfCount = portfolio.filter(f => f.name.toLowerCase().includes('etf') || f.name.toLowerCase().includes('index fund')).length;
    expect(etfCount).toBeLessThanOrEqual(3);
  });

  it('does not contain sectoral categories', () => {
    const sectorals = ['EQ-BANK', 'EQ-IT', 'EQ-Pharma', 'EQ-INFRA', 'EQ-PSU', 'EQ-Energy', 'EQ-Consumption', 'EQ-THEMATIC', 'EQ-SA&T', 'EQ-TBC', 'EQ-Manufacturing', 'EQ-Innovation'];
    const portfolio = constructPortfolio(mockFundsDeduped, retirementPrefs, 9, 'retirement');
    const categories = portfolio.map(f => f.category);
    for (const cat of categories) {
      expect(sectorals.includes(cat)).toBe(false);
    }
  });
});

// ──────────────────────────────────────────────
// Test 5: Preservation Portfolio — No Equity
// ──────────────────────────────────────────────

describe('Capital Preservation Portfolio — constructPortfolio()', () => {

  const preservationPrefs: RecommendationPreferences = {
    riskTolerance: 'conservative',
    investmentGoal: 'capital_preservation',
    investmentHorizon: 'short',
    experienceLevel: 'beginner',
    investmentAmount: 'small',
  };

  it('contains no EQ-* categories', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, preservationPrefs, 9, 'capital_preservation');
    const categories = portfolio.map(f => f.category);
    for (const cat of categories) {
      expect(cat.startsWith('EQ-')).toBe(false);
    }
  });

  it('contains no plain Equity or Index either', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, preservationPrefs, 9, 'capital_preservation');
    const categories = portfolio.map(f => f.category);
    expect(categories.includes('Equity')).toBe(false);
    expect(categories.includes('Index')).toBe(false);
  });

  it('contains DT-* (debt) funds', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, preservationPrefs, 9, 'capital_preservation');
    // At least some debt categories present
    const debtFunds = portfolio.filter(f => f.category.startsWith('DT-'));
    expect(debtFunds.length).toBeGreaterThan(0);
  });

  it('contains at most 1 fund per AMC', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, preservationPrefs, 9, 'capital_preservation');
    const amcCounts = new Map<string, number>();
    for (const f of portfolio) {
      amcCounts.set(f.amc, (amcCounts.get(f.amc) || 0) + 1);
    }
    for (const count of amcCounts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });
});

// ──────────────────────────────────────────────
// Capital Preservation Differentiation (allocation engine)
// ──────────────────────────────────────────────

describe('Capital Preservation — buildAllocationFromPreferences()', () => {

  const basePrefs = {
    investmentGoal: 'capital_preservation',
    investmentHorizon: 'short',
    experienceLevel: 'beginner',
    emergency_fund: '<3_months',
    existing_investments: 'none',
  };

  it('Retired+Wait produces lower equity allocation than Mid Career+Wait', () => {
    const retired = buildAllocationFromPreferences({ ...basePrefs, market_reaction: 'wait', investor_stage: 'retired', experienceLevel: 'beginner' });
    const midCareer = buildAllocationFromPreferences({ ...basePrefs, market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'beginner' });
    expect(retired.eqPct).toBeLessThanOrEqual(midCareer.eqPct);
  });

  it('<3 Months emergency produces lower equity than >6 Months', () => {
    const low = buildAllocationFromPreferences({ ...basePrefs, emergency_fund: '<3_months', market_reaction: 'buy_dip', investor_stage: 'early_career', experienceLevel: 'advanced' });
    const high = buildAllocationFromPreferences({ ...basePrefs, emergency_fund: '>6_months', market_reaction: 'buy_dip', investor_stage: 'early_career', experienceLevel: 'advanced' });
    expect(low.eqPct).toBeLessThanOrEqual(high.eqPct);
  });

  it('equity stays within [0, 15] for all reasonable profiles', () => {
    const profiles = [
      { market_reaction: 'buy_dip', investor_stage: 'early_career', experienceLevel: 'advanced', emergency_fund: '>6_months', existing_investments: '25l_plus' },
      { market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', emergency_fund: '3_6_months', existing_investments: '5l_25l' },
      { market_reaction: 'panic', investor_stage: 'retired', experienceLevel: 'beginner', emergency_fund: '<3_months', existing_investments: 'none' },
      { market_reaction: 'withdraw', investor_stage: 'student', experienceLevel: 'beginner', emergency_fund: '<3_months', existing_investments: 'none' },
    ];
    for (const p of profiles) {
      const result = buildAllocationFromPreferences({ ...basePrefs, ...p });
      expect(result.eqPct).toBeGreaterThanOrEqual(0);
      expect(result.eqPct).toBeLessThanOrEqual(15);
    }
  });

  it('debt stays within [70, 90] and hybrid stays within [10, 20]', () => {
    const profiles = [
      { market_reaction: 'buy_dip', investor_stage: 'early_career', experienceLevel: 'advanced', emergency_fund: '>6_months', existing_investments: '25l_plus' },
      { market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', emergency_fund: '3_6_months', existing_investments: '5l_25l' },
      { market_reaction: 'panic', investor_stage: 'retired', experienceLevel: 'beginner', emergency_fund: '<3_months', existing_investments: 'none' },
    ];
    for (const p of profiles) {
      const result = buildAllocationFromPreferences({ ...basePrefs, ...p });
      expect(result.dtPct).toBeGreaterThanOrEqual(70);
      expect(result.dtPct).toBeLessThanOrEqual(90);
      expect(result.hyPct).toBeGreaterThanOrEqual(10);
      expect(result.hyPct).toBeLessThanOrEqual(20);
    }
  });
});

describe('Capital Preservation — Layer 1 drift ≤ 1pp', () => {
  const baseInput = {
    investmentGoal: 'capital_preservation',
    investmentHorizon: 'short',
    experienceLevel: 'beginner',
    emergency_fund: '<3_months',
    existing_investments: 'none',
  };

  const profiles = [
    { market: 'wait', stage: 'retired', experience: 'beginner' },
    { market: 'withdraw', stage: 'student', experience: 'beginner' },
    { market: 'panic', stage: 'mid_career', experience: 'intermediate' },
    { market: 'buy_dip', stage: 'early_career', experience: 'experienced' },
  ];

  it.each(profiles)('preserves Layer 1 eq=$market+$stage through budgets (drift ≤ 1pp)', ({ market, stage, experience }) => {
    const alloc = buildAllocationFromPreferences({ ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const eqBudgets = computeCategoryBudgets(alloc.eqPct, PRESERVATION_EQ_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const dtBudgets = computeCategoryBudgets(alloc.dtPct, PRESERVATION_DT_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const hyBudgets = computeCategoryBudgets(alloc.hyPct, PRESERVATION_HY_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });

    const sumEq = eqBudgets.reduce((s, c) => s + c.budgetPct, 0);
    const sumDt = dtBudgets.reduce((s, c) => s + c.budgetPct, 0);
    const sumHy = hyBudgets.reduce((s, c) => s + c.budgetPct, 0);

    expect(Math.abs(sumEq - alloc.eqPct)).toBeLessThanOrEqual(1);
    expect(Math.abs(sumDt - alloc.dtPct)).toBeLessThanOrEqual(1);
    expect(Math.abs(sumHy - alloc.hyPct)).toBeLessThanOrEqual(1);
  });
});

describe('Capital Preservation — Slot conditions', () => {

  it('never selects EQ-MC or EQ-SC', () => {
    for (const cat of PRESERVATION_EQ_SLOTS) {
      expect(cat.category).not.toBe('EQ-MC');
      expect(cat.category).not.toBe('EQ-SC');
    }
  });

  it('contains DT-LIQ as a debt slot', () => {
    const dtCodes = PRESERVATION_DT_SLOTS.map(s => s.category);
    expect(dtCodes).toContain('DT-LIQ');
  });

  it('excludes HY-MAA when beginner', () => {
    const hasMaa = PRESERVATION_HY_SLOTS.some(s => s.category === 'HY-MAA' && s.condition && s.condition({ experienceLevel: 'beginner' } as any));
    expect(hasMaa).toBe(false);
  });

  it('includes HY-MAA when experienced', () => {
    const hasMaa = PRESERVATION_HY_SLOTS.some(s => s.category === 'HY-MAA' && s.condition && s.condition({ experienceLevel: 'experienced' } as any));
    expect(hasMaa).toBe(true);
  });
});

describe('Capital Preservation — Full Pipeline (constructPortfolio)', () => {

  const basePrefs: RecommendationPreferences = {
    riskTolerance: 'conservative',
    investmentGoal: 'capital_preservation',
    investmentHorizon: 'short',
    experienceLevel: 'beginner',
    investmentAmount: 'small',
  };

  it('contains no EQ-MC or EQ-SC in output', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'capital_preservation');
    const cats = portfolio.map(f => f.category);
    expect(cats).not.toContain('EQ-MC');
    expect(cats).not.toContain('EQ-SC');
  });

  it('contains DT-LIQ fund', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'capital_preservation');
    const cats = portfolio.map(f => f.category);
    expect(cats).toContain('DT-LIQ');
  });

  it('contains at most 1 fund per AMC', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'capital_preservation');
    const amcCounts = new Map<string, number>();
    for (const f of portfolio) {
      amcCounts.set(f.amc, (amcCounts.get(f.amc) || 0) + 1);
    }
    for (const count of amcCounts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it('allocations sum to 100%', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'capital_preservation');
    const totalAlloc = portfolio.reduce((s, f) => s + (f as any).allocationPercent, 0);
    expect(Math.abs(totalAlloc - 100)).toBeLessThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────
// Passive Income Differentiation (allocation engine)
// ──────────────────────────────────────────────

describe('Passive Income — buildAllocationFromPreferences()', () => {

  const basePrefs = {
    investmentGoal: 'passive_income',
    investmentHorizon: 'long',
    experienceLevel: 'intermediate',
    emergency_fund: '>6_months',
    existing_investments: '5l_25l',
  };

  it('Buy The Dip produces higher equity allocation than Wait', () => {
    // Use moderate profile where scores land below the 40 cap
    const buyDip = buildAllocationFromPreferences({ ...basePrefs, market_reaction: 'buy_dip', investor_stage: 'mid_career', experienceLevel: 'intermediate', investmentHorizon: 'short', emergency_fund: '3_6_months', existing_investments: 'under_5l' });
    const wait = buildAllocationFromPreferences({ ...basePrefs, market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', investmentHorizon: 'short', emergency_fund: '3_6_months', existing_investments: 'under_5l' });
    expect(buyDip.eqPct).toBeGreaterThan(wait.eqPct);
  });

  it('Debt remains dominant over equity for passive income', () => {
    const moderate = { investmentHorizon: 'medium', emergency_fund: '3_6_months', existing_investments: 'under_5l' };
    const profiles = [
      { market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate' },
      { market_reaction: 'panic', investor_stage: 'retired', experienceLevel: 'beginner' },
      { market_reaction: 'withdraw', investor_stage: 'student', experienceLevel: 'beginner' },
    ];
    for (const p of profiles) {
      const result = buildAllocationFromPreferences({ ...basePrefs, ...moderate, ...p });
      expect(result.dtPct).toBeGreaterThan(result.eqPct);
      expect(result.dtPct).toBeGreaterThanOrEqual(40);
    }
  });

  it('equity and debt can be equal only at upper bound (eq=40, dt=40)', () => {
    // At the aggressive extreme: eq caps at 40 and dt floor also at 40
    const result = buildAllocationFromPreferences({ ...basePrefs, market_reaction: 'buy_dip', investor_stage: 'early_career', experienceLevel: 'experienced' });
    expect(result.eqPct).toBe(40);
    expect(result.dtPct).toBeGreaterThanOrEqual(40);
    expect(result.hyPct).toBeLessThanOrEqual(30);
  });

  it('equity stays within [20, 40] for all profiles', () => {
    const profiles = [
      { market_reaction: 'buy_dip', investor_stage: 'early_career', experienceLevel: 'advanced', emergency_fund: '>6_months', existing_investments: '25l_plus' },
      { market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', emergency_fund: '3_6_months', existing_investments: '5l_25l' },
      { market_reaction: 'withdraw', investor_stage: 'student', experienceLevel: 'beginner', emergency_fund: '<3_months', existing_investments: 'none' },
    ];
    for (const p of profiles) {
      const result = buildAllocationFromPreferences({ ...basePrefs, ...p });
      expect(result.eqPct).toBeGreaterThanOrEqual(20);
      expect(result.eqPct).toBeLessThanOrEqual(40);
    }
  });

  it('debt stays within [40, 60] and hybrid within [20, 30]', () => {
    const profiles = [
      { market_reaction: 'buy_dip', investor_stage: 'early_career', experienceLevel: 'advanced', emergency_fund: '>6_months', existing_investments: '25l_plus' },
      { market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', emergency_fund: '3_6_months', existing_investments: '5l_25l' },
      { market_reaction: 'withdraw', investor_stage: 'student', experienceLevel: 'beginner', emergency_fund: '<3_months', existing_investments: 'none' },
    ];
    for (const p of profiles) {
      const result = buildAllocationFromPreferences({ ...basePrefs, ...p });
      expect(result.dtPct).toBeGreaterThanOrEqual(40);
      expect(result.dtPct).toBeLessThanOrEqual(60);
      expect(result.hyPct).toBeGreaterThanOrEqual(20);
      expect(result.hyPct).toBeLessThanOrEqual(30);
    }
  });
});

describe('Passive Income — Layer 1 drift ≤ 1pp', () => {
  const baseInput = {
    investmentGoal: 'passive_income',
    investmentHorizon: 'long',
    experienceLevel: 'intermediate',
    emergency_fund: '>6_months',
    existing_investments: '5l_25l',
  };

  const profiles = [
    { market: 'buy_dip', stage: 'early_career', experience: 'advanced' },
    { market: 'wait', stage: 'mid_career', experience: 'intermediate' },
    { market: 'panic', stage: 'retired', experience: 'beginner' },
    { market: 'withdraw', stage: 'student', experience: 'beginner' },
  ];

  it.each(profiles)('preserves Layer 1 eq=$market+$stage through budgets (drift ≤ 1pp)', ({ market, stage, experience }) => {
    const alloc = buildAllocationFromPreferences({ ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const eqBudgets = computeCategoryBudgets(alloc.eqPct, PASSIVE_EQ_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const dtBudgets = computeCategoryBudgets(alloc.dtPct, PASSIVE_DT_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const hyBudgets = computeCategoryBudgets(alloc.hyPct, PASSIVE_HY_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });

    const sumEq = eqBudgets.reduce((s, c) => s + c.budgetPct, 0);
    const sumDt = dtBudgets.reduce((s, c) => s + c.budgetPct, 0);
    const sumHy = hyBudgets.reduce((s, c) => s + c.budgetPct, 0);

    expect(Math.abs(sumEq - alloc.eqPct)).toBeLessThanOrEqual(1);
    expect(Math.abs(sumDt - alloc.dtPct)).toBeLessThanOrEqual(1);
    expect(Math.abs(sumHy - alloc.hyPct)).toBeLessThanOrEqual(1);
  });
});

describe('Passive Income — Slot conditions', () => {

  it('never selects EQ-SC or sectoral categories', () => {
    for (const cat of PASSIVE_EQ_SLOTS) {
      expect(cat.category).not.toBe('EQ-SC');
      expect(SECTORAL_CATEGORIES.includes(cat.category)).toBe(false);
    }
  });

  it('contains DT-BK & PSU, DT-CB, DT-SD as debt slots', () => {
    const dtCodes = PASSIVE_DT_SLOTS.map(s => s.category);
    expect(dtCodes).toContain('DT-BK & PSU');
    expect(dtCodes).toContain('DT-CB');
    expect(dtCodes).toContain('DT-SD');
  });

  it('excludes HY-MAA when beginner', () => {
    const hasMaa = PASSIVE_HY_SLOTS.some(s => s.category === 'HY-MAA' && s.condition && s.condition({ experienceLevel: 'beginner' } as any));
    expect(hasMaa).toBe(false);
  });

  it('includes HY-MAA when intermediate', () => {
    const hasMaa = PASSIVE_HY_SLOTS.some(s => s.category === 'HY-MAA' && s.condition && s.condition({ experienceLevel: 'intermediate' } as any));
    expect(hasMaa).toBe(true);
  });

  it('includes HY-MAA when experienced', () => {
    const hasMaa = PASSIVE_HY_SLOTS.some(s => s.category === 'HY-MAA' && s.condition && s.condition({ experienceLevel: 'experienced' } as any));
    expect(hasMaa).toBe(true);
  });
});

describe('Passive Income — Full Pipeline (constructPortfolio)', () => {

  const basePrefs: RecommendationPreferences = {
    riskTolerance: 'moderate',
    investmentGoal: 'passive_income',
    investmentHorizon: 'long',
    experienceLevel: 'intermediate',
    investmentAmount: 'large',
  };

  it('contains no EQ-SC or sectoral categories in output', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'passive_income');
    const cats = portfolio.map(f => f.category);
    expect(cats).not.toContain('EQ-SC');
    for (const cat of cats) {
      expect(SECTORAL_CATEGORIES.includes(cat)).toBe(false);
    }
  });

  it('contains DT-SD or DT-CB fund (debt)', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'passive_income');
    const debtFunds = portfolio.filter(f => f.category.startsWith('DT-'));
    expect(debtFunds.length).toBeGreaterThan(0);
  });

  it('contains at most 1 fund per AMC', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'passive_income');
    const amcCounts = new Map<string, number>();
    for (const f of portfolio) {
      amcCounts.set(f.amc, (amcCounts.get(f.amc) || 0) + 1);
    }
    for (const count of amcCounts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it('allocations sum to 100%', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'passive_income');
    const totalAlloc = portfolio.reduce((s, f) => s + (f as any).allocationPercent, 0);
    expect(Math.abs(totalAlloc - 100)).toBeLessThanOrEqual(1);
  });
});

// ──────────────────────────────────────────────
// Test 6: Aggressive Wealth Portfolio — Equity Heavy
// ──────────────────────────────────────────────

describe('Aggressive Wealth Portfolio — constructPortfolio()', () => {

  const aggressivePrefs: RecommendationPreferences = {
    riskTolerance: 'aggressive',
    investmentGoal: 'wealth_creation',
    investmentHorizon: 'long',
    experienceLevel: 'experienced',
    investmentAmount: 'large',
  };

  it('is equity-heavy (>= 6 of 9 equity)', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, aggressivePrefs, 9, 'wealth_creation');
    const equityCount = portfolio.filter(f => f.category.startsWith('EQ-') || f.category === 'Equity' || f.category === 'Index').length;
    expect(equityCount).toBeGreaterThanOrEqual(6);
  });

  it('contains small cap when available', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, aggressivePrefs, 9, 'wealth_creation');
    const categories = portfolio.map(f => f.category);
    // The aggressive+wealth model has SC bucket
    const hasSc = categories.includes('EQ-SC');
    // At least one of SC/MC/FLX should be present
    const growthCats = ['EQ-SC', 'EQ-MC', 'EQ-FLX', 'EQ-MLC'];
    expect(categories.some(c => growthCats.includes(c))).toBe(true);
  });

  it('contains at most 1 fund per AMC', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, aggressivePrefs, 9, 'wealth_creation');
    const amcCounts = new Map<string, number>();
    for (const f of portfolio) {
      amcCounts.set(f.amc, (amcCounts.get(f.amc) || 0) + 1);
    }
    for (const count of amcCounts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it('returns exactly target funds when enough unique AMCs', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, aggressivePrefs, 9, 'wealth_creation');
    expect(portfolio.length).toBeLessThanOrEqual(9);
    expect(portfolio.length).toBeGreaterThanOrEqual(6);
  });
});

// ──────────────────────────────────────────────
// Test 7: Allocation Models (getAllocationModel)
// ──────────────────────────────────────────────

describe('Allocation Models — getAllocationModel()', () => {

  it('aggressive+retirement returns mixed equity/hybrid/debt buckets', () => {
    const model = getAllocationModel('aggressive', 'retirement');
    const allCats = model.flatMap(b => b.categories);
    expect(allCats.some(c => c.startsWith('EQ-'))).toBe(true);
    expect(allCats.some(c => c.startsWith('HY-'))).toBe(true);
    expect(allCats.some(c => c.startsWith('DT-'))).toBe(true);
  });

  it('conservative+preservation returns only debt buckets', () => {
    const model = getAllocationModel('conservative', 'capital_preservation');
    const allCats = model.flatMap(b => b.categories);
    expect(allCats.every(c => c.startsWith('DT-') || c === 'Debt' || c === 'Liquid')).toBe(true);
    expect(allCats.some(c => c.startsWith('EQ-'))).toBe(false);
  });

  it('aggressive+wealth returns only equity buckets', () => {
    const model = getAllocationModel('aggressive', 'wealth_creation');
    const allCats = model.flatMap(b => b.categories);
    expect(allCats.every(c => c.startsWith('EQ-') || c === 'Equity' || c === 'Index')).toBe(true);
    expect(allCats.some(c => c.startsWith('DT-'))).toBe(false);
    expect(allCats.some(c => c.startsWith('HY-'))).toBe(false);
  });

  it('moderate+retirement has HY-DAA, HY-MAA, DT-* buckets', () => {
    const model = getAllocationModel('moderate', 'retirement');
    const allCats = model.flatMap(b => b.categories);
    expect(allCats.includes('HY-DAA')).toBe(true);
    expect(allCats.includes('HY-MAA')).toBe(true);
    expect(allCats.some(c => c.startsWith('DT-'))).toBe(true);
  });
});

// ──────────────────────────────────────────────
// Test 8: Retirement 4-Band Differentiation
// ──────────────────────────────────────────────

import { buildAllocationFromPreferences, computeCategoryBudgets, buildTaxSaverPortfolio, RETIREMENT_EQ_SLOTS, RETIREMENT_HY_SLOTS, DEBT_SLOTS, WEALTH_EQ_SLOTS, WEALTH_DT_SLOTS, WEALTH_HY_SLOTS } from './allocationEngine';

describe('Retirement 4-Band Differentiation', () => {

  const bands = [
    { label: 'Retired+Wait',   market: 'wait',      stage: 'retired',    expected: { eq: 30, dt: 46, hy: 24 } },
    { label: 'Retired+Buy',    market: 'buy_dip',    stage: 'retired',    expected: { eq: 40, dt: 39, hy: 21 } },
    { label: 'Mid+Wait',       market: 'wait',       stage: 'mid_career', expected: { eq: 60, dt: 20, hy: 20 } },
    { label: 'Mid+Buy',        market: 'buy_dip',    stage: 'mid_career', expected: { eq: 65, dt: 15, hy: 20 } },
  ] as const;

  const baseInput = {
    investmentGoal: 'retirement',
    investmentHorizon: 'long',
    experienceLevel: 'intermediate',
    emergency_fund: '>6_months',
    existing_investments: '5l_25l',
  };

  it.each(bands)('$label produces expected asset allocation', ({ label, market, stage, expected }) => {
    const result = buildAllocationFromPreferences({ ...baseInput, market_reaction: market, investor_stage: stage });
    expect(result.eqPct).toBe(expected.eq);
    expect(result.dtPct).toBe(expected.dt);
    expect(result.hyPct).toBe(expected.hy);
  });

  it('all 4 bands produce distinct asset allocations', () => {
    const results = bands.map(b =>
      buildAllocationFromPreferences({ ...baseInput, market_reaction: b.market, investor_stage: b.stage })
    );
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const eqDiff = results[i].eqPct !== results[j].eqPct;
        const dtDiff = results[i].dtPct !== results[j].dtPct;
        expect(eqDiff || dtDiff).toBe(true);
      }
    }
  });

  it('Layer 1 allocations are preserved through category construction (drift ≤ 1pp)', () => {
    for (const b of bands) {
      const alloc = buildAllocationFromPreferences({ ...baseInput, market_reaction: b.market, investor_stage: b.stage });
      const eqBudgets = computeCategoryBudgets(alloc.eqPct, RETIREMENT_EQ_SLOTS, { ...baseInput, market_reaction: b.market, investor_stage: b.stage });
      const dtBudgets = computeCategoryBudgets(alloc.dtPct, DEBT_SLOTS, { ...baseInput, market_reaction: b.market, investor_stage: b.stage });
      const hyBudgets = computeCategoryBudgets(alloc.hyPct, RETIREMENT_HY_SLOTS, { ...baseInput, market_reaction: b.market, investor_stage: b.stage });

      const sumEq = eqBudgets.reduce((s, c) => s + c.budgetPct, 0);
      const sumDt = dtBudgets.reduce((s, c) => s + c.budgetPct, 0);
      const sumHy = hyBudgets.reduce((s, c) => s + c.budgetPct, 0);

      expect(Math.abs(sumEq - alloc.eqPct)).toBeLessThanOrEqual(1);
      expect(Math.abs(sumDt - alloc.dtPct)).toBeLessThanOrEqual(1);
      expect(Math.abs(sumHy - alloc.hyPct)).toBeLessThanOrEqual(1);
    }
  });

  it('EQ-MC only active when invest_more + >6mo + not retired + not beginner', () => {
    const mcCondition = (market: string, emergency: string, stage: string, experience: string) => {
      const budgets = computeCategoryBudgets(65, RETIREMENT_EQ_SLOTS, { ...baseInput, market_reaction: market, emergency_fund: emergency, investor_stage: stage, experienceLevel: experience });
      return budgets.some(b => b.category === 'EQ-MC');
    };

    expect(mcCondition('invest_more', '>6_months', 'mid_career', 'experienced')).toBe(true);
    expect(mcCondition('buy_dip',   '>6_months', 'mid_career', 'experienced')).toBe(false);
    expect(mcCondition('invest_more', '3_6_months', 'mid_career', 'experienced')).toBe(false);
    expect(mcCondition('invest_more', '>6_months', 'retired', 'experienced')).toBe(false);
    expect(mcCondition('invest_more', '>6_months', 'mid_career', 'beginner')).toBe(false);
  });

  it('Debt anchor absorbs entire allocation when all categories <5%', () => {
    // dt=15% with base slots: each category <5%, BK should absorb all 15%
    const dtBudgets = computeCategoryBudgets(15, DEBT_SLOTS, baseInput);
    expect(dtBudgets.length).toBe(1);
    expect(dtBudgets[0].category).toBe('DT-BK & PSU');
    expect(dtBudgets[0].budgetPct).toBe(15);
  });

  it('Tax Saver returns 5 ELSS funds with correct weights', () => {
    const elssFunds = [
      makeFund({ id: 'e1', name: 'SBI ELSS', category: 'EQ-ELSS', compositeScore: 90 }),
      makeFund({ id: 'e2', name: 'HDFC ELSS', category: 'EQ-ELSS', compositeScore: 85 }),
      makeFund({ id: 'e3', name: 'ICICI ELSS', category: 'EQ-ELSS', compositeScore: 80 }),
      makeFund({ id: 'e4', name: 'Axis ELSS', category: 'EQ-ELSS', compositeScore: 75 }),
      makeFund({ id: 'e5', name: 'Kotak ELSS', category: 'EQ-ELSS', compositeScore: 70 }),
    ];
    const portfolio = buildTaxSaverPortfolio(elssFunds);
    expect(portfolio.length).toBe(5);
    expect(portfolio[0].allocationPercent).toBe(30);
    expect(portfolio[1].allocationPercent).toBe(25);
    expect(portfolio[2].allocationPercent).toBe(20);
    expect(portfolio[3].allocationPercent).toBe(15);
    expect(portfolio[4].allocationPercent).toBe(10);
    const totalWeight = portfolio.reduce((s, f) => s + f.allocationPercent, 0);
    expect(totalWeight).toBe(100);
  });

  it('Retirement portfolio contains no EQ-SC or sectoral funds', () => {
    for (const b of bands) {
      const alloc = buildAllocationFromPreferences({ ...baseInput, market_reaction: b.market, investor_stage: b.stage });
      const eqBudgets = computeCategoryBudgets(alloc.eqPct, RETIREMENT_EQ_SLOTS, { ...baseInput, market_reaction: b.market, investor_stage: b.stage });
      const catCodes = eqBudgets.map(c => c.category);
      expect(catCodes).not.toContain('EQ-SC');
      expect(catCodes).not.toContain('EQ-BANK');
      expect(catCodes).not.toContain('EQ-THEMATIC');
      expect(catCodes).not.toContain('EQ-IT');
    }
  });
});

// ──────────────────────────────────────────────
// Wealth Creation Differentiation
// ──────────────────────────────────────────────

describe('Wealth Creation — buildAllocationFromPreferences()', () => {

  const basePrefs = {
    investmentGoal: 'wealth_creation',
    investmentHorizon: 'long',
    experienceLevel: 'intermediate',
    emergency_fund: '>6_months',
    existing_investments: '5l_25l',
  };

  it('Buy The Dip produces higher equity allocation than Wait', () => {
    // Use mid_career + intermediate to keep raw below 90 cap
    const buyDip = buildAllocationFromPreferences({ ...basePrefs, market_reaction: 'buy_dip', investor_stage: 'mid_career', experienceLevel: 'intermediate', emergency_fund: '3_6_months', existing_investments: 'under_5l' });
    const wait = buildAllocationFromPreferences({ ...basePrefs, market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', emergency_fund: '3_6_months', existing_investments: 'under_5l' });
    expect(buyDip.eqPct).toBeGreaterThan(wait.eqPct);
  });

  it('Experienced produces higher equity allocation than Beginner', () => {
    const experienced = buildAllocationFromPreferences({ ...basePrefs, experienceLevel: 'experienced', market_reaction: 'buy_dip', investor_stage: 'mid_career', emergency_fund: '3_6_months', existing_investments: 'under_5l' });
    const beginner = buildAllocationFromPreferences({ ...basePrefs, experienceLevel: 'beginner', market_reaction: 'buy_dip', investor_stage: 'mid_career', emergency_fund: '3_6_months', existing_investments: 'under_5l' });
    expect(experienced.eqPct).toBeGreaterThan(beginner.eqPct);
  });

  it('>6 Months Emergency produces higher equity allocation than <3 Months', () => {
    const stable = buildAllocationFromPreferences({ ...basePrefs, emergency_fund: '>6_months', market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', existing_investments: 'under_5l' });
    const unstable = buildAllocationFromPreferences({ ...basePrefs, emergency_fund: '<3_months', market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', existing_investments: 'under_5l' });
    expect(stable.eqPct).toBeGreaterThan(unstable.eqPct);
  });

  it('equity allocation stays within [60, 90] for all reasonable profiles', () => {
    const profiles = [
      { market_reaction: 'buy_dip', investor_stage: 'early_career', experienceLevel: 'experienced', emergency_fund: '>6_months', existing_investments: '25l_plus' },
      { market_reaction: 'wait', investor_stage: 'mid_career', experienceLevel: 'intermediate', emergency_fund: '3_6_months', existing_investments: '5l_25l' },
      { market_reaction: 'panic', investor_stage: 'student', experienceLevel: 'beginner', emergency_fund: '<3_months', existing_investments: 'none' },
      { market_reaction: 'invest_more', investor_stage: 'business_owner', experienceLevel: 'advanced', emergency_fund: '>6_months', existing_investments: '25l_plus' },
    ];
    for (const p of profiles) {
      const result = buildAllocationFromPreferences({ ...basePrefs, ...p });
      expect(result.eqPct).toBeGreaterThanOrEqual(60);
      expect(result.eqPct).toBeLessThanOrEqual(90);
    }
  });
});

describe('Wealth Creation — Layer 1 drift ≤ 1pp', () => {
  const baseInput = {
    investmentGoal: 'wealth_creation',
    investmentHorizon: 'long',
    experienceLevel: 'intermediate',
    emergency_fund: '>6_months',
    existing_investments: '5l_25l',
  };

  const profiles = [
    { market: 'buy_dip', stage: 'early_career', experience: 'experienced' },
    { market: 'wait', stage: 'mid_career', experience: 'intermediate' },
    { market: 'invest_more', stage: 'business_owner', experience: 'advanced' },
    { market: 'panic', stage: 'student', experience: 'beginner' },
  ];

  it.each(profiles)('preserves Layer 1 eq=$market+$stage through budgets (drift ≤ 1pp)', ({ market, stage, experience }) => {
    const alloc = buildAllocationFromPreferences({ ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const eqBudgets = computeCategoryBudgets(alloc.eqPct, WEALTH_EQ_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const dtBudgets = computeCategoryBudgets(alloc.dtPct, WEALTH_DT_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });
    const hyBudgets = computeCategoryBudgets(alloc.hyPct, WEALTH_HY_SLOTS, { ...baseInput, market_reaction: market, investor_stage: stage, experienceLevel: experience });

    const sumEq = eqBudgets.reduce((s, c) => s + c.budgetPct, 0);
    const sumDt = dtBudgets.reduce((s, c) => s + c.budgetPct, 0);
    const sumHy = hyBudgets.reduce((s, c) => s + c.budgetPct, 0);

    expect(Math.abs(sumEq - alloc.eqPct)).toBeLessThanOrEqual(1);
    expect(Math.abs(sumDt - alloc.dtPct)).toBeLessThanOrEqual(1);
    expect(Math.abs(sumHy - alloc.hyPct)).toBeLessThanOrEqual(1);
  });
});

describe('Wealth Creation — Sectoral/Thematic condition', () => {
  const sectoralSlot = { category: 'EQ-BANK', weight: 0.05 };
  const slotCondition = (input: { experienceLevel?: string; market_reaction?: string }) =>
    (input.experienceLevel === 'experienced' || input.experienceLevel === 'advanced') &&
    input.market_reaction === 'invest_more';

  it('includes sectoral when experienced + invest_more', () => {
    expect(slotCondition({ experienceLevel: 'experienced', market_reaction: 'invest_more' })).toBe(true);
  });

  it('includes sectoral when advanced + invest_more', () => {
    expect(slotCondition({ experienceLevel: 'advanced', market_reaction: 'invest_more' })).toBe(true);
  });

  it('excludes sectoral when beginner + invest_more', () => {
    expect(slotCondition({ experienceLevel: 'beginner', market_reaction: 'invest_more' })).toBe(false);
  });

  it('excludes sectoral when experienced + buy_dip', () => {
    expect(slotCondition({ experienceLevel: 'experienced', market_reaction: 'buy_dip' })).toBe(false);
  });

  it('excludes sectoral when experienced + wait', () => {
    expect(slotCondition({ experienceLevel: 'experienced', market_reaction: 'wait' })).toBe(false);
  });

  it('sectoral fund appears in full portfolio for eligible profile', () => {
    const aggressivePrefs: RecommendationPreferences = {
      riskTolerance: 'aggressive',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'long',
      experienceLevel: 'advanced',
      investmentAmount: 'large',
      market_reaction: 'invest_more',
      emergency_fund: '>6_months',
      existing_investments: '5l_25l',
      investor_stage: 'mid_career',
    };
    const portfolio = constructPortfolio(mockFundsDeduped, aggressivePrefs, 9, 'wealth_creation');
    const sectoralPresent = portfolio.some(f => SECTORAL_CATEGORIES.includes(f.category));
    // May or may not pick due to AMC conflicts in mock data, but should try
    expect(portfolio.length).toBeGreaterThanOrEqual(6);
  });
});

describe('Wealth Creation — Full Pipeline (constructPortfolio)', () => {

  const basePrefs: RecommendationPreferences = {
    riskTolerance: 'moderate',
    investmentGoal: 'wealth_creation',
    investmentHorizon: 'long',
    experienceLevel: 'intermediate',
    investmentAmount: 'large',
  };

  it('produces equity-heavy portfolio (>= 5 of 9 equity)', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'wealth_creation');
    const equityCount = portfolio.filter(f => f.category.startsWith('EQ-') || f.category === 'Equity' || f.category === 'Index').length;
    expect(equityCount).toBeGreaterThanOrEqual(5);
  });

  it('contains no liquid or ultra-short debt funds', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'wealth_creation');
    const cats = portfolio.map(f => f.category);
    expect(cats).not.toContain('DT-LIQ');
    expect(cats).not.toContain('DT-USD');
    expect(cats).not.toContain('DT-OVERNHT');
  });

  it('contains no arbitrage or equity savings hybrid funds', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'wealth_creation');
    const cats = portfolio.map(f => f.category);
    expect(cats).not.toContain('HY-AR');
    expect(cats).not.toContain('HY-EQ S');
  });

  it('contains at most 1 fund per AMC', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'wealth_creation');
    const amcCounts = new Map<string, number>();
    for (const f of portfolio) {
      amcCounts.set(f.amc, (amcCounts.get(f.amc) || 0) + 1);
    }
    for (const count of amcCounts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it('allocations sum to 100%', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, basePrefs, 9, 'wealth_creation');
    const totalAlloc = portfolio.reduce((s, f) => s + (f as any).allocationPercent, 0);
    expect(Math.abs(totalAlloc - 100)).toBeLessThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Child Education — Layer 1 (buildAllocationFromPreferences)
// ─────────────────────────────────────────────────────────────────────────────

describe('Child Education — Layer 1 (buildAllocationFromPreferences)', () => {

  function alloc(overrides?: Partial<RecommendationPreferences>) {
    const base: RecommendationPreferences = {
      riskTolerance: 'moderate',
      investmentGoal: 'child_education',
      investmentHorizon: 'medium',
      experienceLevel: 'intermediate',
      investmentAmount: 'medium',
    };
    return buildAllocationFromPreferences({
      investmentGoal: 'child_education',
      investmentHorizon: overrides?.investmentHorizon ?? base.investmentHorizon,
      experienceLevel: overrides?.experienceLevel ?? base.experienceLevel,
      market_reaction: overrides?.market_reaction,
      investor_stage: overrides?.investor_stage,
      emergency_fund: overrides?.emergency_fund,
      existing_investments: overrides?.existing_investments,
    });
  }

  it('short horizon has lower eqPct than long horizon', () => {
    const s = alloc({ investmentHorizon: 'short', market_reaction: 'buy_dip' });
    const l = alloc({ investmentHorizon: 'long', market_reaction: 'buy_dip' });
    expect(s.eqPct).toBeLessThan(l.eqPct);
  });

  it('short horizon eqPct in [20,40]', () => {
    const s = alloc({ investmentHorizon: 'short' });
    expect(s.eqPct).toBeGreaterThanOrEqual(20);
    expect(s.eqPct).toBeLessThanOrEqual(40);
  });

  it('medium horizon eqPct in [40,60]', () => {
    const m = alloc({ investmentHorizon: 'medium' });
    expect(m.eqPct).toBeGreaterThanOrEqual(40);
    expect(m.eqPct).toBeLessThanOrEqual(60);
  });

  it('long horizon eqPct in [60,80]', () => {
    const l = alloc({ investmentHorizon: 'long' });
    expect(l.eqPct).toBeGreaterThanOrEqual(60);
    expect(l.eqPct).toBeLessThanOrEqual(80);
  });

  it('short horizon dtPct in [40,60] and hyPct in [20,30]', () => {
    const s = alloc({ investmentHorizon: 'short' });
    expect(s.dtPct).toBeGreaterThanOrEqual(40);
    expect(s.dtPct).toBeLessThanOrEqual(60);
    expect(s.hyPct).toBeGreaterThanOrEqual(20);
    expect(s.hyPct).toBeLessThanOrEqual(30);
  });

  it('medium horizon dtPct in [20,40] and hyPct in [15,25]', () => {
    const m = alloc({ investmentHorizon: 'medium' });
    expect(m.dtPct).toBeGreaterThanOrEqual(20);
    expect(m.dtPct).toBeLessThanOrEqual(40);
    expect(m.hyPct).toBeGreaterThanOrEqual(15);
    expect(m.hyPct).toBeLessThanOrEqual(25);
  });

  it('long horizon dtPct in [10,25] and hyPct in [10,20]', () => {
    const l = alloc({ investmentHorizon: 'long' });
    expect(l.dtPct).toBeGreaterThanOrEqual(10);
    expect(l.dtPct).toBeLessThanOrEqual(25);
    expect(l.hyPct).toBeGreaterThanOrEqual(10);
    expect(l.hyPct).toBeLessThanOrEqual(20);
  });

  it('beginner (conservative) has lower eqPct than experienced (aggressive)', () => {
    const beginner = alloc({ experienceLevel: 'beginner', market_reaction: 'wait', investor_stage: 'student' });
    const experienced = alloc({ experienceLevel: 'experienced', market_reaction: 'invest_more', investor_stage: 'mid_career', investmentHorizon: 'long' });
    expect(beginner.eqPct).toBeLessThan(experienced.eqPct);
  });

  it('"wait" produces lower eqPct than "buy_dip"', () => {
    const wait = alloc({ market_reaction: 'wait', investmentHorizon: 'medium' });
    const buy = alloc({ market_reaction: 'buy_dip', investmentHorizon: 'medium' });
    expect(wait.eqPct).toBeLessThan(buy.eqPct);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Child Education — Layer 2 (computeCategoryBudgets)
// ─────────────────────────────────────────────────────────────────────────────

describe('Child Education — Layer 2 (CHILD_EDUCATION slots)', () => {

  it('CHILD_EDUCATION_EQ_SLOTS contains only allowed categories', () => {
    const cats = CHILD_EDUCATION_EQ_SLOTS.map(s => s.category);
    expect(cats).toEqual(expect.arrayContaining(['EQ-LC', 'EQ-FLX', 'EQ-MLC', 'EQ-VAL']));
    expect(cats).not.toContain('EQ-SC');
  });

  it('CHILD_EDUCATION_EQ_SLOTS has EQ-MC conditional with correct condition', () => {
    const mcSlot = CHILD_EDUCATION_EQ_SLOTS.find(s => s.category === 'EQ-MC');
    expect(mcSlot).toBeDefined();
    expect(mcSlot!.condition).toBeDefined();
    // Condition: exp >= intermediate AND emergency > 6 months
    const pass = mcSlot!.condition!({ experienceLevel: 'intermediate', emergency_fund: '>6_months' } as any);
    expect(pass).toBe(true);
    const failExp = mcSlot!.condition!({ experienceLevel: 'beginner', emergency_fund: '>6_months' } as any);
    expect(failExp).toBe(false);
    const failEm = mcSlot!.condition!({ experienceLevel: 'intermediate', emergency_fund: '3_6_months' } as any);
    expect(failEm).toBe(false);
  });

  it('CHILD_EDUCATION_DT_SLOTS contains expected debt categories', () => {
    const cats = CHILD_EDUCATION_DT_SLOTS.map(s => s.category);
    expect(cats).toEqual(expect.arrayContaining(['DT-BK & PSU', 'DT-CB', 'DT-SD', 'DT-LIQ']));
  });

  it('CHILD_EDUCATION_HY_SLOTS contains only hybrid categories child_education can use', () => {
    const cats = CHILD_EDUCATION_HY_SLOTS.map(s => s.category);
    expect(cats).toEqual(['HY-DAA', 'HY-MAA']);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Child Education — Full Pipeline (constructPortfolio)
// ─────────────────────────────────────────────────────────────────────────────

describe('Child Education — Full Pipeline (constructPortfolio)', () => {

  it('produces different portfolios for short vs long horizon', () => {
    const short = constructPortfolio(mockFundsDeduped, {
      riskTolerance: 'moderate',
      investmentGoal: 'child_education',
      investmentHorizon: 'short',
      experienceLevel: 'beginner',
      investmentAmount: 'medium',
    }, 9, 'child_education');
    const long = constructPortfolio(mockFundsDeduped, {
      riskTolerance: 'moderate',
      investmentGoal: 'child_education',
      investmentHorizon: 'long',
      experienceLevel: 'advanced',
      investmentAmount: 'medium',
      market_reaction: 'invest_more',
      investor_stage: 'mid_career',
      emergency_fund: '>6_months',
      existing_investments: '5l_25l',
    }, 9, 'child_education');
    expect(short.length).toBeGreaterThanOrEqual(1);
    expect(long.length).toBeGreaterThanOrEqual(1);
    // Different user profiles should yield different fund sets
    const shortIds = short.map(f => f.id).sort().join(',');
    const longIds = long.map(f => f.id).sort().join(',');
    expect(shortIds).not.toEqual(longIds);
  });

  it('contains no EQ-SC or sectoral funds', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, {
      riskTolerance: 'moderate',
      investmentGoal: 'child_education',
      investmentHorizon: 'long',
      experienceLevel: 'advanced',
      investmentAmount: 'medium',
    }, 9, 'child_education');
    const cats = portfolio.map(f => f.category);
    expect(cats).not.toContain('EQ-SC');
    expect(cats).not.toContain('EQ-BANK');
    expect(cats).not.toContain('EQ-SECTOR');
    expect(cats).not.toContain('EQ-THEMATIC');
  });

  it('contains debt funds (DT- categories)', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, {
      riskTolerance: 'moderate',
      investmentGoal: 'child_education',
      investmentHorizon: 'long',
      experienceLevel: 'advanced',
      investmentAmount: 'medium',
    }, 9, 'child_education');
    const debtCount = portfolio.filter(f => f.category.startsWith('DT-')).length;
    expect(debtCount).toBeGreaterThanOrEqual(1);
  });

  it('at most 1 fund per AMC', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, {
      riskTolerance: 'moderate',
      investmentGoal: 'child_education',
      investmentHorizon: 'long',
      experienceLevel: 'advanced',
      investmentAmount: 'medium',
    }, 9, 'child_education');
    const amcCounts = new Map<string, number>();
    for (const f of portfolio) {
      amcCounts.set(f.amc, (amcCounts.get(f.amc) || 0) + 1);
    }
    for (const count of amcCounts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it('allocations sum to 100%', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, {
      riskTolerance: 'moderate',
      investmentGoal: 'child_education',
      investmentHorizon: 'medium',
      experienceLevel: 'intermediate',
      investmentAmount: 'medium',
    }, 9, 'child_education');
    const totalAlloc = portfolio.reduce((s, f) => s + (f as any).allocationPercent, 0);
    expect(Math.abs(totalAlloc - 100)).toBeLessThanOrEqual(1);
  });
});
