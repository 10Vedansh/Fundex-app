import { describe, it, beforeAll } from 'vitest';
import { MutualFund } from '@/types/mutualFund';
import {
  scoreV3, computeCategoryMedians, computeNormStats,
  determineProfileType, V3ScoreResult,
} from './scoringEngineV3';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from './intersectionEngine';
import {
  GOAL_ELIGIBILITY, RISK_CONSTRAINTS, HORIZON_RULES,
  EXPERIENCE_MODIFIERS, AMOUNT_CONSTRAINTS, BUSINESS_EXCLUDED_CATEGORIES,
  EXCLUDED_FUND_NAMES, SECTORAL_CATEGORIES,
} from './categoryMappings';
import { MOCK_FUNDS } from './mockFundUniverse';

// ── Category helpers ──

const TARGET_CATEGORIES = ['HY-DAA','HY-MAA','HY-AR','HY-EQ S','HY-CH','DT-CB','DT-SD'];

function catCode(cat: string): string {
  return (cat || '').trim();
}

function getAC(cat: string): string {
  if (!cat) return 'Unknown';
  const c = cat.trim();
  if (c.startsWith('EQ-') || c === 'Equity' || c === 'Index') return 'Equity';
  if (c.startsWith('DT-') || c.startsWith('Debt') || c === 'Liquid') return 'Debt';
  if (c.startsWith('HY-') || c.startsWith('Hybrid')) return 'Hybrid';
  return 'Other';
}

function hasCompleteMetrics(f: MutualFund): boolean {
  return (
    (f.ret3Y ?? f.cagr3Y) !== null &&
    f.sharpeRatio !== null &&
    f.sortinoRatio !== null &&
    (f.volatility ?? f.stdDev) !== null
  );
}

// ── Eligibility helpers (mirrors intersectionEngine logic) ──

function isExcluded(f: MutualFund): boolean {
  const n = f.name.toLowerCase();
  const cat = (f.category || '').trim();
  if (BUSINESS_EXCLUDED_CATEGORIES.some(c => cat === c || cat.startsWith(c))) return true;
  if (EXCLUDED_FUND_NAMES.some(name => n.includes(name.toLowerCase()))) return true;
  return false;
}

function applyRiskConstraints(funds: MutualFund[], risk: string): MutualFund[] {
  const rc = RISK_CONSTRAINTS[risk];
  if (!rc) return funds;
  const catToCode = (c: string) => c;
  if (rc.blockedCategories) {
    return funds.filter(f => {
      const cc = catToCode(f.category || '');
      return !rc.blockedCategories.some((b: string) => cc === b || cc.startsWith(b));
    });
  }
  return funds;
}

function applyGoalEligibility(funds: MutualFund[], goal: string): MutualFund[] {
  const gc = GOAL_ELIGIBILITY[goal];
  if (!gc) return funds;
  let eligible = funds;
  if (gc.allowedCategoryPrefixes !== null && gc.allowedCategoryPrefixes !== undefined) {
    const prefixes = gc.allowedCategoryPrefixes as string[];
    eligible = eligible.filter(f => {
      const cc = catCode(f.category || '');
      return prefixes.some(p => cc === p || cc.startsWith(p));
    });
  }
  if (gc.blockedCategories && gc.blockedCategories.length > 0) {
    eligible = eligible.filter(f => {
      const cc = catCode(f.category || '');
      return !gc.blockedCategories.some((b: string) => cc === b || cc.startsWith(b));
    });
  }
  return eligible;
}

function applyHorizonRules(funds: MutualFund[], horizon: string): MutualFund[] {
  const hr = HORIZON_RULES[horizon];
  if (!hr) return funds;
  if (hr.blockedCategories) {
    return funds.filter(f => {
      const cc = catCode(f.category || '');
      return !hr.blockedCategories.some((b: string) => cc === b || cc.startsWith(b));
    });
  }
  return funds;
}

