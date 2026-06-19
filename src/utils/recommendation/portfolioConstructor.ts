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

function isBondIndexFund(name: string): boolean {
  return /(?:Nifty\s+(?:AAA\s+CPSE\s+Bond|Bharat\s+Bond|SDL|G\s*Sec|Gilt)|CRISIL\s+(?:IBX|SDL|Gilt)|Bond\s+Plus\s+SDL|SDL\s+Index|Gilt\s+Index|Corporate\s+Bond\s+Index|CPSE\s+Bond\s+Plus\s+SDL)/i.test(name);
}

function getAC(cat: string, name?: string): string {
  if (!cat) return 'Unknown';
  if (cat.startsWith('EQ-') || cat === 'Equity') return 'equity';
  if (cat === 'Index') {
    if (name && isBondIndexFund(name)) return 'debt';
    return 'equity';
  }
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

// ── Retirement Model Portfolio ──
// Dedicated model portfolio for retirement (moderate risk).
// Uses fixed category slots instead of generic allocation + core-satellite.

interface RetirementSlot {
  categories: string[];
  maxFunds: number;
  label: string;
}

const RETIREMENT_SLOTS: RetirementSlot[] = [
  { categories: ['EQ-LC', 'EQ-L&MC', 'Index'], maxFunds: 2, label: 'Large Cap / Index' },
  { categories: ['EQ-FLX'], maxFunds: 2, label: 'Flexi Cap' },
  { categories: ['EQ-MLC'], maxFunds: 1, label: 'Multi Cap' },
  { categories: ['DT-CB', 'DT-BK & PSU'], maxFunds: 1, label: 'Corporate Bond / Banking PSU' },
  { categories: ['DT-SD'], maxFunds: 1, label: 'Short Duration' },
  { categories: ['HY-DAA'], maxFunds: 1, label: 'Balanced Advantage' },
  { categories: ['HY-MAA'], maxFunds: 1, label: 'Multi Asset Allocation' },
];

const RETIREMENT_FALLBACK = ['HY-CH', 'HY-AR', 'HY-EQ S', 'DT-GL', 'DT-Floater', 'DT-USD', 'DT-LIQ', 'DT-MM'];

function buildRetirementPortfolio(
  scored: ScoredFund[],
  prefs: RecommendationPreferences,
  target: number,
  normalizedGoal: string,
): FundWithReason[] {
  const goalConfig = normalizedGoal ? GOAL_ELIGIBILITY[normalizedGoal] : null;
  const allowedPrefixes = goalConfig?.allowedCategoryPrefixes;

  // Group funds by category, sorted descending by score
  const byCategory = new Map<string, ScoredFund[]>();
  for (const f of scored) {
    const cc = catCode(f);
    if (!byCategory.has(cc)) byCategory.set(cc, []);
    byCategory.get(cc)!.push(f);
  }
  for (const [, arr] of byCategory) {
    arr.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  const result: FundWithReason[] = [];
  const usedAmcs = new Map<string, number>();
  const usedIds = new Set<string>();
  const usedCategories = new Map<string, number>();
  let etfCount = 0;
  const MAX_ETF = 3;

  function canPick(fund: ScoredFund): boolean {
    if (usedIds.has(fund.id)) return false;
    const normAmc = normalizeAmcName(fund.amc);
    if ((usedAmcs.get(normAmc) || 0) >= 1) return false;
    if (isPassiveFund(fund) && etfCount >= MAX_ETF) return false;
    if (result.length >= target) return false;
    if (allowedPrefixes !== null && allowedPrefixes !== undefined) {
      const cc = catCode(fund);
      if (!allowedPrefixes.some(p => cc === p || cc.startsWith(p))) return false;
    }
    return true;
  }

  function pickFund(fund: ScoredFund, reason: string): boolean {
    if (!canPick(fund)) return false;
    const cc = catCode(fund);
    const normAmc = normalizeAmcName(fund.amc);
    result.push({ ...fund, selectionReason: reason });
    usedIds.add(fund.id);
    usedAmcs.set(normAmc, (usedAmcs.get(normAmc) || 0) + 1);
    usedCategories.set(cc, (usedCategories.get(cc) || 0) + 1);
    if (isPassiveFund(fund)) etfCount++;
    return true;
  }

  function bestFromCategories(cats: string[]): ScoredFund | null {
    let best: ScoredFund | null = null;
    for (const cat of cats) {
      const candidates = byCategory.get(cat) || [];
      for (const fund of candidates) {
        if (!canPick(fund)) continue;
        if (!best || fund.compositeScore > best.compositeScore) {
          best = fund;
        }
      }
    }
    return best;
  }

  // Track per-slot usage (how many funds already picked per slot)
  function slotIndexFor(cc: string): number {
    for (let i = 0; i < RETIREMENT_SLOTS.length; i++) {
      if (RETIREMENT_SLOTS[i].categories.includes(cc)) return i;
    }
    return -1;
  }

  const slotUsage = new Array(RETIREMENT_SLOTS.length).fill(0);
  function slotHasRoom(idx: number): boolean {
    return slotUsage[idx] < RETIREMENT_SLOTS[idx].maxFunds;
  }

  // ── PHASE 1: Pick exactly 1 fund from each slot ──
  for (let i = 0; i < RETIREMENT_SLOTS.length; i++) {
    if (result.length >= target) break;
    const slot = RETIREMENT_SLOTS[i];
    const best = bestFromCategories(slot.categories);
    if (best) {
      if (pickFund(best, `Retirement: ${slot.label}`)) {
        slotUsage[i]++;
      }
    }
  }

  // ── PHASE 2: Fill remaining from slot categories (up to maxFunds) ──
  // Build a single sorted list of remaining candidates from slot categories
  const slotCategorySet = new Set<string>();
  for (const slot of RETIREMENT_SLOTS) {
    for (const cat of slot.categories) {
      slotCategorySet.add(cat);
    }
  }
  const remaining: ScoredFund[] = [];
  for (const f of scored) {
    if (usedIds.has(f.id)) continue;
    if (slotCategorySet.has(catCode(f))) remaining.push(f);
  }
  remaining.sort((a, b) => b.compositeScore - a.compositeScore);

  for (const fund of remaining) {
    if (result.length >= target) break;
    const cc = catCode(fund);
    const si = slotIndexFor(cc);
    if (si === -1 || !slotHasRoom(si)) continue;

    // 60% asset class cap
    const ac = getAC(cc, fund.name);
    const assetCounts = new Map<string, number>();
    result.forEach(f => {
      const a = getAC(catCode(f), f.name);
      assetCounts.set(a, (assetCounts.get(a) || 0) + 1);
    });
    if (assetCounts.size >= 1 && (assetCounts.get(ac) || 0) >= Math.ceil(target * 0.6)) continue;

    if (pickFund(fund, `Retirement fill: ${RETIREMENT_SLOTS[si].label}`)) {
      slotUsage[si]++;
    }
  }

  // ── PHASE 3: Fallback categories if still below target ──
  if (result.length < target) {
    const fallbackRemaining: ScoredFund[] = [];
    for (const f of scored) {
      if (usedIds.has(f.id)) continue;
      if (RETIREMENT_FALLBACK.includes(catCode(f))) fallbackRemaining.push(f);
    }
    fallbackRemaining.sort((a, b) => b.compositeScore - a.compositeScore);

    for (const fund of fallbackRemaining) {
      if (result.length >= target) break;
      const cc = catCode(fund);
      const ac = getAC(cc, fund.name);
      const assetCounts = new Map<string, number>();
      result.forEach(f => {
        const a = getAC(catCode(f), f.name);
        assetCounts.set(a, (assetCounts.get(a) || 0) + 1);
      });
      if (assetCounts.size >= 1 && (assetCounts.get(ac) || 0) >= Math.ceil(target * 0.6)) continue;

      pickFund(fund, `Retirement fallback: ${cc}`);
      // No slot tracking needed for fallback
    }
  }

  const finalEtfCount = result.filter(f => isPassiveFund(f)).length;
  console.log(`[CIFRAA-RECO] ETF_COUNT=${finalEtfCount}`);
  console.log(`[CIFRAA-RECO] ACTIVE_COUNT=${result.length - finalEtfCount}`);

  return result;
}

// ── Generic Portfolio Constructor ──

export function constructPortfolio(
  scored: ScoredFund[],
  prefs: RecommendationPreferences,
  target: number,
  normalizedGoal: string,
): FundWithReason[] {
  const isRetirement = normalizedGoal === 'retirement';

  // Dedicated retirement model portfolio for moderate risk
  if (isRetirement && prefs.riskTolerance === 'moderate') {
    return buildRetirementPortfolio(scored, prefs, target, normalizedGoal);
  }

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
  const maxPhase1Picks = Math.min(
    csModel ? csModel.coreStrategyGroups.length + csModel.satelliteStrategyGroups.length : target,
    Math.floor(target * 0.6),
  );
  let phase1Picks = 0;

  const pickFund = (fund: ScoredFund, reason: string): boolean => {
    if (usedIds.has(fund.id)) return false;
    const normAmc = normalizeAmcName(fund.amc);
    const amcCount = usedAmcs.get(normAmc) || 0;
    if (amcCount >= 1) return false;
    if (isPassiveFund(fund) && etfCount >= MAX_ETF) return false;
    if (result.length >= target) return false;

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

  if (csModel) {
    for (const sg of csModel.satelliteStrategyGroups) {
      if (phase1Picks >= maxPhase1Picks) break;
      if (usedStrategyGroups.has(sg)) continue;
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
  const catToBucketIdx = new Map<string, number>();
  for (let i = 0; i < model.length; i++) {
    for (const cat of model[i].categories) {
      catToBucketIdx.set(cat, i);
    }
  }

  const bucketUsage = new Array<number>(model.length).fill(0);
  for (const f of result) {
    const cc = catCode(f);
    const bi = catToBucketIdx.get(cc);
    if (bi !== undefined) bucketUsage[bi]++;
  }

  const categoryBucket: Map<string, number> = new Map();
  for (const bucket of model) {
    for (const cat of bucket.categories) {
      const existing = categoryBucket.get(cat) || 0;
      categoryBucket.set(cat, Math.max(existing, bucket.maxFunds));
    }
  }

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
      const maxAllowed = categoryBucket.get(cc) || 1;
      if ((usedCategories.get(cc) || 0) >= maxAllowed) continue;

      const normAmc = normalizeAmcName(fund.amc);
      const amcCount = usedAmcs.get(normAmc) || 0;
      if (amcCount >= 1) continue;
      if (isPassiveFund(fund) && etfCount >= MAX_ETF) continue;

      if (allowedPrefixes !== null && allowedPrefixes !== undefined) {
        if (!allowedPrefixes.some(p => cc === p || cc.startsWith(p))) continue;
      }

      const assetCounts = new Map<string, number>();
      result.forEach(f => {
        const ac = getAC(catCode(f), f.name);
        assetCounts.set(ac, (assetCounts.get(ac) || 0) + 1);
      });
      const ac = getAC(cc, fund.name);
      if (assetCounts.size >= 1 && (assetCounts.get(ac) || 0) >= Math.ceil(target * 0.6)) continue;

      pickFund(fund, `Fill remaining: top-ranked ${cc}`);
    }
  }

  const finalEtfCount = result.filter(f => isPassiveFund(f)).length;
  console.log(`[CIFRAA-RECO] ETF_COUNT=${finalEtfCount}`);
  console.log(`[CIFRAA-RECO] ACTIVE_COUNT=${result.length - finalEtfCount}`);

  return result;
}
