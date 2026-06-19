import { MutualFund } from '@/types/mutualFund';

function f(id: string, name: string, category: string, amc: string, overrides: Partial<MutualFund> = {}): MutualFund {
  return {
    id, name, category, amc,
    nav: 100, aum: 1000, expenseRatio: 1.0,
    cagr1Y: 12, cagr3Y: 36, cagr5Y: null,
    volatility: 12, sharpeRatio: 1.5, beta: 1.0, alpha: null,
    rank: 1, strengthBadge: 'Balanced' as const, riskLevel: 'Moderate' as const,
    minInvestment: 500, exitLoad: 'Nil', benchmark: '',
    launch: '2010-01-01', marketCap: null,
    latestNav: null, previousNav: null, high52W: null, low52W: null,
    turnover: null, stdDev: 12, sortinoRatio: 1.2, infoRatio: null, rSquared: null,
    fundManager: null, ret1W: null, ret1M: null, ret3M: null, ret6M: null,
    ret1Y: 12, ret3Y: 36, ret5Y: null, ret10Y: null,
    avgCreditQuality: null, avgMaturity: null, ytm: null, netAssets: 1000,
    ...overrides,
  };
}

export const MOCK_FUNDS: MutualFund[] = [
  // ── Large Cap (EQ-LC) ──
  f('lc1', 'SBI Large Cap', 'EQ-LC', 'SBI', { sharpeRatio: 1.8, cagr3Y: 38, volatility: 14, stdDev: 14, sortinoRatio: 1.5, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('lc2', 'HDFC Large Cap', 'EQ-LC', 'HDFC', { sharpeRatio: 1.7, cagr3Y: 36, volatility: 13, stdDev: 13, sortinoRatio: 1.4, riskLevel: 'Moderate' }),
  f('lc3', 'ICICI Large Cap', 'EQ-LC', 'ICICI Prudential', { sharpeRatio: 1.6, cagr3Y: 35, volatility: 14, stdDev: 14, sortinoRatio: 1.3, riskLevel: 'Moderate' }),
  f('lc4', 'Kotak Large Cap', 'EQ-LC', 'Kotak', { sharpeRatio: 1.5, cagr3Y: 33, volatility: 15, stdDev: 15, sortinoRatio: 1.2, riskLevel: 'Moderate' }),

  // ── Multi Cap / Flexi Cap (EQ-MLC, EQ-FLX) ──
  f('mlc1', 'HDFC Multi Cap', 'EQ-MLC', 'HDFC', { sharpeRatio: 1.9, cagr3Y: 42, volatility: 16, stdDev: 16, sortinoRatio: 1.6, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('mlc2', 'Axis Multi Cap', 'EQ-MLC', 'Axis', { sharpeRatio: 1.8, cagr3Y: 40, volatility: 15, stdDev: 15, sortinoRatio: 1.5, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('flx1', 'PPFAS Flexi Cap', 'EQ-FLX', 'PPFAS', { sharpeRatio: 2.0, cagr3Y: 45, volatility: 14, stdDev: 14, sortinoRatio: 1.7, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('flx2', 'Parag Parikh Flexi Cap', 'EQ-FLX', 'Parag Parikh', { sharpeRatio: 1.9, cagr3Y: 43, volatility: 15, stdDev: 15, sortinoRatio: 1.6, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),

  // ── Mid Cap (EQ-MC) ──
  f('mc1', 'Kotak Mid Cap', 'EQ-MC', 'Kotak', { sharpeRatio: 1.4, cagr3Y: 44, volatility: 18, stdDev: 18, sortinoRatio: 1.1, riskLevel: 'High' }),
  f('mc2', 'DSP Mid Cap', 'EQ-MC', 'DSP', { sharpeRatio: 1.3, cagr3Y: 42, volatility: 17, stdDev: 17, sortinoRatio: 1.0, riskLevel: 'High' }),
  f('mc3', 'Nippon Mid Cap', 'EQ-MC', 'Nippon India', { sharpeRatio: 1.2, cagr3Y: 40, volatility: 19, stdDev: 19, sortinoRatio: 0.9, riskLevel: 'High' }),

  // ── Small Cap (EQ-SC) ──
  f('sc1', 'Nippon Small Cap', 'EQ-SC', 'Nippon India', { sharpeRatio: 1.1, cagr3Y: 48, volatility: 22, stdDev: 22, sortinoRatio: 0.8, riskLevel: 'High' }),
  f('sc2', 'Axis Small Cap', 'EQ-SC', 'Axis', { sharpeRatio: 1.0, cagr3Y: 46, volatility: 23, stdDev: 23, sortinoRatio: 0.7, riskLevel: 'High' }),
  f('sc3', 'SBI Small Cap', 'EQ-SC', 'SBI', { sharpeRatio: 1.2, cagr3Y: 50, volatility: 21, stdDev: 21, sortinoRatio: 0.9, riskLevel: 'High' }),

  // ── ELSS (EQ-ELSS) ──
  f('elss1', 'ICICI ELSS', 'EQ-ELSS', 'ICICI Prudential', { sharpeRatio: 1.5, cagr3Y: 38, volatility: 15, stdDev: 15, sortinoRatio: 1.2, riskLevel: 'Moderate' }),

  // ── Sectoral / Thematic ──
  f('bank1', 'ICICI Banking Fund', 'EQ-BANK', 'ICICI Prudential', { sharpeRatio: 1.3, cagr3Y: 35, volatility: 20, stdDev: 20, sortinoRatio: 1.0, riskLevel: 'High' }),
  f('it1', 'Tata IT Fund', 'EQ-IT', 'Tata', { sharpeRatio: 1.6, cagr3Y: 30, volatility: 22, stdDev: 22, sortinoRatio: 1.3, riskLevel: 'High' }),
  f('pharma1', 'SBI Pharma', 'EQ-Pharma', 'SBI', { sharpeRatio: 1.4, cagr3Y: 32, volatility: 18, stdDev: 18, sortinoRatio: 1.1, riskLevel: 'High' }),
  f('energy1', 'DSP Energy Fund', 'EQ-Energy', 'DSP', { sharpeRatio: 0.8, cagr3Y: 28, volatility: 24, stdDev: 24, sortinoRatio: 0.6, riskLevel: 'High' }),
  f('infra1', 'Kotak Infrastructure', 'EQ-INFRA', 'Kotak', { sharpeRatio: 0.9, cagr3Y: 25, volatility: 22, stdDev: 22, sortinoRatio: 0.7, riskLevel: 'High' }),

  // ── Value (EQ-VAL) ──
  f('val1', 'Quant Value Fund', 'EQ-VAL', 'Quant', { sharpeRatio: 1.7, cagr3Y: 39, volatility: 16, stdDev: 16, sortinoRatio: 1.4, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('val2', 'SBI Value Fund', 'EQ-VAL', 'SBI', { sharpeRatio: 1.5, cagr3Y: 37, volatility: 15, stdDev: 15, sortinoRatio: 1.2, riskLevel: 'Moderate' }),

  // ── Focused (EQ-Focused) ──
  f('foc1', 'SBI Focused Fund', 'EQ-Focused', 'SBI', { sharpeRatio: 1.8, cagr3Y: 41, volatility: 14, stdDev: 14, sortinoRatio: 1.5, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('foc2', 'HDFC Focused Fund', 'EQ-Focused', 'HDFC', { sharpeRatio: 1.6, cagr3Y: 39, volatility: 15, stdDev: 15, sortinoRatio: 1.3, riskLevel: 'Moderate' }),

  // ── Balanced Advantage (HY-DAA) ──
  f('daa1', 'ICICI Balanced Advantage', 'HY-DAA', 'ICICI Prudential', { sharpeRatio: 2.2, cagr3Y: 30, volatility: 8, stdDev: 8, sortinoRatio: 2.0, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('daa2', 'HDFC Balanced Advantage', 'HY-DAA', 'HDFC', { sharpeRatio: 2.1, cagr3Y: 28, volatility: 9, stdDev: 9, sortinoRatio: 1.9, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('daa3', 'SBI Balanced Advantage', 'HY-DAA', 'SBI', { sharpeRatio: 2.0, cagr3Y: 27, volatility: 8, stdDev: 8, sortinoRatio: 1.8, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),

  // ── Conservative Hybrid (HY-CH) ──
  f('ch1', 'SBI Conservative Hybrid', 'HY-CH', 'SBI', { sharpeRatio: 2.5, cagr3Y: 22, volatility: 6, stdDev: 6, sortinoRatio: 2.3, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ch2', 'HDFC Conservative Hybrid', 'HY-CH', 'HDFC', { sharpeRatio: 2.4, cagr3Y: 21, volatility: 6, stdDev: 6, sortinoRatio: 2.2, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ch3', 'ICICI Conservative Hybrid', 'HY-CH', 'ICICI Prudential', { sharpeRatio: 2.3, cagr3Y: 20, volatility: 7, stdDev: 7, sortinoRatio: 2.1, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Multi Asset Allocation (HY-MAA) ──
  f('maa1', 'Tata Multi Asset', 'HY-MAA', 'Tata', { sharpeRatio: 1.8, cagr3Y: 26, volatility: 10, stdDev: 10, sortinoRatio: 1.5, riskLevel: 'Moderate' }),
  f('maa2', 'Kotak Multi Asset', 'HY-MAA', 'Kotak', { sharpeRatio: 1.7, cagr3Y: 25, volatility: 11, stdDev: 11, sortinoRatio: 1.4, riskLevel: 'Moderate' }),

  // ── Arbitrage (HY-AR) ──
  f('ar1', 'Kotak Arbitrage', 'HY-AR', 'Kotak', { sharpeRatio: 3.5, cagr3Y: 12, volatility: 2, stdDev: 2, sortinoRatio: 3.2, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ar2', 'HDFC Arbitrage', 'HY-AR', 'HDFC', { sharpeRatio: 3.4, cagr3Y: 11, volatility: 2, stdDev: 2, sortinoRatio: 3.1, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ar3', 'SBI Arbitrage', 'HY-AR', 'SBI', { sharpeRatio: 3.3, cagr3Y: 10, volatility: 2, stdDev: 2, sortinoRatio: 3.0, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Equity Savings (HY-EQ S) ──
  f('eqs1', 'SBI Equity Savings', 'HY-EQ S', 'SBI', { sharpeRatio: 2.8, cagr3Y: 18, volatility: 5, stdDev: 5, sortinoRatio: 2.5, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('eqs2', 'HDFC Equity Savings', 'HY-EQ S', 'HDFC', { sharpeRatio: 2.7, cagr3Y: 17, volatility: 5, stdDev: 5, sortinoRatio: 2.4, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Corporate Bond (DT-CB) ──
  f('cb1', 'ICICI Corporate Bond', 'DT-CB', 'ICICI Prudential', { sharpeRatio: 3.0, cagr3Y: 15, volatility: 3, stdDev: 3, sortinoRatio: 2.8, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('cb2', 'HDFC Corporate Bond', 'DT-CB', 'HDFC', { sharpeRatio: 2.9, cagr3Y: 14, volatility: 3, stdDev: 3, sortinoRatio: 2.7, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('cb3', 'SBI Corporate Bond', 'DT-CB', 'SBI', { sharpeRatio: 2.8, cagr3Y: 13, volatility: 4, stdDev: 4, sortinoRatio: 2.6, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Short Duration (DT-SD) ──
  f('sd1', 'SBI Short Duration', 'DT-SD', 'SBI', { sharpeRatio: 3.2, cagr3Y: 14, volatility: 2, stdDev: 2, sortinoRatio: 3.0, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('sd2', 'Kotak Short Duration', 'DT-SD', 'Kotak', { sharpeRatio: 3.1, cagr3Y: 13, volatility: 2, stdDev: 2, sortinoRatio: 2.9, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Gilt (DT-GL) ──
  f('gl1', 'UTI Gilt Fund', 'DT-GL', 'UTI', { sharpeRatio: 2.6, cagr3Y: 16, volatility: 5, stdDev: 5, sortinoRatio: 2.3, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('gl2', 'SBI Gilt Fund', 'DT-GL', 'SBI', { sharpeRatio: 2.5, cagr3Y: 15, volatility: 5, stdDev: 5, sortinoRatio: 2.2, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Liquid (DT-LIQ) ──
  f('liq1', 'HDFC Liquid', 'DT-LIQ', 'HDFC', { sharpeRatio: 4.0, cagr3Y: 8, volatility: 1, stdDev: 1, sortinoRatio: 3.8, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('liq2', 'UTI Liquid', 'DT-LIQ', 'UTI', { sharpeRatio: 3.9, cagr3Y: 7, volatility: 1, stdDev: 1, sortinoRatio: 3.7, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Overnight (DT-OVERNHT) ──
  f('ovn1', 'SBI Overnight', 'DT-OVERNHT', 'SBI', { sharpeRatio: 4.5, cagr3Y: 5, volatility: 0.5, stdDev: 0.5, sortinoRatio: 4.2, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Money Market (DT-MM) ──
  f('mm1', 'Kotak Money Market', 'DT-MM', 'Kotak', { sharpeRatio: 3.8, cagr3Y: 9, volatility: 1.5, stdDev: 1.5, sortinoRatio: 3.5, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('mm2', 'HDFC Money Market', 'DT-MM', 'HDFC', { sharpeRatio: 3.7, cagr3Y: 8, volatility: 1.5, stdDev: 1.5, sortinoRatio: 3.4, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Medium Duration (DT-MD) ──
  f('md1', 'ICICI Medium Duration', 'DT-MD', 'ICICI Prudential', { sharpeRatio: 2.7, cagr3Y: 14, volatility: 4, stdDev: 4, sortinoRatio: 2.4, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Banking & PSU (DT-BK & PSU) ──
  f('bpsu1', 'DSP Banking & PSU', 'DT-BK & PSU', 'DSP', { sharpeRatio: 2.8, cagr3Y: 13, volatility: 3, stdDev: 3, sortinoRatio: 2.5, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Dynamic Bond (DT-DB) ──
  f('db1', 'Nippon Dynamic Bond', 'DT-DB', 'Nippon India', { sharpeRatio: 2.4, cagr3Y: 15, volatility: 6, stdDev: 6, sortinoRatio: 2.1, riskLevel: 'Moderate' }),

  // ── Long Duration (DT-LONG D) ──
  f('ld1', 'SBI Long Duration', 'DT-LONG D', 'SBI', { sharpeRatio: 1.5, cagr3Y: 18, volatility: 10, stdDev: 10, sortinoRatio: 1.2, riskLevel: 'Moderate' }),

  // ── Ultra Short Duration (DT-USD) ──
  f('usd1', 'Kotak Ultra Short Duration', 'DT-USD', 'Kotak', { sharpeRatio: 3.6, cagr3Y: 10, volatility: 1.5, stdDev: 1.5, sortinoRatio: 3.3, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── Floater (DT-Floater) ──
  f('flt1', 'HDFC Floating Rate', 'DT-Floater', 'HDFC', { sharpeRatio: 3.0, cagr3Y: 12, volatility: 2, stdDev: 2, sortinoRatio: 2.7, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── additional funds for AMC diversity ──
  f('lc_extra1', 'Canara Rob Large Cap', 'EQ-LC', 'Canara Robeco', { sharpeRatio: 1.5, cagr3Y: 34, volatility: 14, stdDev: 14, sortinoRatio: 1.2, riskLevel: 'Moderate' }),
  f('lc_extra2', 'Franklin Large Cap', 'EQ-LC', 'Franklin Templeton', { sharpeRatio: 1.4, cagr3Y: 32, volatility: 15, stdDev: 15, sortinoRatio: 1.1, riskLevel: 'Moderate' }),
  f('mc_extra1', 'Edelweiss Mid Cap', 'EQ-MC', 'Edelweiss', { sharpeRatio: 1.3, cagr3Y: 41, volatility: 18, stdDev: 18, sortinoRatio: 1.0, riskLevel: 'High' }),
  f('ch_extra1', 'Canara Rob Conservative Hybrid', 'HY-CH', 'Canara Robeco', { sharpeRatio: 2.3, cagr3Y: 20, volatility: 7, stdDev: 7, sortinoRatio: 2.0, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('cb_extra1', 'Nippon Corporate Bond', 'DT-CB', 'Nippon India', { sharpeRatio: 2.8, cagr3Y: 13, volatility: 3, stdDev: 3, sortinoRatio: 2.5, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ar_extra1', 'ICICI Arbitrage', 'HY-AR', 'ICICI Prudential', { sharpeRatio: 3.4, cagr3Y: 11, volatility: 2, stdDev: 2, sortinoRatio: 3.1, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('sd_extra1', 'ICICI Short Duration', 'DT-SD', 'ICICI Prudential', { sharpeRatio: 3.1, cagr3Y: 13, volatility: 2, stdDev: 2, sortinoRatio: 2.9, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('daa_extra1', 'Kotak Balanced Advantage', 'HY-DAA', 'Kotak', { sharpeRatio: 2.0, cagr3Y: 27, volatility: 9, stdDev: 9, sortinoRatio: 1.8, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('eqs_extra1', 'ICICI Equity Savings', 'HY-EQ S', 'ICICI Prudential', { sharpeRatio: 2.7, cagr3Y: 17, volatility: 5, stdDev: 5, sortinoRatio: 2.4, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ma_extra1', 'DSP Multi Asset', 'HY-MAA', 'DSP', { sharpeRatio: 1.7, cagr3Y: 24, volatility: 11, stdDev: 11, sortinoRatio: 1.4, riskLevel: 'Moderate' }),
  f('mlc_extra1', 'Kotak Multi Cap', 'EQ-MLC', 'Kotak', { sharpeRatio: 1.7, cagr3Y: 39, volatility: 16, stdDev: 16, sortinoRatio: 1.4, riskLevel: 'Moderate' }),
  f('sc_extra1', 'Kotak Small Cap', 'EQ-SC', 'Kotak', { sharpeRatio: 1.1, cagr3Y: 47, volatility: 22, stdDev: 22, sortinoRatio: 0.8, riskLevel: 'High' }),
  f('val_extra1', 'ICICI Value Fund', 'EQ-VAL', 'ICICI Prudential', { sharpeRatio: 1.5, cagr3Y: 36, volatility: 16, stdDev: 16, sortinoRatio: 1.2, riskLevel: 'Moderate' }),
  f('gl_extra1', 'ICICI Gilt Fund', 'DT-GL', 'ICICI Prudential', { sharpeRatio: 2.5, cagr3Y: 15, volatility: 5, stdDev: 5, sortinoRatio: 2.2, riskLevel: 'Low', strengthBadge: 'Strong' as const }),

  // ── excluded / child fund for edge case testing ──
  f('child1', 'ICICI Prudential Childrens Fund', 'EQ-LC', 'ICICI Prudential', { sharpeRatio: 1.5, cagr3Y: 35, volatility: 14, stdDev: 14, sortinoRatio: 1.2, riskLevel: 'Moderate' }),
  f('gold1', 'SBI Gold Fund', 'Gold-Funds', 'SBI', { sharpeRatio: 1.0, cagr3Y: 20, volatility: 15, stdDev: 15, sortinoRatio: 0.8, riskLevel: 'Moderate' }),
  f('intl1', 'Motilal Oswal Nasdaq 100 FoF', 'EQ-International', 'Motilal Oswal', { sharpeRatio: 1.8, cagr3Y: 40, volatility: 20, stdDev: 20, sortinoRatio: 1.5, riskLevel: 'Moderate' }),
  f('thematic1', 'Quant Thematic Fund', 'EQ-THEMATIC', 'Quant', { sharpeRatio: 0.9, cagr3Y: 30, volatility: 22, stdDev: 22, sortinoRatio: 0.7, riskLevel: 'High' }),
  f('innovation1', 'Kotak Innovation Fund', 'EQ-Innovation', 'Kotak', { sharpeRatio: 0.8, cagr3Y: 28, volatility: 24, stdDev: 24, sortinoRatio: 0.6, riskLevel: 'High' }),

  // ── Extra AMC-diverse debt/hybrid funds for retirement & preservation profiles ──
  f('ch4', 'Baroda Conservative Hybrid', 'HY-CH', 'Baroda BNP Paribas', { sharpeRatio: 2.2, cagr3Y: 19, volatility: 7, stdDev: 7, sortinoRatio: 2.0, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ch5', 'Sundaram Conservative Hybrid', 'HY-CH', 'Sundaram', { sharpeRatio: 2.1, cagr3Y: 18, volatility: 8, stdDev: 8, sortinoRatio: 1.9, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('cb4', 'Aditya Birla Corporate Bond', 'DT-CB', 'Aditya Birla', { sharpeRatio: 2.9, cagr3Y: 14, volatility: 3, stdDev: 3, sortinoRatio: 2.6, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('cb5', 'Tata Corporate Bond', 'DT-CB', 'Tata', { sharpeRatio: 2.7, cagr3Y: 12, volatility: 3, stdDev: 3, sortinoRatio: 2.4, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('sd3', 'IDFC Short Duration', 'DT-SD', 'IDFC', { sharpeRatio: 3.0, cagr3Y: 12, volatility: 2, stdDev: 2, sortinoRatio: 2.8, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('sd4', 'Aditya Birla Short Duration', 'DT-SD', 'Aditya Birla', { sharpeRatio: 2.9, cagr3Y: 11, volatility: 2, stdDev: 2, sortinoRatio: 2.7, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('bpsu2', 'Aditya Birla Banking PSU', 'DT-BK & PSU', 'Aditya Birla', { sharpeRatio: 2.8, cagr3Y: 12, volatility: 3, stdDev: 3, sortinoRatio: 2.5, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('bpsu3', 'Sundaram Banking PSU', 'DT-BK & PSU', 'Sundaram', { sharpeRatio: 2.7, cagr3Y: 11, volatility: 3, stdDev: 3, sortinoRatio: 2.4, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('daa4', 'Aditya Birla Balanced Advantage', 'HY-DAA', 'Aditya Birla', { sharpeRatio: 2.0, cagr3Y: 26, volatility: 9, stdDev: 9, sortinoRatio: 1.8, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('daa5', 'Baroda Balanced Advantage', 'HY-DAA', 'Baroda BNP Paribas', { sharpeRatio: 1.9, cagr3Y: 25, volatility: 9, stdDev: 9, sortinoRatio: 1.7, riskLevel: 'Moderate', strengthBadge: 'Strong' as const }),
  f('eqs3', 'Aditya Birla Equity Savings', 'HY-EQ S', 'Aditya Birla', { sharpeRatio: 2.6, cagr3Y: 16, volatility: 6, stdDev: 6, sortinoRatio: 2.3, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('eqs4', 'Kotak Equity Savings', 'HY-EQ S', 'Kotak', { sharpeRatio: 2.5, cagr3Y: 15, volatility: 6, stdDev: 6, sortinoRatio: 2.2, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('maa3', 'Aditya Birla Multi Asset', 'HY-MAA', 'Aditya Birla', { sharpeRatio: 1.6, cagr3Y: 23, volatility: 11, stdDev: 11, sortinoRatio: 1.3, riskLevel: 'Moderate' }),
  f('maa4', 'Baroda Multi Asset', 'HY-MAA', 'Baroda BNP Paribas', { sharpeRatio: 1.5, cagr3Y: 22, volatility: 12, stdDev: 12, sortinoRatio: 1.2, riskLevel: 'Moderate' }),
  f('ar4', 'Aditya Birla Arbitrage', 'HY-AR', 'Aditya Birla', { sharpeRatio: 3.2, cagr3Y: 10, volatility: 2, stdDev: 2, sortinoRatio: 2.9, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ar5', 'Tata Arbitrage', 'HY-AR', 'Tata', { sharpeRatio: 3.1, cagr3Y: 9, volatility: 2, stdDev: 2, sortinoRatio: 2.8, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('gl3', 'Aditya Birla Gilt Fund', 'DT-GL', 'Aditya Birla', { sharpeRatio: 2.4, cagr3Y: 14, volatility: 5, stdDev: 5, sortinoRatio: 2.1, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('gl4', 'Baroda Gilt Fund', 'DT-GL', 'Baroda BNP Paribas', { sharpeRatio: 2.3, cagr3Y: 13, volatility: 6, stdDev: 6, sortinoRatio: 2.0, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('liq3', 'Aditya Birla Liquid', 'DT-LIQ', 'Aditya Birla', { sharpeRatio: 3.8, cagr3Y: 7, volatility: 1, stdDev: 1, sortinoRatio: 3.5, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('md2', 'Sundaram Medium Duration', 'DT-MD', 'Sundaram', { sharpeRatio: 2.6, cagr3Y: 13, volatility: 4, stdDev: 4, sortinoRatio: 2.3, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('flt2', 'Aditya Birla Floating Rate', 'DT-Floater', 'Aditya Birla', { sharpeRatio: 2.9, cagr3Y: 11, volatility: 2, stdDev: 2, sortinoRatio: 2.6, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('mm3', 'Aditya Birla Money Market', 'DT-MM', 'Aditya Birla', { sharpeRatio: 3.6, cagr3Y: 8, volatility: 1.5, stdDev: 1.5, sortinoRatio: 3.3, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('mm4', 'Baroda Money Market', 'DT-MM', 'Baroda BNP Paribas', { sharpeRatio: 3.5, cagr3Y: 7, volatility: 1.5, stdDev: 1.5, sortinoRatio: 3.2, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('liq4', 'Mahindra Liquid', 'DT-LIQ', 'Mahindra Manulife', { sharpeRatio: 3.7, cagr3Y: 6, volatility: 1, stdDev: 1, sortinoRatio: 3.4, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('liq5', 'Baroda Liquid', 'DT-LIQ', 'Baroda BNP Paribas', { sharpeRatio: 3.6, cagr3Y: 5, volatility: 1, stdDev: 1, sortinoRatio: 3.3, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ovn2', 'Tata Overnight', 'DT-OVERNHT', 'Tata', { sharpeRatio: 4.4, cagr3Y: 4, volatility: 0.5, stdDev: 0.5, sortinoRatio: 4.1, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ovn3', 'Aditya Birla Overnight', 'DT-OVERNHT', 'Aditya Birla', { sharpeRatio: 4.3, cagr3Y: 3, volatility: 0.5, stdDev: 0.5, sortinoRatio: 4.0, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('usd2', 'Sundaram Ultra Short Duration', 'DT-USD', 'Sundaram', { sharpeRatio: 3.5, cagr3Y: 9, volatility: 1.5, stdDev: 1.5, sortinoRatio: 3.2, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('usd3', 'Tata Ultra Short Duration', 'DT-USD', 'Tata', { sharpeRatio: 3.4, cagr3Y: 8, volatility: 1.5, stdDev: 1.5, sortinoRatio: 3.1, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('ld2', 'Aditya Birla Long Duration', 'DT-LONG D', 'Aditya Birla', { sharpeRatio: 1.4, cagr3Y: 17, volatility: 10, stdDev: 10, sortinoRatio: 1.1, riskLevel: 'Moderate' }),
  f('ld3', 'Tata Long Duration', 'DT-LONG D', 'Tata', { sharpeRatio: 1.5, cagr3Y: 18, volatility: 9, stdDev: 9, sortinoRatio: 1.2, riskLevel: 'Moderate' }),
  f('sd5', 'Mahindra Short Duration', 'DT-SD', 'Mahindra Manulife', { sharpeRatio: 2.8, cagr3Y: 11, volatility: 2, stdDev: 2, sortinoRatio: 2.6, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('sd6', 'NJ Short Duration', 'DT-SD', 'NJ', { sharpeRatio: 2.7, cagr3Y: 10, volatility: 2, stdDev: 2, sortinoRatio: 2.5, riskLevel: 'Low', strengthBadge: 'Strong' as const }),
  f('db2', 'Baroda Dynamic Bond', 'DT-DB', 'Baroda BNP Paribas', { sharpeRatio: 2.3, cagr3Y: 14, volatility: 6, stdDev: 6, sortinoRatio: 2.0, riskLevel: 'Moderate' }),

  // ── Extra equity funds for aggressive profile AMC diversity ──
  f('lc5', 'Aditya Birla Large Cap', 'EQ-LC', 'Aditya Birla', { sharpeRatio: 1.4, cagr3Y: 33, volatility: 14, stdDev: 14, sortinoRatio: 1.1, riskLevel: 'Moderate' }),
  f('lc6', 'Baroda Large Cap', 'EQ-LC', 'Baroda BNP Paribas', { sharpeRatio: 1.3, cagr3Y: 31, volatility: 15, stdDev: 15, sortinoRatio: 1.0, riskLevel: 'Moderate' }),
  f('lc7', 'Sundaram Large Cap', 'EQ-LC', 'Sundaram', { sharpeRatio: 1.3, cagr3Y: 30, volatility: 15, stdDev: 15, sortinoRatio: 1.0, riskLevel: 'Moderate' }),
  f('mc4', 'Aditya Birla Mid Cap', 'EQ-MC', 'Aditya Birla', { sharpeRatio: 1.2, cagr3Y: 39, volatility: 18, stdDev: 18, sortinoRatio: 0.9, riskLevel: 'High' }),
  f('mc5', 'Baroda Mid Cap', 'EQ-MC', 'Baroda BNP Paribas', { sharpeRatio: 1.1, cagr3Y: 38, volatility: 19, stdDev: 19, sortinoRatio: 0.8, riskLevel: 'High' }),
  f('mc6', 'Sundaram Mid Cap', 'EQ-MC', 'Sundaram', { sharpeRatio: 1.1, cagr3Y: 37, volatility: 19, stdDev: 19, sortinoRatio: 0.8, riskLevel: 'High' }),
  f('sc4', 'Aditya Birla Small Cap', 'EQ-SC', 'Aditya Birla', { sharpeRatio: 1.0, cagr3Y: 45, volatility: 23, stdDev: 23, sortinoRatio: 0.7, riskLevel: 'High' }),
  f('sc5', 'Baroda Small Cap', 'EQ-SC', 'Baroda BNP Paribas', { sharpeRatio: 0.9, cagr3Y: 44, volatility: 24, stdDev: 24, sortinoRatio: 0.6, riskLevel: 'High' }),
  f('sc6', 'Tata Small Cap', 'EQ-SC', 'Tata', { sharpeRatio: 1.0, cagr3Y: 46, volatility: 22, stdDev: 22, sortinoRatio: 0.7, riskLevel: 'High' }),
  f('mlc3', 'Aditya Birla Multi Cap', 'EQ-MLC', 'Aditya Birla', { sharpeRatio: 1.6, cagr3Y: 38, volatility: 16, stdDev: 16, sortinoRatio: 1.3, riskLevel: 'Moderate' }),
  f('mlc4', 'Baroda Multi Cap', 'EQ-MLC', 'Baroda BNP Paribas', { sharpeRatio: 1.5, cagr3Y: 36, volatility: 17, stdDev: 17, sortinoRatio: 1.2, riskLevel: 'Moderate' }),
  f('val3', 'Aditya Birla Value', 'EQ-VAL', 'Aditya Birla', { sharpeRatio: 1.4, cagr3Y: 35, volatility: 16, stdDev: 16, sortinoRatio: 1.1, riskLevel: 'Moderate' }),
  f('val4', 'Tata Value Fund', 'EQ-VAL', 'Tata', { sharpeRatio: 1.4, cagr3Y: 34, volatility: 17, stdDev: 17, sortinoRatio: 1.1, riskLevel: 'Moderate' }),
];
