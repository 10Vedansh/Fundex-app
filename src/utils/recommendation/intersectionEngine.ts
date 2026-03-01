/**
 * Multi-Factor Intersection-Based Recommendation Engine
 *
 * Architecture:
 *   Preference Validator → Category Mapper → Multi-layer Filter
 *   → Intersection Engine → Ranking Engine → Top 9
 */

import { MutualFund } from '@/types/mutualFund';
import {
  RISK_CATEGORY_MAP,
  GOAL_CATEGORY_MAP,
  HORIZON_CATEGORY_MAP,
  EXPERIENCE_CATEGORY_MAP,
  EXCLUDED_FUND_NAMES,
} from './categoryMappings';

export interface IntersectionPreferences {
  riskTolerance: string;
  investmentGoal: string;
  investmentHorizon: string;
  experienceLevel: string;
  investmentAmount: string;
}

// ── Helpers ──

function safeNum(val: number | string | null | undefined): number | null {
  if (val === null || val === undefined || val === '' || val === '--') return null;
  const n = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : Number(val);
  return isNaN(n) ? null : n;
}

function isExcluded(fund: MutualFund): boolean {
  const name = fund.name.toLowerCase();
  return EXCLUDED_FUND_NAMES.some(ex => name.includes(ex));
}

function categoryCode(fund: MutualFund): string {
  return (fund.category || '').trim();
}

// ── Independent Filter Functions ──

export function filterByRisk(funds: MutualFund[], risk: string): MutualFund[] {
  const allowed = RISK_CATEGORY_MAP[risk];
  if (!allowed || allowed.length === 0) return funds;
  return funds.filter(f => allowed.includes(categoryCode(f)));
}

export function filterByGoal(funds: MutualFund[], goal: string): MutualFund[] {
  const allowed = GOAL_CATEGORY_MAP[goal];
  if (!allowed || allowed.length === 0) return funds;
  return funds.filter(f => allowed.includes(categoryCode(f)));
}

export function filterByHorizon(funds: MutualFund[], horizon: string): MutualFund[] {
  const allowed = HORIZON_CATEGORY_MAP[horizon];
  if (!allowed || allowed.length === 0) return funds;
  return funds.filter(f => allowed.includes(categoryCode(f)));
}

export function filterByExperience(funds: MutualFund[], experience: string): MutualFund[] {
  const allowed = EXPERIENCE_CATEGORY_MAP[experience];
  if (!allowed || allowed.length === 0) return funds;
  return funds.filter(f => allowed.includes(categoryCode(f)));
}

export function filterByAmount(funds: MutualFund[], amount: string): MutualFund[] {
  switch (amount) {
    case 'medium': // ₹50K–₹5L: remove AUM < 200 Cr
      return funds.filter(f => {
        const aum = safeNum(f.aum);
        return aum === null || aum >= 200;
      });
    case 'large': // ₹5L+: expense < 1%, AUM > 500 Cr
      return funds.filter(f => {
        const aum = safeNum(f.aum);
        const expense = safeNum(f.expenseRatio);
        const aumOk = aum === null || aum >= 500;
        const expenseOk = expense === null || expense < 1;
        return aumOk && expenseOk;
      });
    default: // 'small' / under ₹50K — no restriction
      return funds;
  }
}

// ── Intersection ──

function intersect(...sets: MutualFund[][]): MutualFund[] {
  if (sets.length === 0) return [];
  const idSets = sets.map(s => new Set(s.map(f => f.id)));
  const commonIds = [...idSets[0]].filter(id => idSets.every(s => s.has(id)));
  // Return fund objects from the first set
  const idToFund = new Map(sets[0].map(f => [f.id, f]));
  // But we need funds from the original full list — use first set as reference
  const allFunds = new Map<string, MutualFund>();
  for (const set of sets) {
    for (const f of set) {
      allFunds.set(f.id, f);
    }
  }
  return commonIds.map(id => allFunds.get(id)!).filter(Boolean);
}

// ── Ranking ──

function rankFunds(funds: MutualFund[]): MutualFund[] {
  return [...funds].sort((a, b) => {
    // Primary: Sharpe Ratio (3Y proxy — use sharpeRatio field)
    const sharpeA = safeNum(a.sharpeRatio) ?? 0;
    const sharpeB = safeNum(b.sharpeRatio) ?? 0;
    if (sharpeB !== sharpeA) return sharpeB - sharpeA;

    // Secondary: 3Y CAGR
    const cagr3A = safeNum(a.ret3Y ?? a.cagr3Y) ?? 0;
    const cagr3B = safeNum(b.ret3Y ?? b.cagr3Y) ?? 0;
    if (cagr3B !== cagr3A) return cagr3B - cagr3A;

    // Tertiary: Expense Ratio ascending
    const expA = safeNum(a.expenseRatio) ?? 99;
    const expB = safeNum(b.expenseRatio) ?? 99;
    return expA - expB;
  });
}

// ── Fallback Strategy ──
// If intersection is empty: relax Experience first, then Amount. Never relax Risk.

function applyFallback(
  funds: MutualFund[],
  prefs: IntersectionPreferences,
): MutualFund[] {
  const riskSet = filterByRisk(funds, prefs.riskTolerance);
  const goalSet = filterByGoal(funds, prefs.investmentGoal);
  const horizonSet = filterByHorizon(funds, prefs.investmentHorizon);

  // Try without experience filter
  let result = intersect(riskSet, goalSet, horizonSet, filterByAmount(funds, prefs.investmentAmount));
  if (result.length > 0) return result;

  // Try without experience AND amount filters
  result = intersect(riskSet, goalSet, horizonSet);
  if (result.length > 0) return result;

  // Try risk + goal only
  result = intersect(riskSet, goalSet);
  if (result.length > 0) return result;

  // Last resort: risk only
  return riskSet.length > 0 ? riskSet : funds;
}

// ── AMC diversity: max 2 per AMC ──
function diversifyByAmc(funds: MutualFund[], limit: number): MutualFund[] {
  const result: MutualFund[] = [];
  const amcCount = new Map<string, number>();

  for (const fund of funds) {
    if (result.length >= limit) break;
    const count = amcCount.get(fund.amc) || 0;
    if (count >= 2) continue;
    result.push(fund);
    amcCount.set(fund.amc, count + 1);
  }

  return result;
}

// ── Main Entry Point ──

export function recommendFundsV2(
  funds: MutualFund[],
  prefs: IntersectionPreferences,
): MutualFund[] {
  // Step 0: Remove excluded funds
  const cleanFunds = funds.filter(f => !isExcluded(f));

  // Step 1: Independent filters
  const riskFiltered = filterByRisk(cleanFunds, prefs.riskTolerance);
  const goalFiltered = filterByGoal(cleanFunds, prefs.investmentGoal);
  const horizonFiltered = filterByHorizon(cleanFunds, prefs.investmentHorizon);
  const experienceFiltered = filterByExperience(cleanFunds, prefs.experienceLevel);
  const amountFiltered = filterByAmount(cleanFunds, prefs.investmentAmount);

  // Step 2: Intersection
  let result = intersect(riskFiltered, goalFiltered, horizonFiltered, experienceFiltered, amountFiltered);

  // Step 3: Fallback if empty
  if (result.length === 0) {
    result = applyFallback(cleanFunds, prefs);
  }

  // Step 4: Rank
  const ranked = rankFunds(result);

  // Step 5: If > 20, trim. Then diversify by AMC, return top 9.
  const top = ranked.slice(0, 20);
  return diversifyByAmc(top, 9);
}
