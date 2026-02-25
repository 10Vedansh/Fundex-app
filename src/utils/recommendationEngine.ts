import { MutualFund } from '@/types/mutualFund';

// ── Safe number parser (from recommendFunds.js) ──
function safeNumber(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? null : num;
}

// ── Group classifier – maps ALL workbook category codes ──
function getGroup(category: string): string {
  if (!category) return 'OTHER';
  const cat = category.toUpperCase();

  if (cat.includes('L&MC')) return 'LARGE';
  if (cat === 'EQ-LC') return 'LARGE';
  if (cat === 'EQ-MLC') return 'MULTI';
  if (cat.includes('MC') && !cat.includes('MLC') && !cat.includes('MNC')) return 'MID';
  if (cat.includes('SC')) return 'SMALL';
  if (cat.includes('FLX') || cat.includes('FOCUSED')) return 'FLEXI';
  if (cat.includes('DIV')) return 'DIVIDEND';
  if (cat.includes('VAL')) return 'VALUE';
  if (cat.includes('ELSS')) return 'ELSS';
  if (cat.includes('QUANT')) return 'QUANT';
  if (cat.includes('INTL')) return 'INTERNATIONAL';

  if (
    cat.includes('THEMATIC') || cat.includes('SA&T') ||
    cat.includes('BANK') || cat.includes('IT') ||
    cat.includes('PHARMA') || cat.includes('INFRA') ||
    cat.includes('ENERGY') || cat.includes('CONSUMPTION') ||
    cat.includes('PSU') || cat.includes('MNC') ||
    cat.includes('MANUFACTURING') || cat.includes('INNOVATION') ||
    cat.includes('ESG') || cat.includes('TBC')
  ) {
    return 'SECTORAL';
  }

  if (cat.startsWith('DT-')) {
    if (cat.includes('LIQ') || cat.includes('OVERNHT') || cat.includes('MM')) return 'LIQUID';
    if (cat.includes('GL') || cat.includes('GILT')) return 'GILT';
    return 'DEBT';
  }

  if (cat.startsWith('HY-')) {
    if (cat.includes('AR')) return 'ARBITRAGE';
    return 'HYBRID';
  }

  if (cat.includes('GOLD') || cat.includes('SILVER')) return 'COMMODITY';

  return 'OTHER';
}

export interface UserPreferences {
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
}

export interface ScoredFund extends MutualFund {
  score: number;
  group: string;
  reasons: string[];
  confidenceScore: string;
}

// ── Cascading preference filter – each preference narrows the subset ──
function matchesPreferences(fund: MutualFund, prefs: UserPreferences): boolean {
  const category = (fund.category || '').toUpperCase();
  const group = getGroup(fund.category);

  // LAYER 1: Risk tolerance filter
  if (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') {
    if (['SMALL', 'SECTORAL', 'QUANT', 'INTERNATIONAL'].includes(group)) return false;
    if (['EQ-SC', 'EQ-MC', 'EQ-THEMATIC', 'EQ-PSU', 'EQ-SA&T'].includes(category)) return false;
  }
  if (prefs.riskTolerance === 'moderate') {
    if (['INTERNATIONAL'].includes(group)) return false;
  }
  // Aggressive: allow most, block only international
  if (category === 'EQ-INTL') return false;

  // LAYER 2: Investment goal filter (subset of risk-filtered)
  if (prefs.investmentGoal === 'income' || prefs.investmentGoal === 'regular_income') {
    // Income: prefer dividend, debt, hybrid; exclude aggressive growth
    if (['SMALL', 'SECTORAL', 'QUANT'].includes(group)) return false;
  }
  if (prefs.investmentGoal === 'preservation' || prefs.investmentGoal === 'capital_preservation') {
    // Preservation: only stable categories
    if (!['LARGE', 'DEBT', 'LIQUID', 'GILT', 'HYBRID', 'ARBITRAGE', 'DIVIDEND', 'FLEXI'].includes(group)) return false;
  }
  if (prefs.investmentGoal === 'tax' || prefs.investmentGoal === 'tax_saving') {
    // Tax saving: strongly prefer ELSS, but don't exclude all others
    // (handled via scoring bonus instead of hard filter for non-ELSS)
  }
  if (prefs.investmentGoal === 'wealth' || prefs.investmentGoal === 'wealth_creation' || prefs.investmentGoal === 'growth') {
    if (category === 'EQ-DIV Y') return false;
  }

  // LAYER 3: Horizon filter (subset of goal-filtered)
  if (prefs.investmentHorizon === 'short' || prefs.investmentHorizon === '<3yrs') {
    if (['SMALL', 'SECTORAL', 'QUANT', 'MID'].includes(group)) return false;
  }
  if (prefs.investmentHorizon === 'medium') {
    if (['SMALL'].includes(group) && prefs.riskTolerance !== 'aggressive') return false;
  }

  // LAYER 4: Experience filter (subset of horizon-filtered)
  if (prefs.experienceLevel === 'beginner') {
    if (['SECTORAL', 'QUANT'].includes(group)) return false;
    if (['EQ-THEMATIC', 'EQ-PSU', 'EQ-SA&T', 'EQ-BANK', 'EQ-IT'].some(c => category === c.toUpperCase())) return false;
  }

  // LAYER 5: Investment amount filter
  if (prefs.investmentAmount === 'small' || prefs.investmentAmount === '<50k' || prefs.investmentAmount === 'under_1l') {
    // Small amounts: avoid high-expense niche funds
    const expense = safeNumber(fund.expenseRatio);
    if (expense !== null && expense > 2.5) return false;
  }

  return true;
}

