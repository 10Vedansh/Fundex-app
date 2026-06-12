/**
 * CIFRAA Recommendation Engine V3 — Advanced Scoring
 *
 * Sortino-dominant, category-relative, consistency-aware scoring.
 * Approximates missing metrics from available data.
 */

import { MutualFund } from '@/types/mutualFund';

// ── Helpers ──

function safeNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

// ── Category Median Cache ──

export interface CategoryMedians {
  cagr: number;
  cagrStdDev: number;
  sharpe: number;
  sortino: number;
  volatility: number;
  expense: number;
}

let _medianCache: Map<string, CategoryMedians> | null = null;
let _medianCacheKey = '';

export function computeCategoryMedians(funds: MutualFund[]): Map<string, CategoryMedians> {
  const key = `${funds.length}-${funds[0]?.id || ''}`;
  if (_medianCache && _medianCacheKey === key) return _medianCache;

  const groups = new Map<string, MutualFund[]>();
  for (const f of funds) {
    const cat = (f.category || '').trim();
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat)!.push(f);
  }

  const result = new Map<string, CategoryMedians>();
  for (const [cat, catFunds] of groups) {
    // Treat '--' / null as NA — exclude entirely from category medians instead of counting as 0
    const cagrs = catFunds.map(f => safeNum(f.ret3Y ?? f.cagr3Y)).filter((n): n is number => n !== null);
    const sharpes = catFunds.map(f => safeNum(f.sharpeRatio)).filter((n): n is number => n !== null);
    const sortinos = catFunds.map(f => {
      const s = safeNum(f.sortinoRatio);
      if (s !== null) return s;
      const approx = approximateSortino(f);
      return approx; // approximateSortino can return null when source data is NA
    }).filter((n): n is number => n !== null && !isNaN(n));
    const vols = catFunds.map(f => safeNum(f.volatility) ?? safeNum(f.stdDev)).filter((n): n is number => n !== null);
    const expenses = catFunds.map(f => safeNum(f.expenseRatio)).filter((n): n is number => n !== null);

    const medianCagr = cagrs.length ? median(cagrs) : 0;
    const cagrStdDev = (cagrs.length ? stdDev(cagrs) : 0) || 1; // prevent div by 0

    result.set(cat, {
      cagr: medianCagr,
      cagrStdDev,
      sharpe: sharpes.length ? median(sharpes) : 0,
      sortino: sortinos.length ? median(sortinos) : 0,
      volatility: vols.length ? median(vols) : 0,
      expense: expenses.length ? median(expenses) : 0,
    });
  }

  _medianCache = result;
  _medianCacheKey = key;
  return result;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, val) => sum + (val - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ── Metric Approximation ──

/** Approximate Sortino from Sharpe + volatility when sortinoRatio is missing */
function approximateSortino(fund: MutualFund): number {
  const sharpe = safeNum(fund.sharpeRatio) ?? 0;
  const vol = safeNum(fund.volatility) ?? safeNum(fund.stdDev) ?? 0;
  // Sortino ≈ Sharpe × √2 for symmetric distributions, penalize high vol
  if (vol > 15) return sharpe * 1.1; // high vol → sortino closer to sharpe
  return sharpe * 1.4; // low vol → sortino better than sharpe
}

/** Approximate rolling consistency from multi-period returns */
function approximateConsistency(fund: MutualFund, categoryMedianCagr: number): number {
  // Use available return periods as proxy for rolling consistency
  const periods = [
    safeNum(fund.ret1M),
    safeNum(fund.ret3M),
    safeNum(fund.ret6M),
    safeNum(fund.ret1Y),
    safeNum(fund.ret3Y ?? fund.cagr3Y),
    safeNum(fund.ret5Y ?? fund.cagr5Y),
  ].filter((v): v is number => v !== null);

  if (periods.length === 0) return 0.5;

  // Count periods where annualized return beats category median
  const outperformed = periods.filter(r => r > categoryMedianCagr * 0.8).length;
  return outperformed / periods.length;
}

/** Approximate max drawdown from volatility */
function approximateMaxDrawdown(fund: MutualFund): number {
  const vol = safeNum(fund.volatility) ?? safeNum(fund.stdDev) ?? 0;
  // Rule of thumb: max drawdown ≈ 2-3x annualized volatility
  return vol * 2.5;
}

// ── Credit Risk Penalty (Debt Only) ──

function computeCreditPenalty(fund: MutualFund): number {
  const cat = (fund.category || '').trim();
  if (!cat.startsWith('DT-')) return 0;

  let penalty = 0;
  const creditQuality = fund.avgCreditQuality;

  // Penalize lower credit quality
  if (creditQuality) {
    const quality = creditQuality.toUpperCase();
    if (quality.includes('A') && !quality.includes('AA')) penalty += 0.10;
    if (quality.includes('BBB') || quality.includes('BB') || quality.includes('B')) penalty += 0.15;
  }

  // Credit Risk funds get inherent penalty
  if (cat === 'DT-CR') penalty += 0.10;

  return Math.min(penalty, 0.25);
}

// ── Normalization ──

interface NormStats {
  maxSortino: number; minSortino: number;
  maxSharpe: number; minSharpe: number;
  maxVol: number; minVol: number;
  maxExpense: number; minExpense: number;
  maxAum: number; minAum: number;
  maxCagr: number; minCagr: number;
}

export function computeNormStats(funds: MutualFund[]): NormStats {
  let maxSortino = -Infinity, minSortino = Infinity;
  let maxSharpe = -Infinity, minSharpe = Infinity;
  let maxVol = -Infinity, minVol = Infinity;
  let maxExp = -Infinity, minExp = Infinity;
  let maxAum = -Infinity, minAum = Infinity;
  let maxCagr = -Infinity, minCagr = Infinity;

  for (const f of funds) {
    const so = safeNum(f.sortinoRatio) ?? 0;
    const sh = safeNum(f.sharpeRatio) ?? 0;
    const v = safeNum(f.volatility) ?? safeNum(f.stdDev) ?? 0;
    const e = safeNum(f.expenseRatio) ?? 0;
    const a = safeNum(f.aum) ?? 0;
    const c = safeNum(f.ret3Y ?? f.cagr3Y) ?? 0;

    if (so > maxSortino) maxSortino = so; if (so < minSortino) minSortino = so;
    if (sh > maxSharpe) maxSharpe = sh; if (sh < minSharpe) minSharpe = sh;
    if (v > maxVol) maxVol = v; if (v < minVol) minVol = v;
    if (e > maxExp) maxExp = e; if (e < minExp) minExp = e;
    if (a > maxAum) maxAum = a; if (a < minAum) minAum = a;
    if (c > maxCagr) maxCagr = c; if (c < minCagr) minCagr = c;
  }

  return {
    maxSortino, minSortino: minSortino === Infinity ? 0 : minSortino,
    maxSharpe, minSharpe: minSharpe === Infinity ? 0 : minSharpe,
    maxVol, minVol: minVol === Infinity ? 0 : minVol,
    maxExpense: maxExp, minExpense: minExp === Infinity ? 0 : minExp,
    maxAum, minAum: minAum === Infinity ? 0 : minAum,
    maxCagr, minCagr: minCagr === Infinity ? 0 : minCagr,
  };
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

function categoryBreadthScore(category: string): number {
  const cat = (category || '').trim();
  const scores: Record<string, number> = {
    'EQ-SC': 1.0,
    'EQ-MC': 0.9,
    'EQ-FLX': 0.9,
    'EQ-LC': 0.7,
    'EQ-VAL': 0.7,
    'EQ-ELSS': 0.5,
    'EQ-BANK': 0.4,
    'EQ-PSU': 0.3,
  };
  return scores[cat] ?? 0.2;
}

// ── Profile Type Determination ──

export function determineProfileType(
  riskTolerance: string,
  investmentGoal: string,
  investmentHorizon: string,
  experienceLevel: string,
): string {
  let type = riskTolerance;

  if (type === 'conservative') {
    if (investmentHorizon === 'long' && investmentGoal === 'wealth_creation') {
      type = 'moderate';
    }
  }

  if (type === 'aggressive') {
    if (investmentHorizon === 'short' || experienceLevel === 'beginner') {
      type = 'moderate';
    }
    if (investmentGoal === 'capital_preservation') {
      type = 'moderate';
    }
  }

  return type;
}

// ── Profile-Adaptive Weights ──

interface ProfileWeights {
  sortino: number;
  cagrRelative: number;
  consistency: number;
  sharpe: number;
  volatility: number;
  expense: number;
  aum: number;
  diversificationBonus: number;
}

const PROFILE_WEIGHTS: Record<string, ProfileWeights> = {
  conservative: { sortino: 0.40, cagrRelative: 0.10, consistency: 0.20, sharpe: 0.10, volatility: 0.15, expense: 0.05, aum: 0, diversificationBonus: 0 },
  moderate: { sortino: 0.25, cagrRelative: 0.25, consistency: 0.15, sharpe: 0.10, volatility: 0.10, expense: 0.10, aum: 0.05, diversificationBonus: 0 },
  aggressive: { sortino: 0.15, cagrRelative: 0.30, consistency: 0.20, sharpe: 0.15, volatility: 0.05, expense: 0.05, aum: 0.05, diversificationBonus: 0.05 },
};

// ── V3 Composite Score ──

export interface V3ScoreResult {
  score: number;
  reasons: string[];
  sortinoScore: number;
  categoryRelativeScore: number;
  consistencyScore: number;
  profileType: string;
  diversificationBonusScore: number;
  expenseScore: number;
  downsideRisk: 'low' | 'moderate' | 'high';
  suitabilityBadge: 'aligned' | 'adjusted' | 'limited';
  nullFieldCount: number;
  completenessMultiplier: number;
}

export function scoreV3(
  fund: MutualFund,
  stats: NormStats,
  medians: Map<string, CategoryMedians>,
  experienceLevel: string,
  riskTolerance: string,
  investmentHorizon: string,
  investmentGoal: string,
): V3ScoreResult {
  const reasons: string[] = [];
  const cat = (fund.category || '').trim();
  const catMedian = medians.get(cat);

  const profileType = determineProfileType(riskTolerance, investmentGoal, investmentHorizon, experienceLevel);
  const w = PROFILE_WEIGHTS[profileType] || PROFILE_WEIGHTS.moderate;

  // 1. Sortino
  const sortinoRaw = safeNum(fund.sortinoRatio);
  const sortino = sortinoRaw ?? 0;
  const sortinoN = normalize(sortino, stats.minSortino, stats.maxSortino);

  // 2. Global CAGR
  const cagr3Raw = safeNum(fund.ret3Y ?? fund.cagr3Y);
  const cagr3 = cagr3Raw ?? 0;
  const cagrN = normalize(cagr3, stats.minCagr, stats.maxCagr);

  // 3. Rolling Consistency
  const consistency = approximateConsistency(fund, catMedian?.cagr ?? 0);

  // 4. Sharpe
  const sharpeRaw = safeNum(fund.sharpeRatio);
  const sharpe = sharpeRaw ?? 0;
  const sharpeN = normalize(sharpe, stats.minSharpe, stats.maxSharpe);

  // 5. Low Volatility
  const volRaw = safeNum(fund.volatility) ?? safeNum(fund.stdDev);
  const vol = volRaw ?? 0;
  let volN = w.volatility > 0 ? (1 - normalize(vol, stats.minVol, stats.maxVol)) : 0.5;
  if (volRaw === null) volN = 0.5; // neutral when volatility is unknown

  // 6. Category-Relative Expense
  const expenseRaw = safeNum(fund.expenseRatio);
  const expense = expenseRaw === null ? 0 : expenseRaw;
  let expenseN: number;
  if (expenseRaw === null) {
    expenseN = 0.5;
  } else if (catMedian?.expense && catMedian.expense > 0) {
    const ratio = expenseRaw / catMedian.expense;
    expenseN = 1 - Math.min(ratio, 2) * 0.35;
    expenseN = Math.max(0, Math.min(1, expenseN));
  } else {
    expenseN = 0.5;
  }

  // 7. AUM Stability
  const aumRaw = safeNum(fund.aum);
  const aum = aumRaw === null ? 0 : aumRaw;
  const aumN = aumRaw === null ? 0.5 : normalize(aum, stats.minAum, stats.maxAum);

  // 8. Category Breadth Score (diversification)
  const diversificationBonusN = categoryBreadthScore(fund.category);

  // Weighted composite
  let score =
    (w.sortino * sortinoN) +
    (w.cagrRelative * cagrN) +
    (w.consistency * consistency) +
    (w.sharpe * sharpeN) +
    (w.volatility * volN) +
    (w.expense * expenseN) +
    (w.aum * aumN) +
    (w.diversificationBonus * diversificationBonusN);

  // Credit penalty for debt
  const creditPenalty = computeCreditPenalty(fund);
  score *= (1 - creditPenalty);

  // Credit Risk category suppression: 20% reduction unless Very High risk + long horizon
  if (cat === 'DT-CR') {
    const isVeryHighRisk = riskTolerance === 'aggressive';
    const isLongHorizon = investmentHorizon === 'long';
    if (!(isVeryHighRisk && isLongHorizon)) {
      score *= 0.80;
      reasons.push('Credit Risk fund: score reduced');
    }
  }

  // Experience modifier
  if (experienceLevel === 'beginner') {
    if (vol > 15) {
      score *= 0.7;
      reasons.push('Penalized: high volatility for beginner');
    }
    if (expense > 1.5) score *= 0.9;
  }

  // 9. Completeness penalty — missing critical metrics penalized harder (15%),
  // optional fields penalized lightly (5%)
  const nullSharpe = safeNum(fund.sharpeRatio) === null;
  const nullSortino = safeNum(fund.sortinoRatio) === null;
  const nullVol = (safeNum(fund.volatility) ?? safeNum(fund.stdDev)) === null;
  const nullCagr = safeNum(fund.ret3Y ?? fund.cagr3Y) === null;
  const consistencyPeriods = [
    safeNum(fund.ret1M),
    safeNum(fund.ret3M),
    safeNum(fund.ret6M),
    safeNum(fund.ret1Y),
    safeNum(fund.ret3Y ?? fund.cagr3Y),
    safeNum(fund.ret5Y ?? fund.cagr5Y),
  ].filter(v => v !== null);
  const nullConsistency = consistencyPeriods.length < 3;
  const nullExpense = safeNum(fund.expenseRatio) === null;
  const nullBenchmark = !fund.benchmark || String(fund.benchmark).trim() === '';
  const nullFundManager = !fund.fundManager || String(fund.fundManager).trim() === '';
  const criticalNulls = [nullSharpe, nullVol, nullCagr].filter(Boolean).length;
  const optionalNulls = [nullSortino, nullConsistency, nullExpense, nullBenchmark, nullFundManager].filter(Boolean).length;
  const completenessMultiplier = Math.round((1 - (0.15 * criticalNulls) - (0.05 * optionalNulls)) * 100) / 100;
  score *= completenessMultiplier;

  // 10. Age-based recency penalty — younger funds are penalized
  if (fund.launch) {
    const launchDate = new Date(String(fund.launch));
    const ageYears = (Date.now() - launchDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    if (ageYears < 1) {
      score *= 0.70;
      reasons.push('Penalized: fund less than 1 year old');
    } else if (ageYears < 3) {
      score *= 0.85;
      reasons.push('Penalized: fund less than 3 years old');
    } else if (ageYears < 5) {
      score *= 0.95;
      reasons.push('Penalized: fund less than 5 years old');
    }
  }

  // Reason generation
  if (sortino > 2) reasons.push('Excellent downside-adjusted returns');
  else if (sortino > 1.2) reasons.push('Strong risk-adjusted returns (Sortino)');

  if (cagrN > 0.8) reasons.push('Strong absolute returns');
  else if (cagrN > 0.5) reasons.push('Above-average absolute returns');

  if (consistency > 0.7) reasons.push('Consistent multi-period performer');
  if (expenseRaw !== null && expenseRaw < catMedian?.expense * 0.7) reasons.push('Low expense for category');
  if (vol < 5) reasons.push('Stable performance history');
  if (aum > 10000) reasons.push('Large, well-established fund');

  if (creditPenalty > 0) reasons.push('Credit concentration risk applied');

  // Goal-specific reasons
  if (cat.startsWith('DT-') && riskTolerance === 'conservative') {
    reasons.push('Low-risk debt fund for capital safety');
  }
  if (cat === 'EQ-ELSS') reasons.push('ELSS — eligible for ₹1.5L tax deduction');

  if (profileType === 'aggressive' && diversificationBonusN >= 0.9) reasons.push('Broad market exposure (diversification)');
  else if (profileType === 'aggressive' && diversificationBonusN >= 0.5) reasons.push('Moderate category diversification');

  // Downside risk assessment
  const maxDD = approximateMaxDrawdown(fund);
  const downsideRisk: 'low' | 'moderate' | 'high' =
    maxDD < 10 ? 'low' : maxDD < 25 ? 'moderate' : 'high';

  // Suitability badge
  let suitabilityBadge: 'aligned' | 'adjusted' | 'limited' = 'aligned';
  if (riskTolerance === 'conservative' && vol > 6) suitabilityBadge = 'adjusted';
  if (riskTolerance === 'conservative' && vol > 10) suitabilityBadge = 'limited';
  if (riskTolerance === 'moderate' && vol > 18) suitabilityBadge = 'adjusted';

  return {
    score: Math.round(score * 10000) / 100,
    reasons,
    sortinoScore: sortino,
    categoryRelativeScore: Math.round(cagrN * 10000) / 100,
    consistencyScore: consistency,
    profileType,
    diversificationBonusScore: Math.round(diversificationBonusN * 10000) / 100,
    expenseScore: Math.round(expenseN * 10000) / 100,
    downsideRisk,
    suitabilityBadge,
    nullFieldCount: criticalNulls + optionalNulls,
    completenessMultiplier,
  };
}
