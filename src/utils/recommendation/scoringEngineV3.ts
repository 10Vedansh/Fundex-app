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

    const medianCagr = cagrs.length ? median(cagrs) : 0;
    const cagrStdDev = (cagrs.length ? stdDev(cagrs) : 0) || 1; // prevent div by 0

    result.set(cat, {
      cagr: medianCagr,
      cagrStdDev,
      sharpe: sharpes.length ? median(sharpes) : 0,
      sortino: sortinos.length ? median(sortinos) : 0,
      volatility: vols.length ? median(vols) : 0,
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
}

export function computeNormStats(funds: MutualFund[]): NormStats {
  let maxSortino = -Infinity, minSortino = Infinity;
  let maxSharpe = -Infinity, minSharpe = Infinity;
  let maxVol = -Infinity, minVol = Infinity;
  let maxExp = -Infinity, minExp = Infinity;
  let maxAum = -Infinity, minAum = Infinity;

  for (const f of funds) {
    const so = safeNum(f.sortinoRatio) ?? approximateSortino(f);
    const sh = safeNum(f.sharpeRatio) ?? 0;
    const v = safeNum(f.volatility) ?? safeNum(f.stdDev) ?? 0;
    const e = safeNum(f.expenseRatio) ?? 0;
    const a = safeNum(f.aum) ?? 0;

    if (so > maxSortino) maxSortino = so; if (so < minSortino) minSortino = so;
    if (sh > maxSharpe) maxSharpe = sh; if (sh < minSharpe) minSharpe = sh;
    if (v > maxVol) maxVol = v; if (v < minVol) minVol = v;
    if (e > maxExp) maxExp = e; if (e < minExp) minExp = e;
    if (a > maxAum) maxAum = a; if (a < minAum) minAum = a;
  }

  return {
    maxSortino, minSortino: minSortino === Infinity ? 0 : minSortino,
    maxSharpe, minSharpe: minSharpe === Infinity ? 0 : minSharpe,
    maxVol, minVol: minVol === Infinity ? 0 : minVol,
    maxExpense: maxExp, minExpense: minExp === Infinity ? 0 : minExp,
    maxAum, minAum: minAum === Infinity ? 0 : minAum,
  };
}

function normalize(val: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

// ── V3 Composite Score ──

export interface V3ScoreResult {
  score: number;
  reasons: string[];
  sortinoScore: number;
  categoryRelativeScore: number;
  consistencyScore: number;
  downsideRisk: 'low' | 'moderate' | 'high';
  suitabilityBadge: 'aligned' | 'adjusted' | 'limited';
}

export function scoreV3(
  fund: MutualFund,
  stats: NormStats,
  medians: Map<string, CategoryMedians>,
  experienceLevel: string,
  riskTolerance: string,
  investmentHorizon?: string,
): V3ScoreResult {
  const reasons: string[] = [];
  const cat = (fund.category || '').trim();
  const catMedian = medians.get(cat);

  // For missing ('--' / null) values: use category median so the metric is NEUTRAL (not penalized as 0)
  const safeOrMedian = (v: number | null, fallback: number) => v === null ? fallback : v;

  // 1. Sortino (30%)
  const sortinoRaw = safeNum(fund.sortinoRatio);
  const sortino = sortinoRaw !== null ? sortinoRaw : (catMedian?.sortino ?? approximateSortino(fund));
  const sortinoN = normalize(sortino, stats.minSortino, stats.maxSortino);

  // 2. Category-Relative CAGR (20%)
  const cagr3Raw = safeNum(fund.ret3Y ?? fund.cagr3Y);
  const cagr3 = safeOrMedian(cagr3Raw, catMedian?.cagr ?? 0);
  let categoryRelativeCagr = 0;
  if (catMedian && catMedian.cagrStdDev > 0 && cagr3Raw !== null) {
    categoryRelativeCagr = (cagr3 - catMedian.cagr) / catMedian.cagrStdDev;
  }
  // Normalize to 0-1 range (z-scores typically -3 to +3); 0.5 = neutral
  const cagrRelativeN = Math.max(0, Math.min(1, (categoryRelativeCagr + 3) / 6));

  // 3. Rolling Consistency (15%)
  const consistency = approximateConsistency(fund, catMedian?.cagr ?? 0);

  // 4. Sharpe (10%)
  const sharpeRaw = safeNum(fund.sharpeRatio);
  const sharpe = safeOrMedian(sharpeRaw, catMedian?.sharpe ?? 0);
  const sharpeN = normalize(sharpe, stats.minSharpe, stats.maxSharpe);

  // 5. Low Volatility (10%)
  const volRaw = safeNum(fund.volatility) ?? safeNum(fund.stdDev);
  const vol = safeOrMedian(volRaw, catMedian?.volatility ?? 0);
  const volN = 1 - normalize(vol, stats.minVol, stats.maxVol);

  // 6. Expense (10%)
  const expenseRaw = safeNum(fund.expenseRatio);
  const expense = expenseRaw === null ? 0 : expenseRaw;
  const expenseN = expenseRaw === null ? 0.5 : (1 - normalize(expense, stats.minExpense, stats.maxExpense));

  // 7. AUM Stability (5%)
  const aumRaw = safeNum(fund.aum);
  const aum = aumRaw === null ? 0 : aumRaw;
  const aumN = aumRaw === null ? 0.5 : normalize(aum, stats.minAum, stats.maxAum);

  // Weighted composite
  let score =
    (0.30 * sortinoN) +
    (0.20 * cagrRelativeN) +
    (0.15 * consistency) +
    (0.10 * sharpeN) +
    (0.10 * volN) +
    (0.10 * expenseN) +
    (0.05 * aumN);

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

  // Reason generation
  if (sortino > 2) reasons.push('Excellent downside-adjusted returns');
  else if (sortino > 1.2) reasons.push('Strong risk-adjusted returns (Sortino)');

  if (categoryRelativeCagr > 1) reasons.push('Outperforms category peers');
  else if (categoryRelativeCagr > 0.5) reasons.push('Above-average category performance');

  if (consistency > 0.7) reasons.push('Consistent multi-period performer');
  if (expense < 0.5) reasons.push('Very low expense ratio');
  if (vol < 5) reasons.push('Stable performance history');
  if (aum > 10000) reasons.push('Large, well-established fund');

  if (creditPenalty > 0) reasons.push('Credit concentration risk applied');

  // Goal-specific reasons
  if (cat.startsWith('DT-') && riskTolerance === 'conservative') {
    reasons.push('Low-risk debt fund for capital safety');
  }
  if (cat === 'EQ-ELSS') reasons.push('ELSS — eligible for ₹1.5L tax deduction');

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
    categoryRelativeScore: categoryRelativeCagr,
    consistencyScore: consistency,
    downsideRisk,
    suitabilityBadge,
  };
}