// ── Core scoring engine ──
function scoreFund(fund: MutualFund, prefs: UserPreferences): { score: number; reasons: string[]; confidenceScore: string } {
  let score = 0;
  const reasons: string[] = [];
  const group = getGroup(fund.category);

  const oneYear = safeNumber(fund.ret1Y ?? fund.cagr1Y);
  const threeYear = safeNumber(fund.ret3Y ?? fund.cagr3Y);
  const fiveYear = safeNumber(fund.ret5Y ?? fund.cagr5Y);
  const sharpe = safeNumber(fund.sharpeRatio);
  const sortino = safeNumber(fund.sortinoRatio);
  const stdDev = safeNumber(fund.stdDev) || safeNumber(fund.volatility !== 0 ? fund.volatility : null);
  const beta = safeNumber(fund.beta);
  const expense = safeNumber(fund.expenseRatio);

  // PERFORMANCE WEIGHTS – Risk-based
  if (prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high') {
    if (oneYear !== null) score += oneYear * 0.5;
    if (threeYear !== null) score += threeYear * 0.5;
    if (fiveYear !== null) score += fiveYear * 0.5;
  } else if (prefs.riskTolerance === 'moderate') {
    if (oneYear !== null) score += oneYear * 0.2;
    if (threeYear !== null) score += threeYear * 0.35;
    if (fiveYear !== null) score += fiveYear * 0.35;
  } else {
    if (threeYear !== null) score += threeYear * 0.15;
    if (fiveYear !== null) score += fiveYear * 0.2;
  }

  // RISK-ADJUSTED METRICS
  if (sharpe !== null && sharpe !== 0) {
    score += sharpe * 20;
    if (sharpe > 1.5) reasons.push('Strong risk-adjusted returns');
  } else {
    score -= 3;
  }

  if (sortino !== null && sortino !== 0) {
    score += sortino * 1.5;
  }

  // VOLATILITY & BETA
  if (prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high') {
    if (stdDev !== null && stdDev > 0) score += stdDev * 0.8;
    if (beta !== null && beta > 0) score += beta * 6;
  } else if (prefs.riskTolerance === 'moderate') {
    if (stdDev !== null && stdDev > 0) score += Math.max(0, 18 - stdDev) * 0.8;
    if (beta !== null) score += Math.max(0, 1 - Math.abs(beta - 1)) * 6;
  } else {
    if (stdDev !== null && stdDev > 0) {
      score -= stdDev * 2.0;
      if (stdDev < 10) reasons.push('Stable performance history');
    } else {
      score -= 8;
    }
    if (beta !== null && beta > 0) {
      score -= beta * 12;
      if (beta < 0.8) reasons.push('Lower market volatility');
    } else {
      score -= 8;
    }
  }

  // GROUP BONUSES/PENALTIES
  if (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') {
    const bonusMap: Record<string, number> = {
      'LARGE': 25, 'FLEXI': 20, 'MULTI': 18, 'DIVIDEND': 22,
      'DEBT': 30, 'GILT': 25, 'LIQUID': 20, 'HYBRID': 22, 'ARBITRAGE': 18,
      'VALUE': 12, 'ELSS': 10,
      'MID': -30, 'SMALL': -50, 'SECTORAL': -40,
      'COMMODITY': -20, 'INTERNATIONAL': -50, 'QUANT': -15,
    };
    score += bonusMap[group] || -10;
  } else if (prefs.riskTolerance === 'moderate') {
    const bonusMap: Record<string, number> = {
      'LARGE': 18, 'FLEXI': 18, 'MULTI': 15, 'MID': 12,
      'DIVIDEND': 10, 'VALUE': 15, 'ELSS': 12,
      'HYBRID': 10, 'DEBT': 5, 'ARBITRAGE': 5,
      'SMALL': -10, 'SECTORAL': -5, 'QUANT': 5,
      'COMMODITY': 0, 'INTERNATIONAL': -20,
    };
    score += bonusMap[group] || 0;
  } else {
    const bonusMap: Record<string, number> = {
      'SMALL': 30, 'MID': 25, 'SECTORAL': 20, 'QUANT': 18,
      'FLEXI': 15, 'MULTI': 12, 'VALUE': 15, 'LARGE': 8,
      'THEMATIC': 20, 'ELSS': 10,
      'DIVIDEND': -5, 'DEBT': -25, 'LIQUID': -35, 'GILT': -30,
      'HYBRID': -15, 'ARBITRAGE': -25, 'COMMODITY': -10,
      'INTERNATIONAL': -30,
    };
    score += bonusMap[group] || 0;
  }

  // INVESTMENT GOAL ALIGNMENT – strong bonuses to differentiate
  if (prefs.investmentGoal === 'regular_income' || prefs.investmentGoal === 'income') {
    if (group === 'DIVIDEND') { score += 30; reasons.push('Suitable for income generation'); }
    if (group === 'DEBT' || group === 'GILT') score += 20;
    if (group === 'HYBRID') score += 15;
    if (group === 'LARGE') score += 5;
    if (group === 'SMALL') score -= 20;
    if (group === 'SECTORAL') score -= 15;
  }
  if (prefs.investmentGoal === 'wealth_creation' || prefs.investmentGoal === 'growth' || prefs.investmentGoal === 'wealth') {
    if (['SMALL', 'MID'].includes(group)) score += 25;
    if (group === 'FLEXI') { score += 20; reasons.push('Diversified across market caps'); }
    if (group === 'MULTI') score += 15;
    if (group === 'VALUE') score += 10;
    if (group === 'DIVIDEND') score -= 10;
    if (group === 'DEBT') score -= 15;
    if (group === 'LIQUID') score -= 20;
    if (prefs.investmentHorizon === 'long' || prefs.investmentHorizon === '5yrs+') {
      if (group === 'SMALL') score += 20;
      if (group === 'MID') score += 15;
    }
  }
  if (prefs.investmentGoal === 'tax_saving' || prefs.investmentGoal === 'tax') {
    if (group === 'ELSS') { score += 40; reasons.push('ELSS - eligible for tax saving'); }
    else score -= 10;
  }
  if (prefs.investmentGoal === 'preservation' || prefs.investmentGoal === 'capital_preservation') {
    if (['DEBT', 'LIQUID', 'GILT'].includes(group)) { score += 30; reasons.push('Low-risk for capital preservation'); }
    if (group === 'HYBRID' || group === 'ARBITRAGE') score += 20;
    if (group === 'LARGE') score += 10;
    if (['SMALL', 'SECTORAL', 'MID'].includes(group)) score -= 30;
  }

  // HORIZON ALIGNMENT
  if (prefs.investmentHorizon === 'short' || prefs.investmentHorizon === '<3yrs') {
    if (['LIQUID', 'DEBT', 'ARBITRAGE'].includes(group)) score += 20;
    if (['LARGE', 'HYBRID'].includes(group)) score += 10;
    if (['SMALL', 'MID'].includes(group)) score -= 20;
  }
  if (prefs.investmentHorizon === 'medium') {
    if (['LARGE', 'FLEXI', 'HYBRID', 'MULTI'].includes(group)) score += 15;
    if (['DEBT'].includes(group)) score += 8;
  }
  if (prefs.investmentHorizon === 'long' || prefs.investmentHorizon === '5yrs+') {
    if (['SMALL', 'MID', 'FLEXI'].includes(group)) score += 15;
    if (['LIQUID'].includes(group)) score -= 15;
  }

  // EXPERIENCE LEVEL
  if (prefs.experienceLevel === 'beginner') {
    if (['SMALL', 'SECTORAL', 'QUANT'].includes(group)) score -= 25;
    if (['LARGE', 'FLEXI'].includes(group)) { score += 20; reasons.push('Beginner-friendly fund type'); }
    if (group === 'HYBRID') score += 10;
  }
  if (prefs.experienceLevel === 'intermediate') {
    if (['FLEXI', 'MULTI', 'VALUE'].includes(group)) score += 10;
  }
  if (prefs.experienceLevel === 'advanced' || prefs.experienceLevel === 'experienced') {
    if (['SMALL', 'SECTORAL', 'QUANT'].includes(group)) score += 15;
    if (['VALUE'].includes(group)) score += 10;
  }

  // INVESTMENT AMOUNT
  if (prefs.investmentAmount === '<50k' || prefs.investmentAmount === 'under_1l' || prefs.investmentAmount === 'small') {
    if (expense !== null && expense > 1.5) score -= 15;
    if (['LARGE', 'FLEXI'].includes(group)) score += 8;
  }
  if (prefs.investmentAmount === '50k-5lakhs' || prefs.investmentAmount === '1l_to_10l' || prefs.investmentAmount === 'medium') {
    if (['LARGE', 'FLEXI', 'MULTI'].includes(group)) score += 10;
    if (['MID', 'VALUE'].includes(group)) score += 5;
  }
  if (prefs.investmentAmount === '5lakhs+' || prefs.investmentAmount === 'above_10l' || prefs.investmentAmount === 'large') {
    score += 5;
    if (['SMALL', 'MID', 'SECTORAL'].includes(group)) score += 8;
  }

  // EXPENSE PENALTY
  if (expense !== null) {
    score -= expense * 5;
    if (expense < 0.5) reasons.push('Very low expense ratio');
    else if (expense < 1) reasons.push('Low expense ratio');
  }

  // CATEGORY MULTIPLIER
  const CATEGORY_MULTIPLIER: Record<string, number> = {
    'SMALL': 1.4,
    'MID': 1.25,
    'VALUE': 1.1,
    'DIVIDEND': 1.05,
    'FLEXI': 1.0,
    'LARGE': 0.85,
    'SECTORAL': prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high' ? 1.15 : 0.6,
    'QUANT': prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high' ? 1.1 : 0.7,
    'INTERNATIONAL': 0,
    'DEBT': prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low' ? 1.2 : 0.7,
    'GILT': prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low' ? 1.15 : 0.6,
    'LIQUID': prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low' ? 1.1 : 0.5,
    'HYBRID': 1.0,
    'ARBITRAGE': prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low' ? 1.05 : 0.6,
    'COMMODITY': 0.8,
  };
  score *= CATEGORY_MULTIPLIER[group] ?? 1;

  if (isNaN(score)) score = 0;

  const confidenceScore = score > 50 ? 'High' : score > 25 ? 'Medium' : 'Low';

  return { score: Math.round(score * 100) / 100, reasons, confidenceScore };
}

