import { MutualFund } from '@/types/mutualFund';

// ── Safe number parser ──
function safeNumber(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? null : num;
}

// ── Group classifier ──
function getGroup(category: string): string {
  if (!category) return 'OTHER';
  const cat = category.toUpperCase();
  if (cat.includes('LC') || cat.includes('L&MC')) return 'LARGE';
  if (cat.includes('MC') && !cat.includes('MLC')) return 'MID';
  if (cat.includes('SC')) return 'SMALL';
  if (cat.includes('FLX')) return 'FLEXI';
  if (cat.includes('MLC')) return 'MULTI';
  if (cat.includes('DIV')) return 'DIVIDEND';
  if (cat.includes('PSU')) return 'PSU';
  if (cat.includes('THEMATIC') || cat.includes('SA&T')) return 'THEMATIC';
  if (cat.includes('INTL')) return 'INTERNATIONAL';
  if (cat.includes('ELSS')) return 'ELSS';
  if (cat.startsWith('DT-')) return 'DEBT';
  if (cat.startsWith('HY-')) return 'HYBRID';
  if (cat.includes('GOLD') || cat.includes('SILVER')) return 'COMMODITY';
  return 'OTHER';
}

export interface UserPreferences {
  riskTolerance: string;    // 'conservative' | 'moderate' | 'aggressive'
  investmentGoal: string;   // 'wealth_creation' | 'regular_income' | 'tax_saving' | 'preservation'
  investmentHorizon: string; // 'short' | 'medium' | 'long' (or '<3yrs', '3-5yrs', '5yrs+')
  experienceLevel: string;  // 'beginner' | 'intermediate' | 'advanced'
  investmentAmount: string;  // '<50k' | '50k-5lakhs' | '5lakhs+'
}

export interface ScoredFund extends MutualFund {
  score: number;
  group: string;
  reasons: string[];
  confidenceScore: string;
}