function applyExperienceFilter(funds: MutualFund[], experience: string): MutualFund[] {
  const em = EXPERIENCE_MODIFIERS[experience];
  if (!em || !em.blockedCategories) return funds;
  return funds.filter(f => {
    const cc = catCode(f.category || '');
    return !em.blockedCategories.some((b: string) => cc === b || cc.startsWith(b));
  });
}

function applyAmountConstraints(funds: MutualFund[], amount: string): MutualFund[] {
  const ac = AMOUNT_CONSTRAINTS[amount];
  if (!ac) return funds;
  if (ac.minInvestment) {
    return funds.filter(f => (f.minInvestment || 0) <= ac.minInvestment);
  }
  return funds;
}

function normalizeGoal(g: string): string {
  if (!g) return 'wealth_creation';
  const gl = g.toLowerCase().replace(/[\s-]/g, '_');
  if (['wealth_creation', 'wealth creation', 'wealth', 'growth'].includes(gl)) return 'wealth_creation';
  if (['retirement'].includes(gl)) return 'retirement';
  if (['capital_preservation', 'capital preservation', 'preservation', 'income'].includes(gl)) return 'capital_preservation';
  if (['child_education', 'child education', 'education'].includes(gl)) return 'child_education';
  if (['passive_income', 'passive income'].includes(gl)) return 'passive_income';
  if (['tax_saving', 'tax saving', 'tax'].includes(gl)) return 'tax_saving';
  return 'wealth_creation';
}

function normalizeHorizon(h: string): string {
  if (!h) return 'medium';
  const hl = h.toLowerCase();
  if (['short', '<3', 'less than 3'].some(x => hl.includes(x))) return 'short';
  if (['long', '>7', 'more than 7'].some(x => hl.includes(x))) return 'long';
  return 'medium';
}

// ── Profile definitions ──

interface AuditProfile {
  label: string;
  prefs: RecommendationPreferences;
  normalizedGoal: string;
}

const AUDIT_PROFILES: AuditProfile[] = [
  {
    label: 'Retirement Planner',
    prefs: { riskTolerance: 'moderate', investmentGoal: 'retirement', investmentHorizon: 'long', experienceLevel: 'intermediate', investmentAmount: 'medium' },
    normalizedGoal: 'retirement',
  },
  {
    label: 'Capital Preservation',
    prefs: { riskTolerance: 'conservative', investmentGoal: 'capital_preservation', investmentHorizon: 'short', experienceLevel: 'beginner', investmentAmount: 'medium' },
    normalizedGoal: 'capital_preservation',
  },
  {
    label: 'Aggressive Growth',
    prefs: { riskTolerance: 'aggressive', investmentGoal: 'wealth_creation', investmentHorizon: 'long', experienceLevel: 'advanced', investmentAmount: 'large' },
    normalizedGoal: 'wealth_creation',
  },
];

// ── Category ranking function ──

interface CategoryAudit {
  category: string;
  total: number;
  completeMetrics: number;
  eligible: number;
  avgScore: number;
  over50: number;
  over60: number;
  top10AvgScore: number;
  poolStrength: 'Strong' | 'Adequate' | 'Weak' | 'Very Weak';
}

function rankPool(pctOver50: number, pctOver60: number, avgScore: number): 'Strong' | 'Adequate' | 'Weak' | 'Very Weak' {
  if (pctOver50 >= 40 && pctOver60 >= 20 && avgScore >= 55) return 'Strong';
  if (pctOver50 >= 20 && avgScore >= 45) return 'Adequate';
  if (pctOver50 >= 10 || avgScore >= 35) return 'Weak';
  return 'Very Weak';
}

