import { ScoredFund, RecommendationPreferences } from './intersectionEngine';
import {
  AllocationBucket,
  getAllocationModel,
  normalizeAmcName,
  toCategoryCode,
  GOAL_ELIGIBILITY,
} from './categoryMappings';
import {
  getStrategyGroup,
  getProfileTypeForCoreSatellite,
  CORE_SATELLITE_MODELS,
} from './strategyGroups';

// ── Helpers ──

function catCode(fund: ScoredFund): string {
  return toCategoryCode(fund.category || '');
}

function isPassiveFund(fund: ScoredFund): boolean {
  const n = fund.name.toLowerCase();
  return n.includes('etf') || n.includes('index fund');
}

function getAC(cat: string): string {
  if (!cat) return 'Unknown';
  if (cat.startsWith('EQ-') || cat === 'Equity' || cat === 'Index') return 'equity';
  if (cat.startsWith('DT-') || cat === 'Debt' || cat === 'Liquid') return 'debt';
  if (cat.startsWith('HY-') || cat === 'Hybrid') return 'hybrid';
  return 'other';
}

export interface SelectionReason {
  reason: string;
}
export interface FundWithReason extends ScoredFund {
  selectionReason: string;
}

// ── Portfolio Constructor ──

export function constructPortfolio(
  scored: ScoredFund[],
  prefs: RecommendationPreferences,
  target: number,
  normalizedGoal: string,
): FundWithReason[] {
  const isRetirement = normalizedGoal === 'retirement';
  const model = getAllocationModel(prefs.riskTolerance, prefs.investmentGoal);
  const profileKey = getProfileTypeForCoreSatellite(prefs.riskTolerance, prefs.investmentGoal);
  const csModel = CORE_SATELLITE_MODELS[profileKey];
  const goalConfig = normalizedGoal ? GOAL_ELIGIBILITY[normalizedGoal] : null;
  const allowedPrefixes = goalConfig?.allowedCategoryPrefixes;

  // Group funds by strategy group, keeping top N by score
  const strategyGroupPicks = new Map<string, ScoredFund[]>();
  for (const f of scored) {
    const sg = getStrategyGroup(catCode(f));
    if (!strategyGroupPicks.has(sg)) strategyGroupPicks.set(sg, []);
    const arr = strategyGroupPicks.get(sg)!;
    arr.push(f);
  }
  // Sort each group by score descending
  for (const [, arr] of strategyGroupPicks) {
    arr.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  const result: FundWithReason[] = [];
  const usedAmcs = new Map<string, number>();
  const usedIds = new Set<string>();
  const usedCategories = new Map<string, number>();
  const usedStrategyGroups = new Set<string>();
  let etfCount = 0;
  let arbitrageCount = 0;
  const MAX_ETF = 3;
  const MAX_ARBITRAGE_RETIREMENT = 1;

  // ── PHASE 1: Core + Satellite Coverage ──
  // Pick 1 fund per strategy group starting with core, then satellite.
  // Cap total Phase 1 picks so Phase 2 (allocation model buckets) has room.

  const maxPhase1Picks = Math.min(
    csModel ? csModel.coreStrategyGroups.length + csModel.satelliteStrategyGroups.length : target,
    Math.floor(target * 0.6),
  );
  let phase1Picks = 0;

  const pickFund = (fund: ScoredFund, reason: string): boolean => {
    if (usedIds.has(fund.id)) return false;
    const normAmc = normalizeAmcName(fund.amc);
    const amcCount = usedAmcs.get(normAmc) || 0;
    if (amcCount >= 1) return false; // AMC cap = 1
    if (isPassiveFund(fund) && etfCount >= MAX_ETF) return false;
    if (isRetirement && catCode(fund) === 'HY-AR' && arbitrageCount >= MAX_ARBITRAGE_RETIREMENT) return false;
    if (result.length >= target) return false;

    // Goal prefix check for fill-remaining phase (apply always)
    if (allowedPrefixes !== null && allowedPrefixes !== undefined) {
      const cc = catCode(fund);
      if (!allowedPrefixes.some(p => cc === p || cc.startsWith(p))) return false;
    }

    result.push({ ...fund, selectionReason: reason });
    usedIds.add(fund.id);
    usedAmcs.set(normAmc, (usedAmcs.get(normAmc) || 0) + 1);
    const cc = catCode(fund);
    usedCategories.set(cc, (usedCategories.get(cc) || 0) + 1);
    usedStrategyGroups.add(getStrategyGroup(cc));
    if (isPassiveFund(fund)) etfCount++;
    if (cc === 'HY-AR') arbitrageCount++;
    return true;
  };

  // Phase 1a: Pick core strategy groups (1 each), up to the cap
  if (csModel) {
    for (const sg of csModel.coreStrategyGroups) {
      if (phase1Picks >= maxPhase1Picks) break;
      const candidates = strategyGroupPicks.get(sg) || [];
      for (const fund of candidates) {
        if (pickFund(fund, `Core: ${sg.replace(/_/g, ' ')} allocation`)) {
          phase1Picks++;
          break;
        }
      }
    }
  }

  // Phase 1b: Pick satellite strategy groups (1 each), up to the cap
  if (csModel) {
    for (const sg of csModel.satelliteStrategyGroups) {
      if (phase1Picks >= maxPhase1Picks) break;
      if (usedStrategyGroups.has(sg)) continue; // already picked as core
      const candidates = strategyGroupPicks.get(sg) || [];
      for (const fund of candidates) {
        if (pickFund(fund, `Satellite: ${sg.replace(/_/g, ' ')} allocation`)) {
          phase1Picks++;
          break;
        }
      }
    }
  }

  // ── PHASE 2: Allocation Model Bucket Fill ──
  // Each bucket has a shared budget across its categories.
  // E.g., ['EQ-FLX', 'EQ-MLC'] maxFunds=2 → at most 2 funds total from either category.

  // Map category → bucket index for quick lookup
  const catToBucketIdx = new Map<string, number>();
  for (let i = 0; i < model.length; i++) {
    for (const cat of model[i].categories) {
      catToBucketIdx.set(cat, i);
    }
  }

  // Track usage per bucket (initialized with Phase 1 picks that fall into buckets)
  const bucketUsage = new Array<number>(model.length).fill(0);
  for (const f of result) {
    const cc = catCode(f);
    const bi = catToBucketIdx.get(cc);
    if (bi !== undefined) bucketUsage[bi]++;
  }

  // Also build category-level max from buckets for Phase 3 fallback
  const categoryBucket: Map<string, number> = new Map();
  for (const bucket of model) {
    for (const cat of bucket.categories) {
      const existing = categoryBucket.get(cat) || 0;
      categoryBucket.set(cat, Math.max(existing, bucket.maxFunds));
    }
  }

  // Build remaining candidates: scored funds not yet picked, grouped by category
  const remainingByCategory = new Map<string, ScoredFund[]>();
  for (const f of scored) {
    if (usedIds.has(f.id)) continue;
    const cc = catCode(f);
    if (!remainingByCategory.has(cc)) remainingByCategory.set(cc, []);
    remainingByCategory.get(cc)!.push(f);
  }
  for (const [, arr] of remainingByCategory) {
    arr.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  for (let i = 0; i < model.length; i++) {
    const bucket = model[i];
    if (bucketUsage[i] >= bucket.maxFunds) continue;
    for (const cat of bucket.categories) {
      if (bucketUsage[i] >= bucket.maxFunds) break;
      const candidates = remainingByCategory.get(cat) || [];
      for (const fund of candidates) {
        if (bucketUsage[i] >= bucket.maxFunds) break;
        if (result.length >= target) break;
        if (usedIds.has(fund.id)) continue;
        if (pickFund(fund, `Category slot: ${cat}`)) {
          bucketUsage[i]++;
        }
      }
    }
  }

  // ── PHASE 3: Fill Remaining ──
  if (result.length < target) {
    for (const fund of scored) {
      if (result.length >= target) break;
      if (usedIds.has(fund.id)) continue;

      const cc = catCode(fund);
      const maxAllowed = categoryBucket.get(cc) || 1; // default max 1
      if ((usedCategories.get(cc) || 0) >= maxAllowed) continue;

      const normAmc = normalizeAmcName(fund.amc);
      const amcCount = usedAmcs.get(normAmc) || 0;
      if (amcCount >= 1) continue;
      if (isPassiveFund(fund) && etfCount >= MAX_ETF) continue;
      if (isRetirement && cc === 'HY-AR' && arbitrageCount >= MAX_ARBITRAGE_RETIREMENT) continue;

      if (allowedPrefixes !== null && allowedPrefixes !== undefined) {
        if (!allowedPrefixes.some(p => cc === p || cc.startsWith(p))) continue;
      }

      // Max 60% from same asset class
      const assetCounts = new Map<string, number>();
      result.forEach(f => {
        const ac = getAC(catCode(f));
        assetCounts.set(ac, (assetCounts.get(ac) || 0) + 1);
      });
      const ac = getAC(cc);
      if (assetCounts.size >= 1 && (assetCounts.get(ac) || 0) >= Math.ceil(target * 0.6)) continue;

      pickFund(fund, `Fill remaining: top-ranked ${cc}`);
      // pickFund already increments usedCategories via catCode
    }
  }

  const finalEtfCount = result.filter(f => isPassiveFund(f)).length;
  console.log(`[CIFRAA-RECO] ETF_COUNT=${finalEtfCount}`);
  console.log(`[CIFRAA-RECO] ACTIVE_COUNT=${result.length - finalEtfCount}`);

  return result;
}