// ── Preference matching filter ──
function matchesPreferences(fund: MutualFund, prefs: UserPreferences): boolean {
  const category = (fund.category || '').toUpperCase();

  // Conservative: avoid aggressive equity
  if (prefs.riskTolerance === 'conservative' &&
    ['EQ-SC', 'EQ-MC', 'EQ-THEMATIC', 'EQ-PSU'].includes(category)) {
    return false;
  }

  // Short horizon: avoid volatile categories
  if (prefs.investmentHorizon === 'short' &&
    ['EQ-SC', 'EQ-THEMATIC', 'EQ-PSU'].includes(category)) {
    return false;
  }

  // Beginners: avoid niche
  if (prefs.experienceLevel === 'beginner' &&
    ['EQ-THEMATIC', 'EQ-PSU', 'EQ-SA&T'].includes(category)) {
    return false;
  }

  // International: hard block
  if (category === 'EQ-INTL') return false;

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
  const stdDev = safeNumber(fund.stdDev ?? fund.volatility);
  const beta = safeNumber(fund.beta);
  const expense = safeNumber(fund.expenseRatio);

  // ── Horizon-based return weighting ──
  if (prefs.investmentHorizon === 'short' || prefs.investmentHorizon === '<3yrs') {
    if (oneYear !== null) score += oneYear * 0.4;
    if (threeYear !== null) score += threeYear * 0.2;
  } else if (prefs.investmentHorizon === 'medium' || prefs.investmentHorizon === '3-5yrs') {
    if (threeYear !== null) score += threeYear * 0.4;
    if (fiveYear !== null) score += fiveYear * 0.2;
  } else {
    if (fiveYear !== null) score += fiveYear * 0.5;
    else score -= 5;
    if (threeYear !== null) score += threeYear * 0.2;
  }

  // ── Risk-adjusted metrics ──
  if (sharpe !== null) { score += sharpe * 12; if (sharpe > 1.5) reasons.push('Strong risk-adjusted returns'); }
  else score -= 5;
  if (stdDev !== null) { score -= stdDev * 0.8; if (stdDev < 12) reasons.push('Stable performance history'); }
  else score -= 5;
  if (beta !== null) { score -= beta * 8; if (beta < 0.9) reasons.push('Lower market volatility'); }
  else score -= 5;

  // ── Risk tolerance adjustments ──
  if (prefs.riskTolerance === 'conservative') {
    if (['LARGE', 'FLEXI', 'DIVIDEND', 'MULTI'].includes(group)) score += 15;
    if (['MID', 'SMALL', 'THEMATIC', 'PSU'].includes(group)) score -= 25;
    if (group === 'INTERNATIONAL') score -= 30;
    if (stdDev !== null) score -= stdDev * 1.5;
    if (beta !== null) score -= beta * 10;
  } else if (prefs.riskTolerance === 'moderate') {
    if (['LARGE', 'FLEXI', 'MULTI', 'MID'].includes(group)) score += 10;
    if (group === 'SMALL') score -= 8;
  } else if (prefs.riskTolerance === 'aggressive') {
    if (['MID', 'SMALL', 'THEMATIC'].includes(group)) score += 18;
    if (group === 'LARGE') score += 6;
  }

  // ── Goal alignment ──
  if (prefs.investmentGoal === 'regular_income' || prefs.investmentGoal === 'income') {
    if (group === 'DIVIDEND') { score += 20; reasons.push('Suitable for income generation'); }
    if (group === 'SMALL') score -= 10;
  }
  if (prefs.investmentGoal === 'wealth_creation' || prefs.investmentGoal === 'growth') {
    if (['SMALL', 'MID'].includes(group)) score += 18;
    if (['FLEXI'].includes(group)) { score += 12; reasons.push('Diversified across market caps'); }
  }
  if (prefs.investmentGoal === 'tax_saving' || prefs.investmentGoal === 'tax') {
    if (group === 'ELSS') score += 25;
  }

  // ── Experience safety ──
  if (prefs.experienceLevel === 'beginner') {
    if (['SMALL', 'THEMATIC', 'PSU'].includes(group)) score -= 20;
    if (['LARGE', 'FLEXI'].includes(group)) score += 12;
    if (stdDev !== null) score -= stdDev * 1;
  }
  if (prefs.experienceLevel === 'advanced') {
    if (['SMALL', 'THEMATIC'].includes(group)) score += 10;
  }

  // ── Investment amount ──
  if (prefs.investmentAmount === '<50k' || prefs.investmentAmount === 'under_1l') {
    if (expense !== null && expense > 1) score -= 15;
  }
  if (prefs.investmentAmount === '5lakhs+' || prefs.investmentAmount === 'above_10l') {
    score += 5;
  }

  // ── Expense penalty ──
  if (expense !== null) {
    score -= expense * 4;
    if (expense < 1) reasons.push('Low expense ratio');
  }

  // ── Category multiplier ──
  const CATEGORY_MULTIPLIER: Record<string, number> = {
    'SMALL': 1.4,
    'MID': 1.25,
    'DIVIDEND': 1.1,
    'FLEXI': 0.9,
    'LARGE': 0.75,
    'PSU': 0.6,
    'THEMATIC': prefs.riskTolerance === 'aggressive' ? 1.1 : 0.6,
    'INTERNATIONAL': 0,
  };
  score *= CATEGORY_MULTIPLIER[group] || 1;

  if (isNaN(score)) score = 0;

  const confidenceScore = score > 50 ? 'High' : score > 25 ? 'Medium' : 'Low';

  return { score: Math.round(score * 100) / 100, reasons, confidenceScore };
}

