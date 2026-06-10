import { MutualFund } from '@/types/mutualFund';
import { recommendFundsV2, RecommendationPreferences, ScoredFund } from './intersectionEngine';

const PROFILES: { label: string; prefs: RecommendationPreferences }[] = [
  {
    label: 'PROFILE A (Aggressive / Wealth Creation / 10+ Years)',
    prefs: {
      riskTolerance: 'aggressive',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'long',
      experienceLevel: 'experienced',
      investmentAmount: 'medium',
    },
  },
  {
    label: 'PROFILE B (Moderate / Wealth Creation / 5-10 Years)',
    prefs: {
      riskTolerance: 'moderate',
      investmentGoal: 'wealth_creation',
      investmentHorizon: 'long',
      experienceLevel: 'intermediate',
      investmentAmount: 'medium',
    },
  },
  {
    label: 'PROFILE C (Conservative / Capital Preservation / <3 Years)',
    prefs: {
      riskTolerance: 'conservative',
      investmentGoal: 'capital_preservation',
      investmentHorizon: 'short',
      experienceLevel: 'beginner',
      investmentAmount: 'medium',
    },
  },
];

function intersection<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  return a.filter(x => setB.has(x));
}

export function runDifferentiationTest(funds: MutualFund[]): void {
  console.log('%c══════════════════════════════════════════════', 'color: cyan');
  console.log('%c CIFRAA DIFFERENTIATION TEST', 'color: cyan; font-size: 18px; font-weight: bold');
  console.log('%c══════════════════════════════════════════════', 'color: cyan');
  console.log(`Total funds in universe: ${funds.length}`);

  const allResults: { label: string; prefs: RecommendationPreferences; top10: ScoredFund[] }[] = [];

  for (const profile of PROFILES) {
    console.log(`\n%c── ${profile.label} ──`, 'color: yellow; font-weight: bold');
    const result = recommendFundsV2(funds, profile.prefs);
    const top10 = result.slice(0, 10);
    allResults.push({ ...profile, top10 });
    console.log(`Final recommendation count: ${result.length}`);
    console.log(`Top 10:`);
    top10.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name} (${f.category}) — score: ${f.compositeScore}`);
    });
  }

  // Overlap analysis
  console.log(`\n%c══════════════════════════════════════════════`, 'color: magenta');
  console.log('%c OVERLAP ANALYSIS', 'color: magenta; font-size: 16px; font-weight: bold');
  console.log('%c══════════════════════════════════════════════', 'color: magenta');

  const pairs = [
    ['A', 'B', 0, 1],
    ['A', 'C', 0, 2],
    ['B', 'C', 1, 2],
  ];

  for (const [nameA, nameB, idxA, idxB] of pairs) {
    const idsA = allResults[idxA].top10.map(f => f.id);
    const idsB = allResults[idxB].top10.map(f => f.id);
    const overlap = intersection(idsA, idsB);
    const overlapPct = Math.round((overlap.length / 10) * 100);
    const status = overlapPct <= (nameB === 'B' ? 50 : 20) ? '✓ PASS' : '✗ FAIL';

    console.log(`\n${status}: ${nameA} vs ${nameB} overlap: ${overlapPct}% (target: ${nameB === 'B' ? '<50%' : '<20%'})`);
    if (overlap.length > 0) {
      console.log(`  Overlapping fund IDs: ${overlap.join(', ')}`);
      for (const id of overlap) {
        const fA = allResults[idxA].top10.find(f => f.id === id);
        const fB = allResults[idxB].top10.find(f => f.id === id);
        console.log(`  → ${fA?.name} (A rank: ${allResults[idxA].top10.indexOf(fA!)+1}, B rank: ${allResults[idxB].top10.indexOf(fB!)+1})`);
      }
    }
  }

  // Per-profile category diversity
  console.log(`\n%c══════════════════════════════════════════════`, 'color: green');
  console.log('%c CATEGORY DIVERSITY', 'color: green; font-size: 16px; font-weight: bold');
  console.log('%c══════════════════════════════════════════════', 'color: green');

  for (const result of allResults) {
    const cats = [...new Set(result.top10.map(f => f.category))];
    console.log(`\n${result.label}: ${cats.length} distinct categories`);
    result.top10.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name} — ${f.category}`);
    });
  }

  console.log(`\n%c──────────────────────────────────────────────`, 'color: gray');
  console.log('%c TEST COMPLETE', 'color: gray');
  console.log('%c──────────────────────────────────────────────', 'color: gray');
}