describe('Category Pool Quality Audit', () => {
  let funds: MutualFund[];

  beforeAll(() => {
    funds = MOCK_FUNDS;
    console.log(`Loaded ${funds.length} funds for category pool audit`);
  });

  it('audits candidate pool quality per profile per category', () => {
    const allResults: { profile: string; audits: CategoryAudit[]; report: string }[] = [];

    for (const profile of AUDIT_PROFILES) {
      console.log(`\n${'='.repeat(130)}`);
      console.log(`  PROFILE: ${profile.label}`);
      console.log(`  Preferences: ${JSON.stringify(profile.prefs)}`);
      console.log(`${'='.repeat(130)}`);

      const normalizedGoal = normalizeGoal(profile.prefs.investmentGoal);
      const normalizedHorizon = normalizeHorizon(profile.prefs.investmentHorizon);

      // Step 1: Get eligible + scored pool
      const cleanFunds = funds.filter(f => !isExcluded(f));
      let eligible = applyRiskConstraints(cleanFunds, profile.prefs.riskTolerance);
      eligible = applyGoalEligibility(eligible, normalizedGoal);
      eligible = applyHorizonRules(eligible, normalizedHorizon);
      eligible = applyExperienceFilter(eligible, profile.prefs.experienceLevel);
      eligible = applyAmountConstraints(eligible, profile.prefs.investmentAmount);

      // Score all eligible funds
      const medians = computeCategoryMedians(eligible);
      const stats = computeNormStats(eligible);

      const scored = eligible.map(f => {
        const result: V3ScoreResult = scoreV3(
          f, stats, medians,
          profile.prefs.experienceLevel,
          profile.prefs.riskTolerance,
          normalizedHorizon,
          normalizedGoal,
        );
        return { ...f, compositeScore: result.score };
      });
      scored.sort((a, b) => b.compositeScore - a.compositeScore);

      // Step 2: Group by category
      const byCategory = new Map<string, typeof scored>();
      for (const f of scored) {
        const cc = catCode(f.category || '');
        if (!byCategory.has(cc)) byCategory.set(cc, []);
        byCategory.get(cc)!.push(f);
      }

      // Step 3: Compute stats per category
      const audits: CategoryAudit[] = [];
      const sortedCats = Array.from(byCategory.keys()).sort((a, b) => {
        const aScore = byCategory.get(a)!.reduce((s, f) => s + f.compositeScore, 0) / byCategory.get(a)!.length;
        const bScore = byCategory.get(b)!.reduce((s, f) => s + f.compositeScore, 0) / byCategory.get(b)!.length;
        return bScore - aScore;
      });

      for (const cat of sortedCats) {
        const catFunds = byCategory.get(cat)!;
        const total = catFunds.length;
        const complete = catFunds.filter(f => hasCompleteMetrics(f)).length;
        const avgScore = catFunds.reduce((s, f) => s + f.compositeScore, 0) / total;
        const over50 = catFunds.filter(f => f.compositeScore > 50).length;
        const over60 = catFunds.filter(f => f.compositeScore > 60).length;
        const top10 = catFunds.slice(0, Math.min(10, total));
        const top10Avg = top10.reduce((s, f) => s + f.compositeScore, 0) / top10.length;
        const pctOver50 = total > 0 ? (over50 / total) * 100 : 0;
        const pctOver60 = total > 0 ? (over60 / total) * 100 : 0;

        audits.push({
          category: cat,
          total,
          completeMetrics: complete,
          eligible: total,
          avgScore: Math.round(avgScore * 10) / 10,
          over50,
          over60,
          top10AvgScore: Math.round(top10Avg * 10) / 10,
          poolStrength: rankPool(pctOver50, pctOver60, avgScore),
        });
      }

      // Step 4: Print main table
      console.log(`\n  ${'Category'.padEnd(16)} ${'Total'.padEnd(6)} ${'Complete'.padEnd(9)} ${'AvgScore'.padEnd(9)} ${'>50'.padEnd(5)} ${'>60'.padEnd(5)} ${'Top10Avg'.padEnd(9)} ${'Pool'.padEnd(12)}`);
      console.log(`  ${'─'.repeat(16)} ${'─'.repeat(6)} ${'─'.repeat(9)} ${'─'.repeat(9)} ${'─'.repeat(5)} ${'─'.repeat(5)} ${'─'.repeat(9)} ${'─'.repeat(12)}`);
      for (const a of audits) {
        const icon = a.poolStrength === 'Strong' ? '🟢' : a.poolStrength === 'Adequate' ? '🟡' : a.poolStrength === 'Weak' ? '🟠' : '🔴';
        console.log(`  ${a.category.padEnd(16)} ${String(a.total).padEnd(6)} ${String(a.completeMetrics).padEnd(9)} ${String(a.avgScore).padEnd(9)} ${String(a.over50).padEnd(5)} ${String(a.over60).padEnd(5)} ${String(a.top10AvgScore).padEnd(9)} ${icon} ${a.poolStrength.padEnd(10)}`);
      }

      // Step 5: Specific audit for target categories
      console.log(`\n  ── Target Category Deep Dive ──`);
      console.log(`  ${'Category'.padEnd(16)} ${'Total'.padEnd(6)} ${'Complete'.padEnd(9)} ${'AvgScore'.padEnd(9)} ${'>50'.padEnd(5)} ${'>60'.padEnd(5)} ${'Top10Avg'.padEnd(9)} ${'Top Fund (score)'.padEnd(35)}`);
      console.log(`  ${'─'.repeat(16)} ${'─'.repeat(6)} ${'─'.repeat(9)} ${'─'.repeat(9)} ${'─'.repeat(5)} ${'─'.repeat(5)} ${'─'.repeat(9)} ${'─'.repeat(35)}`);
      for (const cat of TARGET_CATEGORIES) {
        const catFunds = byCategory.get(cat) || [];
        if (catFunds.length === 0) {
          console.log(`  ${cat.padEnd(16)} ${'0'.padEnd(6)} ${'NO DATA'.padEnd(50)}`);
          continue;
        }
        const total = catFunds.length;
        const complete = catFunds.filter(f => hasCompleteMetrics(f)).length;
        const avgScore = catFunds.reduce((s, f) => s + f.compositeScore, 0) / total;
        const over50 = catFunds.filter(f => f.compositeScore > 50).length;
        const over60 = catFunds.filter(f => f.compositeScore > 60).length;
        const top10 = catFunds.slice(0, Math.min(10, total));
        const top10Avg = top10.reduce((s, f) => s + f.compositeScore, 0) / top10.length;
        const topFund = catFunds[0];
        const topLabel = topFund ? `${(topFund as any).name?.substring(0, 25) || '?'} (${topFund.compositeScore.toFixed(1)})` : 'N/A';
        console.log(`  ${cat.padEnd(16)} ${String(total).padEnd(6)} ${String(complete).padEnd(9)} ${String(Math.round(avgScore * 10) / 10).padEnd(9)} ${String(over50).padEnd(5)} ${String(over60).padEnd(5)} ${String(Math.round(top10Avg * 10) / 10).padEnd(9)} ${topLabel.substring(0, 34).padEnd(35)}`);
      }

      // Step 6: Top 10 candidates overall (before construction)
      console.log(`\n  ── Top 10 Eligible Candidates (pre-construction) ──`);
      console.log(`  ${'#'.padEnd(3)} ${'Fund Name'.padEnd(40)} ${'Category'.padEnd(14)} ${'Score'.padEnd(7)} ${'CAGR3Y'.padEnd(8)} ${'Sharpe'.padEnd(8)} ${'AMC'.padEnd(20)}`);
      console.log(`  ${'─'.repeat(3)} ${'─'.repeat(40)} ${'─'.repeat(14)} ${'─'.repeat(7)} ${'─'.repeat(8)} ${'─'.repeat(8)} ${'─'.repeat(20)}`);
      scored.slice(0, 10).forEach((f, i) => {
        const n = (f as any).name || '?';
        const cat = catCode((f as any).category || '');
        const cagr = (f as any).cagr3Y ?? (f as any).ret3Y;
        const sharpe = f.sharpeRatio;
        const amc = (f as any).amc || '?';
        console.log(`  ${String(i + 1).padEnd(3)} ${n.substring(0, 39).padEnd(40)} ${cat.padEnd(14)} ${f.compositeScore.toFixed(1).padEnd(7)} ${cagr !== null ? cagr.toFixed(1).padEnd(8) : 'N/A'.padEnd(8)} ${sharpe !== null ? sharpe.toFixed(2).padEnd(8) : 'N/A'.padEnd(8)} ${amc.substring(0, 19).padEnd(20)}`);
      });

      // Step 7: Show what the portfolio constructor selects
      console.log(`\n  ── Constructed Portfolio (recommendFundsV2 output) ──`);
      const constructed = recommendFundsV2(funds, profile.prefs);
      console.log(`  ${'#'.padEnd(3)} ${'Fund Name'.padEnd(40)} ${'Category'.padEnd(14)} ${'Score'.padEnd(7)} ${'Reason'.padEnd(30)}`);
      console.log(`  ${'─'.repeat(3)} ${'─'.repeat(40)} ${'─'.repeat(14)} ${'─'.repeat(7)} ${'─'.repeat(30)}`);
      constructed.forEach((f, i) => {
        const n = (f as any).name || '?';
        const cat = catCode((f as any).category || '');
        const reason = (f as any).selectionReason || '';
        console.log(`  ${String(i + 1).padEnd(3)} ${n.substring(0, 39).padEnd(40)} ${cat.padEnd(14)} ${f.compositeScore.toFixed(1).padEnd(7)} ${reason.substring(0, 29).padEnd(30)}`);
      });

      allResults.push({ profile: profile.label, audits, report: '' });
    }

    // Step 8: Category ranking across all profiles
    console.log(`\n\n${'='.repeat(130)}`);
    console.log('  CATEGORY RANKING — STRONGEST TO WEAKEST');
    console.log('  (average of avgScore across all 3 profiles, weighted by pool quality)');
    console.log(`${'='.repeat(130)}`);

    // Aggregate across profiles
    const catAgg = new Map<string, { total: number; avgScores: number[]; strengths: string[] }>();
    for (const r of allResults) {
      for (const a of r.audits) {
        if (!catAgg.has(a.category)) catAgg.set(a.category, { total: 0, avgScores: [], strengths: [] });
        const entry = catAgg.get(a.category)!;
        entry.total += a.total;
        entry.avgScores.push(a.avgScore);
        entry.strengths.push(a.poolStrength);
      }
    }

    const rankedCats = Array.from(catAgg.entries()).sort((a, b) => {
      const scoreA = a[1].avgScores.reduce((s, v) => s + v, 0) / a[1].avgScores.length;
      const scoreB = b[1].avgScores.reduce((s, v) => s + v, 0) / b[1].avgScores.length;
      return scoreB - scoreA;
    });

    console.log(`\n  ${'Rank'.padEnd(5)} ${'Category'.padEnd(18)} ${'Avg Score'.padEnd(11)} ${'Pool'.padEnd(14)} ${'Total Funds'.padEnd(12)}`);
    console.log(`  ${'─'.repeat(5)} ${'─'.repeat(18)} ${'─'.repeat(11)} ${'─'.repeat(14)} ${'─'.repeat(12)}`);
    rankedCats.forEach(([cat, data], i) => {
      const avgScore = data.avgScores.reduce((s, v) => s + v, 0) / data.avgScores.length;
      const dominantStrength = data.strengths.filter(s => s === 'Strong').length > data.strengths.length / 2 ? 'Strong'
        : data.strengths.filter(s => s === 'Adequate').length > 0 ? 'Adequate'
        : data.strengths.filter(s => s === 'Weak').length > 0 ? 'Weak' : 'Very Weak';
      const total = data.total;
      console.log(`  ${String(i + 1).padEnd(5)} ${cat.padEnd(18)} ${avgScore.toFixed(1).padEnd(11)} ${dominantStrength.padEnd(14)} ${String(total).padEnd(12)}`);
    });

    // Step 9: Answer the question — weak construction or weak pool?
    console.log(`\n\n${'='.repeat(130)}`);
    console.log('  ROOT CAUSE ANALYSIS: Weak Construction vs Weak Candidate Pools');
    console.log(`${'='.repeat(130)}`);
    for (const r of allResults) {
      console.log(`\n  ${r.profile}:`);

      // Compare avg score of top 10 eligible vs avg score of constructed
      const profileFunds = AUDIT_PROFILES.find(p => p.label === r.profile)!;
      const clean = funds.filter(f => !isExcluded(f));
      let el = applyRiskConstraints(clean, profileFunds.prefs.riskTolerance);
      el = applyGoalEligibility(el, normalizeGoal(profileFunds.prefs.investmentGoal));
      el = applyHorizonRules(el, normalizeHorizon(profileFunds.prefs.investmentHorizon));
      el = applyExperienceFilter(el, profileFunds.prefs.experienceLevel);
      el = applyAmountConstraints(el, profileFunds.prefs.investmentAmount);
      const m = computeCategoryMedians(el);
      const s = computeNormStats(el);
      const ng = normalizeGoal(profileFunds.prefs.investmentGoal);
      const nh = normalizeHorizon(profileFunds.prefs.investmentHorizon);
      const sc = el.map(f => {
        const res = scoreV3(f, s, m, profileFunds.prefs.experienceLevel, profileFunds.prefs.riskTolerance, nh, ng);
        return { ...f, compositeScore: res.score };
      });
      sc.sort((a, b) => b.compositeScore - a.compositeScore);
      const top10AvgEligible = sc.slice(0, 10).reduce((sum, f) => sum + f.compositeScore, 0) / Math.min(10, sc.length);

      const constructed = recommendFundsV2(funds, profileFunds.prefs);
      const constructedAvgScore = constructed.reduce((sum, f) => sum + f.compositeScore, 0) / constructed.length;

      const scoreDrop = top10AvgEligible - constructedAvgScore;
      const eligibleCount = sc.length;

      console.log(`    Eligible candidate pool size: ${eligibleCount}`);
      console.log(`    Avg score of top 10 eligible:  ${top10AvgEligible.toFixed(1)}`);
      console.log(`    Avg score of constructed:      ${constructedAvgScore.toFixed(1)}`);
      console.log(`    Score drop (elig→constructed): ${scoreDrop.toFixed(1)} pts`);

      // Count categories with weak pools
      const weakPools = r.audits.filter(a => a.poolStrength === 'Weak' || a.poolStrength === 'Very Weak');
      const strongPools = r.audits.filter(a => a.poolStrength === 'Strong' || a.poolStrength === 'Adequate');

      console.log(`    Strong/Adequate categories:    ${strongPools.length}`);
      console.log(`    Weak/Very Weak categories:     ${weakPools.length}`);

      if (weakPools.length > strongPools.length && scoreDrop < 5) {
        console.log(`    🔴 VERDICT: Weak candidate pools. ${weakPools.length} of ${r.audits.length} categories have weak candidate pools. Construction picks the best available.`);
      } else if (scoreDrop >= 10) {
        console.log(`    🔴 VERDICT: Weak portfolio construction. Top eligible funds average ${top10AvgEligible.toFixed(1)} but construction only achieves ${constructedAvgScore.toFixed(1)} — a ${scoreDrop.toFixed(1)}-point drop.`);
      } else if (scoreDrop >= 5) {
        console.log(`    🟡 VERDICT: Mixed. Moderate score drop (${scoreDrop.toFixed(1)} pts) suggests construction is filtering, but pool has some weakness.`);
      } else {
        console.log(`    🟢 VERDICT: Healthy. Strong candidate pools and construction preserves quality (${scoreDrop.toFixed(1)} pt drop).`);
      }
    }
  });
});