// ── Allocation model ──
function getAllocationModel(riskLevel: string) {
  if (riskLevel === 'conservative') {
    return [
      { group: 'LARGE', max: 2 },
      { group: 'DIVIDEND', max: 1 },
      { group: 'FLEXI', max: 1 },
      { group: 'DEBT', max: 2 },
    ];
  }
  if (riskLevel === 'moderate') {
    return [
      { group: 'LARGE', max: 2 },
      { group: 'FLEXI', max: 1 },
      { group: 'MID', max: 1 },
      { group: 'DIVIDEND', max: 1 },
      { group: 'HYBRID', max: 1 },
    ];
  }
  // aggressive
  return [
    { group: 'LARGE', max: 1 },
    { group: 'FLEXI', max: 1 },
    { group: 'MID', max: 2 },
    { group: 'SMALL', max: 1 },
    { group: 'DIVIDEND', max: 1 },
    { group: 'THEMATIC', max: 1 },
  ];
}

// ── Duplicate exposure check ──
function isDuplicateExposure(fundName: string, usedNames: Set<string>): boolean {
  const name = fundName.toLowerCase();
  for (const used of usedNames) {
    const usedLower = used.toLowerCase();
    if (name.includes('bharat 22') && usedLower.includes('bharat 22')) return true;
    if (name.includes('sensex') && usedLower.includes('sensex')) return true;
  }
  return false;
}

// ── Main recommendation function ──
export function recommendFunds(funds: MutualFund[], prefs: UserPreferences): ScoredFund[] {
  // Step 1: Filter eligible funds
  let eligible = funds.filter(f => matchesPreferences(f, prefs));

  // Step 2: Conservative horizon filter
  if (prefs.riskTolerance === 'conservative' && (prefs.investmentHorizon === 'long' || prefs.investmentHorizon === '5yrs+')) {
    eligible = eligible.filter(f => {
      const three = safeNumber(f.ret3Y ?? f.cagr3Y);
      const sharpe = safeNumber(f.sharpeRatio);
      const std = safeNumber(f.stdDev ?? f.volatility);
      return three !== null && sharpe !== null && std !== null;
    });
  }

  // Beginners: extra safety
  if (prefs.experienceLevel === 'beginner') {
    eligible = eligible.filter(f => {
      const cat = (f.category || '').toLowerCase();
      return !cat.includes('small') && !cat.includes('sector') && !cat.includes('thematic') && !cat.includes('psu');
    });
  }

  // Fallback
  if (eligible.length === 0) eligible = [...funds];

  // Step 3: Score all funds
  let scored: ScoredFund[] = eligible.map(fund => {
    const { score, reasons, confidenceScore } = scoreFund(fund, prefs);
    return { ...fund, score, group: getGroup(fund.category), reasons, confidenceScore };
  });

  // Hard filter for conservative
  if (prefs.riskTolerance === 'conservative') {
    scored = scored.filter(f => ['LARGE', 'FLEXI', 'DIVIDEND', 'MULTI', 'DEBT', 'HYBRID'].includes(f.group));
  }

  // Sort by score
  scored.sort((a, b) => b.score - a.score);

  // Step 4: Diversified allocation
  const model = getAllocationModel(prefs.riskTolerance);
  const finalPortfolio: ScoredFund[] = [];
  const usedNames = new Set<string>();

  for (const bucket of model) {
    const bucketFunds = scored
      .filter(f => f.group === bucket.group)
      .sort((a, b) => b.score - a.score);

    let count = 0;
    for (const fund of bucketFunds) {
      if (count >= bucket.max) break;
      if (isDuplicateExposure(fund.name, usedNames)) continue;
      if (finalPortfolio.some(f => f.id === fund.id)) continue;
      finalPortfolio.push(fund);
      usedNames.add(fund.name);
      count++;
    }
  }

  // If diversification yields too few, fill from top scores
  if (finalPortfolio.length < 6) {
    for (const fund of scored) {
      if (finalPortfolio.length >= 8) break;
      if (finalPortfolio.some(f => f.id === fund.id)) continue;
      if (isDuplicateExposure(fund.name, usedNames)) continue;
      finalPortfolio.push(fund);
      usedNames.add(fund.name);
    }
  }

  return finalPortfolio.slice(0, 8);
}