// ── Allocation model – varies by ALL preferences now ──
function getAllocationModel(prefs: UserPreferences) {
  const risk = prefs.riskTolerance;
  const goal = prefs.investmentGoal;
  
  if (risk === 'conservative' || risk === 'low') {
    if (goal === 'income' || goal === 'regular_income') {
      return [
        { group: 'DIVIDEND', max: 2 }, { group: 'DEBT', max: 2 }, { group: 'HYBRID', max: 1 },
        { group: 'GILT', max: 1 }, { group: 'LARGE', max: 1 }, { group: 'LIQUID', max: 1 },
        { group: 'ARBITRAGE', max: 1 },
      ];
    }
    if (goal === 'preservation' || goal === 'capital_preservation') {
      return [
        { group: 'DEBT', max: 3 }, { group: 'LIQUID', max: 2 }, { group: 'GILT', max: 1 },
        { group: 'LARGE', max: 1 }, { group: 'HYBRID', max: 1 }, { group: 'ARBITRAGE', max: 1 },
      ];
    }
    return [
      { group: 'LARGE', max: 2 }, { group: 'DEBT', max: 2 }, { group: 'HYBRID', max: 1 },
      { group: 'DIVIDEND', max: 1 }, { group: 'GILT', max: 1 }, { group: 'FLEXI', max: 1 },
      { group: 'LIQUID', max: 1 }, { group: 'ARBITRAGE', max: 1 },
    ];
  }
  
  if (risk === 'moderate') {
    if (goal === 'tax' || goal === 'tax_saving') {
      return [
        { group: 'ELSS', max: 3 }, { group: 'LARGE', max: 2 }, { group: 'FLEXI', max: 1 },
        { group: 'MULTI', max: 1 }, { group: 'VALUE', max: 1 }, { group: 'HYBRID', max: 1 },
      ];
    }
    if (goal === 'wealth' || goal === 'wealth_creation' || goal === 'growth') {
      return [
        { group: 'FLEXI', max: 2 }, { group: 'LARGE', max: 2 }, { group: 'MID', max: 1 },
        { group: 'MULTI', max: 1 }, { group: 'VALUE', max: 1 }, { group: 'ELSS', max: 1 },
        { group: 'HYBRID', max: 1 },
      ];
    }
    return [
      { group: 'LARGE', max: 2 }, { group: 'FLEXI', max: 1 }, { group: 'MID', max: 1 },
      { group: 'VALUE', max: 1 }, { group: 'DIVIDEND', max: 1 }, { group: 'MULTI', max: 1 },
      { group: 'HYBRID', max: 1 }, { group: 'ELSS', max: 1 },
    ];
  }
  
  // aggressive / high
  if (goal === 'wealth' || goal === 'wealth_creation' || goal === 'growth') {
    return [
      { group: 'SMALL', max: 3 }, { group: 'MID', max: 2 }, { group: 'FLEXI', max: 1 },
      { group: 'SECTORAL', max: 1 }, { group: 'VALUE', max: 1 }, { group: 'QUANT', max: 1 },
    ];
  }
  return [
    { group: 'SMALL', max: 2 }, { group: 'MID', max: 2 }, { group: 'FLEXI', max: 1 },
    { group: 'SECTORAL', max: 1 }, { group: 'VALUE', max: 1 }, { group: 'LARGE', max: 1 },
    { group: 'QUANT', max: 1 }, { group: 'MULTI', max: 1 },
  ];
}

