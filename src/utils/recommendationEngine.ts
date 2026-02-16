import { MutualFund } from '@/types/mutualFund';

// ── Safe number parser (from recommendFunds.js) ──
function safeNumber(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(num) ? null : num;
}

// ── Group classifier (from recommendFunds.js) ──
function getGroup(category: string): string {
  if (!category) return 'OTHER';
  const cat = category.toUpperCase();

  // Order matters – check more specific patterns first
  if (cat.includes('L&MC')) return 'LARGE';
  if (cat.includes('MLC')) return 'MULTI';
  if (cat === 'EQ-LC' || (cat.includes('LC') && !cat.includes('MLC'))) return 'LARGE';
  if (cat.includes('MC') && !cat.includes('MLC')) return 'MID';
  if (cat.includes('SC')) return 'SMALL';
  if (cat.includes('FLX')) return 'FLEXI';
  if (cat.includes('DIV')) return 'DIVIDEND';
  if (cat.includes('PSU')) return 'PSU';
  if (cat.includes('THEMATIC') || cat.includes('SA&T')) return 'THEMATIC';
  if (cat.includes('INTL')) return 'INTERNATIONAL';
  if (cat.includes('ELSS')) return 'ELSS';
  if (cat.startsWith('DT-')) return 'DEBT';
  if (cat.startsWith('HY-')) return 'HYBRID';
  if (cat.includes('GOLD') || cat.includes('SILVER')) return 'COMMODITY';
  if (cat.includes('VAL')) return 'VALUE';
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

// ── Preference matching filter (from preferenceEngine.js) ──
function matchesPreferences(fund: MutualFund, prefs: UserPreferences): boolean {
  const category = (fund.category || '').toUpperCase();

  // Conservative: avoid aggressive equity
  if (
    (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') &&
    ['EQ-SC', 'EQ-MC', 'EQ-THEMATIC', 'EQ-PSU'].includes(category)
  ) {
    return false;
  }

  // Short horizon: avoid high volatility
  if (
    (prefs.investmentHorizon === 'short' || prefs.investmentHorizon === '<3yrs') &&
    ['EQ-SC', 'EQ-THEMATIC', 'EQ-PSU'].includes(category)
  ) {
    return false;
  }

  // Beginners: avoid niche
  if (
    prefs.experienceLevel === 'beginner' &&
    ['EQ-THEMATIC', 'EQ-PSU', 'EQ-SA&T'].includes(category)
  ) {
    return false;
  }

  // International: hard block (from scoring_engine.js CATEGORY_MULTIPLIER EQ-INTL = 0)
  if (category === 'EQ-INTL') return false;

  return true;
}

// ── User profile rules (from userProfileRules.js) ──
function getUserRules(prefs: UserPreferences) {
  const rules: { maxStdDev: number; minEquity: number; allowed?: string[] } = {
    maxStdDev: 25,
    minEquity: 0,
  };

  if (prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high') {
    rules.maxStdDev = 25;
    rules.minEquity = 70;
  } else if (prefs.riskTolerance === 'moderate') {
    rules.maxStdDev = 18;
    rules.minEquity = 40;
  } else {
    rules.maxStdDev = 12;
    rules.minEquity = 0;
  }

  if (prefs.investmentHorizon === 'short' || prefs.investmentHorizon === '<3yrs') {
    rules.allowed = ['DEBT', 'HYBRID'];
  } else if (prefs.investmentHorizon === 'medium' || prefs.investmentHorizon === '3-5yrs') {
    rules.allowed = ['HYBRID', 'LARGE', 'FLEXI', 'MULTI', 'DIVIDEND', 'MID', 'VALUE', 'ELSS'];
  }

  return rules;
}

// ── Core scoring engine (merged from fundScoring.js + recommendFunds.js + scoring_engine.js) ──
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

  // ── Horizon-Based Return Weighting (from recommendFunds.js) ──
  if (prefs.investmentHorizon === 'short' || prefs.investmentHorizon === '<3yrs') {
    if (oneYear !== null) score += oneYear * 0.4;
    if (threeYear !== null) score += threeYear * 0.2;
  } else if (prefs.investmentHorizon === 'medium' || prefs.investmentHorizon === '3-5yrs') {
    if (threeYear !== null) score += threeYear * 0.4;
    if (fiveYear !== null) score += fiveYear * 0.2;
  } else {
    // long / 5yrs+ (from scoring_engine.js: long horizon → 3Y * 1.5)
    if (fiveYear !== null) score += fiveYear * 0.5;
    else score -= 5;
    if (threeYear !== null) score += threeYear * 0.3;
  }

  // ── Risk-Adjusted Metrics (from fundScoring.js: sharpe*20, stdDev*0.6, beta*8) ──
  if (sharpe !== null) {
    score += sharpe * 15;
    if (sharpe > 1.5) reasons.push('Strong risk-adjusted returns');
  } else {
    score -= 5;
  }

  if (stdDev !== null) {
    score -= stdDev * 0.7;
    if (stdDev < 12) reasons.push('Stable performance history');
  } else {
    score -= 5;
  }

  if (beta !== null) {
    score -= beta * 8;
    if (beta < 0.9 && beta > 0) reasons.push('Lower market volatility');
  } else {
    score -= 5;
  }

  // ── Risk Tolerance Adjustments (from recommendFunds.js) ──
  if (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') {
    if (['LARGE', 'FLEXI', 'DIVIDEND', 'MULTI'].includes(group)) score += 15;
    if (['MID', 'SMALL', 'THEMATIC', 'PSU'].includes(group)) score -= 25;
    if (group === 'INTERNATIONAL') score -= 30;
    if (stdDev !== null) score -= stdDev * 1.5;
    if (beta !== null) score -= beta * 10;
  } else if (prefs.riskTolerance === 'moderate') {
    if (['LARGE', 'FLEXI', 'MULTI', 'MID'].includes(group)) score += 10;
    if (group === 'SMALL') score -= 8;
    // from scoring_engine.js moderate logic
    if (stdDev !== null) score += Math.max(0, 18 - stdDev);
    if (beta !== null) score += Math.max(0, 1 - Math.abs(beta - 1)) * 6;
  } else if (prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high') {
    if (['MID', 'SMALL', 'THEMATIC'].includes(group)) score += 18;
    if (group === 'LARGE') score += 6;
    // from scoring_engine.js: reward volatility for aggressive
    if (stdDev !== null) score += stdDev * 1.2;
    if (beta !== null) score += beta * 8;
  }

  // ── Investment Goal Adjustments (from recommendFunds.js) ──
  if (prefs.investmentGoal === 'regular_income' || prefs.investmentGoal === 'income') {
    if (group === 'DIVIDEND') { score += 20; reasons.push('Suitable for income generation'); }
    if (group === 'SMALL') score -= 10;
  }
  if (prefs.investmentGoal === 'wealth_creation' || prefs.investmentGoal === 'growth') {
    if (['SMALL', 'MID'].includes(group)) score += 18;
    if (group === 'FLEXI') { score += 12; reasons.push('Diversified across market caps'); }
    // from scoring_engine.js: wealth creation + long horizon boost
    if (prefs.investmentHorizon === 'long' || prefs.investmentHorizon === '5yrs+') {
      if (group === 'SMALL') score += 15;
      if (group === 'MID') score += 10;
    }
  }
  if (prefs.investmentGoal === 'tax_saving' || prefs.investmentGoal === 'tax') {
    if (group === 'ELSS') score += 25;
  }
  if (prefs.investmentGoal === 'preservation' || prefs.investmentGoal === 'capital_preservation') {
    if (['DEBT', 'HYBRID'].includes(group)) score += 15;
    if (['SMALL', 'THEMATIC'].includes(group)) score -= 20;
  }

  // ── Experience Safety (from recommendFunds.js) ──
  if (prefs.experienceLevel === 'beginner') {
    if (['SMALL', 'THEMATIC', 'PSU'].includes(group)) score -= 20;
    if (['LARGE', 'FLEXI'].includes(group)) score += 12;
    if (stdDev !== null) score -= stdDev * 1;
  }
  if (prefs.experienceLevel === 'advanced') {
    if (['SMALL', 'THEMATIC'].includes(group)) score += 10;
    if (stdDev !== null) score += stdDev * 0.5;
  }

  // ── Investment Amount Logic (from recommendFunds.js) ──
  if (prefs.investmentAmount === '<50k' || prefs.investmentAmount === 'under_1l') {
    if (expense !== null && expense > 1) score -= 15;
  }
  if (prefs.investmentAmount === '50k-5lakhs' || prefs.investmentAmount === '1l_to_10l') {
    if (['LARGE', 'FLEXI', 'MULTI'].includes(group)) score += 8;
  }
  if (prefs.investmentAmount === '5lakhs+' || prefs.investmentAmount === 'above_10l') {
    score += 5;
  }

  // ── Expense Penalty (from scoring_engine.js: expense * 4, fundScoring.js: expense * 5) ──
  if (expense !== null) {
    score -= expense * 5;
    if (expense < 1) reasons.push('Low expense ratio');
  }

  // ── Category Multiplier (from scoring_engine.js – CRITICAL) ──
  const CATEGORY_MULTIPLIER: Record<string, number> = {
    'SMALL': 1.4,
    'MID': 1.25,
    'VALUE': 1.1,
    'DIVIDEND': 1.1,
    'FLEXI': 0.9,
    'LARGE': 0.75,
    'PSU': 0.6,
    'THEMATIC': prefs.riskTolerance === 'aggressive' || prefs.riskTolerance === 'high' ? 1.1 : 0.6,
    'INTERNATIONAL': 0,
  };
  score *= CATEGORY_MULTIPLIER[group] || 1;

  if (isNaN(score)) score = 0;

  const confidenceScore = score > 50 ? 'High' : score > 25 ? 'Medium' : 'Low';

  return { score: Math.round(score * 100) / 100, reasons, confidenceScore };
}

// ── Allocation model (from fundAllocator.js) ──
function getAllocationModel(riskLevel: string) {
  if (riskLevel === 'conservative' || riskLevel === 'low') {
    return [
      { group: 'LARGE', max: 2 },
      { group: 'DIVIDEND', max: 1 },
      { group: 'FLEXI', max: 1 },
      { group: 'DEBT', max: 2 },
      { group: 'HYBRID', max: 1 },
    ];
  }
  if (riskLevel === 'moderate') {
    return [
      { group: 'LARGE', max: 2 },
      { group: 'FLEXI', max: 1 },
      { group: 'MID', max: 1 },
      { group: 'DIVIDEND', max: 1 },
      { group: 'HYBRID', max: 1 },
      { group: 'VALUE', max: 1 },
    ];
  }
  // aggressive / high
  return [
    { group: 'LARGE', max: 1 },
    { group: 'FLEXI', max: 1 },
    { group: 'MID', max: 2 },
    { group: 'SMALL', max: 1 },
    { group: 'DIVIDEND', max: 1 },
    { group: 'THEMATIC', max: 1 },
    { group: 'VALUE', max: 1 },
  ];
}

// ── Duplicate exposure check (from fundAllocator.js) ──
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

// ── Thematic overload check (from fundAllocator.js) ──
function isThematicOverloaded(fundName: string, usedThemes: Set<string>): boolean {
  const keywords = ['psu', 'bharat', 'infrastructure', 'energy', 'banking', 'sectoral'];
  const name = fundName.toLowerCase();
  for (const keyword of keywords) {
    if (name.includes(keyword) && usedThemes.has(keyword)) return true;
  }
  return false;
}

function registerTheme(fundName: string, usedThemes: Set<string>): void {
  const keywords = ['psu', 'bharat', 'infrastructure', 'energy', 'banking', 'sectoral'];
  const name = fundName.toLowerCase();
  for (const keyword of keywords) {
    if (name.includes(keyword)) usedThemes.add(keyword);
  }
}

// ── Main recommendation function ──
export function recommendFunds(funds: MutualFund[], prefs: UserPreferences): ScoredFund[] {
  const rules = getUserRules(prefs);

  // Step 1: Filter eligible funds (from preferenceEngine.js + recommendController.js)
  let eligible = funds.filter(f => matchesPreferences(f, prefs));

  // Apply user profile rules (from userProfileRules.js)
  if (rules.allowed) {
    const allowedGroups = rules.allowed;
    const filtered = eligible.filter(f => allowedGroups.includes(getGroup(f.category)));
    if (filtered.length > 10) eligible = filtered; // only apply if enough remain
  }

  // Conservative + long horizon: need valid history (from recommendController.js)
  if (
    (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') &&
    (prefs.investmentHorizon === 'long' || prefs.investmentHorizon === '5yrs+')
  ) {
    const filtered = eligible.filter(f => {
      const three = safeNumber(f.ret3Y ?? f.cagr3Y);
      const sharpe = safeNumber(f.sharpeRatio);
      const std = safeNumber(f.stdDev ?? f.volatility);
      return three !== null && sharpe !== null && std !== null;
    });
    if (filtered.length > 5) eligible = filtered;
  }

  // Conservative: relaxed beta/stdDev filter (from recommendController.js)
  if (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') {
    const filtered = eligible.filter(f => {
      const b = safeNumber(f.beta);
      const std = safeNumber(f.stdDev ?? f.volatility);
      if (b === null || std === null) return false;
      return b <= 1.2 && std <= rules.maxStdDev;
    });
    if (filtered.length > 5) eligible = filtered;
  }

  // Beginners: extra safety (from recommendController.js)
  if (prefs.experienceLevel === 'beginner') {
    const filtered = eligible.filter(f => {
      const cat = (f.category || '').toLowerCase();
      return !cat.includes('sc') && !cat.includes('thematic') && !cat.includes('psu') && !cat.includes('sa&t');
    });
    if (filtered.length > 5) eligible = filtered;
  }

  // Fallback
  if (eligible.length === 0) eligible = [...funds];

  // Step 2: Score all funds
  let scored: ScoredFund[] = eligible.map(fund => {
    const { score, reasons, confidenceScore } = scoreFund(fund, prefs);
    return { ...fund, score, group: getGroup(fund.category), reasons, confidenceScore };
  });

  // Hard filter for conservative (from recommendFunds.js)
  if (prefs.riskTolerance === 'conservative' || prefs.riskTolerance === 'low') {
    const filtered = scored.filter(f =>
      ['LARGE', 'FLEXI', 'DIVIDEND', 'MULTI', 'DEBT', 'HYBRID'].includes(f.group)
    );
    if (filtered.length > 5) scored = filtered;
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Step 3: Diversified allocation (from fundAllocator.js)
  const model = getAllocationModel(prefs.riskTolerance);
  const finalPortfolio: ScoredFund[] = [];
  const usedNames = new Set<string>();
  const usedThemes = new Set<string>();

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
      finalPortfolio.push(fund);
      usedNames.add(fund.name);
      registerTheme(fund.name, usedThemes);
      count++;
    }
  }

  // Step 4: Fill remaining slots from top scores (diversification cap: max 2 per group, target 8)
  if (finalPortfolio.length < 8) {
    const groupCount: Record<string, number> = {};
    finalPortfolio.forEach(f => {
      groupCount[f.group] = (groupCount[f.group] || 0) + 1;
    });

    for (const fund of scored) {
      if (finalPortfolio.length >= 8) break;
      if (finalPortfolio.some(f => f.id === fund.id)) continue;
      if (isDuplicateExposure(fund.name, usedNames)) continue;
      if (isThematicOverloaded(fund.name, usedThemes)) continue;

      const grpCount = groupCount[fund.group] || 0;
      if (grpCount >= 2) continue; // max 2 per category (from recommendFunds.js)

      finalPortfolio.push(fund);
      usedNames.add(fund.name);
      registerTheme(fund.name, usedThemes);
      groupCount[fund.group] = grpCount + 1;
    }
  }

  return finalPortfolio.slice(0, 8);
}
