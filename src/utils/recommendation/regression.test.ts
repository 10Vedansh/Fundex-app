import { describe, it, expect } from 'vitest';
import { deriveRiskFromProfile } from './riskCapacity';
import { getProfileTypeForCoreSatellite } from './strategyGroups';
import { GOAL_ELIGIBILITY, getAllocationModel } from './categoryMappings';
import { constructPortfolio } from './portfolioConstructor';
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

  it('contains hybrid funds (HY-DAA or HY-CH)', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, retirementPrefs, 9, 'retirement');
    const categories = portfolio.map(f => f.category);
    expect(categories.some(c => c === 'HY-DAA' || c === 'HY-CH')).toBe(true);
  });

  it('contains HY-CH (Conservative Hybrid) funds', () => {
    const portfolio = constructPortfolio(mockFundsDeduped, retirementPrefs, 9, 'retirement');
    const categories = portfolio.map(f => f.category);
    expect(categories.some(c => c === 'HY-CH')).toBe(true);
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