// ── Duplicate exposure check ──
function isDuplicateExposure(fundName: string, usedNames: Set<string>): boolean {
  const name = fundName.toLowerCase();
  for (const used of usedNames) {
    const usedLower = used.toLowerCase();
    if (name.includes('bharat 22') && usedLower.includes('bharat 22')) return true;
    if (name.includes('sensex') && usedLower.includes('sensex')) return true;
    if (name.includes('nifty 50') && usedLower.includes('nifty 50')) return true;
  }
  return false;
}

function isThematicOverloaded(fundName: string, usedThemes: Set<string>): boolean {
  const keywords = ['psu', 'bharat', 'infrastructure', 'energy', 'banking', 'sectoral', 'pharma', 'it '];
  const name = fundName.toLowerCase();
  for (const keyword of keywords) {
    if (name.includes(keyword) && usedThemes.has(keyword)) return true;
  }
  return false;
}

function registerTheme(fundName: string, usedThemes: Set<string>): void {
  const keywords = ['psu', 'bharat', 'infrastructure', 'energy', 'banking', 'sectoral', 'pharma', 'it '];
  const name = fundName.toLowerCase();
  for (const keyword of keywords) {
    if (name.includes(keyword)) usedThemes.add(keyword);
  }
}

function isAmcOverloaded(fundAmc: string, usedAmcs: Map<string, number>, max = 2): boolean {
  const count = usedAmcs.get(fundAmc) || 0;
  return count >= max;
}

// ── Main recommendation function ──
export function recommendFunds(funds: MutualFund[], prefs: UserPreferences): ScoredFund[] {
  // Step 1: Cascading filter – each preference narrows the pool
  let eligible = funds.filter(f => matchesPreferences(f, prefs));

  // Additional data quality filters
  if (
    (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') &&
    (prefs.investmentHorizon === 'long' || prefs.investmentHorizon === '5yrs+')
  ) {
    const filtered = eligible.filter(f => {
      const three = safeNumber(f.ret3Y ?? f.cagr3Y);
      const sharpe = safeNumber(f.sharpeRatio);
      return three !== null && sharpe !== null;
    });
    if (filtered.length > 20) eligible = filtered;
  }

  if (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') {
    const filtered = eligible.filter(f => {
      const b = safeNumber(f.beta);
      const std = safeNumber(f.stdDev) || safeNumber(f.volatility !== 0 ? f.volatility : null);
      if (b === null && std === null) return false;
      if (b !== null && b > 1.3) return false;
      if (std !== null && std > 20) return false;
      return true;
    });
    if (filtered.length > 20) eligible = filtered;
  }

  if (prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high') {
    const filtered = eligible.filter(f => {
      const oneY = safeNumber(f.ret1Y ?? f.cagr1Y);
      return oneY !== null && oneY > 0;
    });
    if (filtered.length > 20) eligible = filtered;
  }

  if (eligible.length === 0) eligible = [...funds];

  // Step 2: Score all funds
  let scored: ScoredFund[] = eligible.map(fund => {
    const { score, reasons, confidenceScore } = scoreFund(fund, prefs);
    return { ...fund, score, group: getGroup(fund.category), reasons, confidenceScore };
  });

  // Hard filter for conservative: only stable groups
  if (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') {
    const filtered = scored.filter(f =>
      ['LARGE', 'FLEXI', 'DIVIDEND', 'MULTI', 'DEBT', 'HYBRID', 'GILT', 'LIQUID', 'ARBITRAGE', 'VALUE', 'ELSS'].includes(f.group)
    );
    if (filtered.length > 10) scored = filtered;
  }

  if (prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high') {
    const filtered = scored.filter(f =>
      ['SMALL', 'MID', 'FLEXI', 'MULTI', 'SECTORAL', 'VALUE', 'LARGE', 'QUANT', 'ELSS'].includes(f.group)
    );
    if (filtered.length > 10) scored = filtered;
  }

  scored.sort((a, b) => b.score - a.score);

  // Step 3: Diversified allocation – now uses ALL preferences
  const model = getAllocationModel(prefs);
  const finalPortfolio: ScoredFund[] = [];
  const usedNames = new Set<string>();
  const usedThemes = new Set<string>();
  const usedAmcs = new Map<string, number>();

  for (const bucket of model) {
    const bucketFunds = scored
      .filter(f => f.group === bucket.group)
      .sort((a, b) => b.score - a.score);

    let count = 0;
    for (const fund of bucketFunds) {
      if (count >= bucket.max) break;
      if (isDuplicateExposure(fund.name, usedNames)) continue;
      if (isThematicOverloaded(fund.name, usedThemes)) continue;
      if (finalPortfolio.some(f => f.id === fund.id)) continue;
      if (isAmcOverloaded(fund.amc, usedAmcs)) continue;
      finalPortfolio.push(fund);
      usedNames.add(fund.name);
      registerTheme(fund.name, usedThemes);
      usedAmcs.set(fund.amc, (usedAmcs.get(fund.amc) || 0) + 1);
      count++;
    }
  }

  // Step 4: Fill remaining slots from top scores (target 9)
  if (finalPortfolio.length < 9) {
    const groupCount: Record<string, number> = {};
    finalPortfolio.forEach(f => {
      groupCount[f.group] = (groupCount[f.group] || 0) + 1;
    });

    for (const fund of scored) {
      if (finalPortfolio.length >= 9) break;
      if (finalPortfolio.some(f => f.id === fund.id)) continue;
      if (isDuplicateExposure(fund.name, usedNames)) continue;
      if (isThematicOverloaded(fund.name, usedThemes)) continue;
      if (isAmcOverloaded(fund.amc, usedAmcs)) continue;

      const grpCount = groupCount[fund.group] || 0;
      if (grpCount >= 2) continue;

      finalPortfolio.push(fund);
      usedNames.add(fund.name);
      registerTheme(fund.name, usedThemes);
      usedAmcs.set(fund.amc, (usedAmcs.get(fund.amc) || 0) + 1);
      groupCount[fund.group] = grpCount + 1;
    }
  }

  return finalPortfolio.slice(0, 9);
}
