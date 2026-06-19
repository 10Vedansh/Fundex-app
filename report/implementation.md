# Implementation Report — Recommendation Engine Fixes

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/utils/recommendation/riskCapacity.ts` | Added `primary_goal` param to `deriveRiskFromProfile()`, goal-based risk capping | +22 |
| `src/utils/recommendation/strategyGroups.ts` | Reordered `getProfileTypeForCoreSatellite()` — goal checked before risk | -1/+1 |
| `src/utils/recommendation/categoryMappings.ts` | `capital_preservation.lockInFlag` → `true` | 1 char |
| `src/pages/Index.tsx` | Pass `primary_goal: effectiveGoal` to `deriveRiskFromProfile()` | +1 |
| `src/utils/recommendation/regression.test.ts` | NEW — 36 tests across 7 test suites | +412 |

**Total: 5 files changed, 1 new file, 437 lines added, 2 lines removed.**

**No other functional changes.** Scoring, eligibility, portfolio construction phases, AMC caps, and all other logic are untouched.

---

## Fix 1 — Risk Derivation (riskCapacity.ts)

### Before

```typescript
export function deriveRiskFromProfile(profile: {
  market_reaction?: string | null;
  investor_stage?: string | null;
  // ...no primary_goal
}): { riskTolerance: string; score: number; reasons: string[] } {
  // ...weighted score → riskTolerance (conservative/moderate/aggressive)
  return { riskTolerance, score: finalScore, reasons };
}
```

The function computed a purely financial-capacity score. A mid-career professional with stable income, emergency savings, and long horizon would score **aggressive** even if their stated goal was retirement.

### After

```typescript
export function deriveRiskFromProfile(profile: {
  // ...existing fields
  primary_goal?: string | null;    // NEW
}): { riskTolerance: string; score: number; reasons: string[] } {
  // ...same weighted score computation

  // Goal-based risk cap applied AFTER raw score computation:
  const goal = profile.primary_goal || '';
  if (goal === 'retirement' && (riskTolerance === 'aggressive')) {
    riskTolerance = 'moderate';
    reasons.push('Risk capped at moderate: retirement goal prioritizes stability over growth');
  }
  if (goal === 'capital_preservation' && (riskTolerance === 'aggressive' || riskTolerance === 'moderate')) {
    riskTolerance = 'conservative';
    reasons.push('Risk capped at conservative: capital preservation goal protects principal');
  }

  return { riskTolerance, score: finalScore, reasons };
}
```

### Behavior

| Raw Score → Risk | Goal | Final Risk | Rationale |
|---|---|---|---|
| aggressive | retirement | **moderate** | Capped at moderate |
| moderate | retirement | moderate | No cap needed |
| conservative | retirement | conservative | No cap needed |
| aggressive | capital_preservation | **conservative** | Capped at conservative |
| moderate | capital_preservation | **conservative** | Capped at conservative |
| conservative | capital_preservation | conservative | No cap needed |
| any | wealth_creation | unchanged | No cap |
| any | tax_saving | unchanged | No cap |

The raw `score` field (1-5) is **not modified** — only `riskTolerance` is capped. This preserves the numerical score for analytics while ensuring the risk label passed to the recommendation engine respects the goal.

---

## Fix 2 — Core-Satellite Profile Selection (strategyGroups.ts)

### Before

```typescript
export function getProfileTypeForCoreSatellite(risk: string, goal: string): string {
  if (risk === 'aggressive') return 'aggressive';   // risk checked FIRST
  if (goal === 'retirement') return 'retirement';
  // ...
}
```

An aggressive-risk user with a retirement goal got the `aggressive` core-satellite model (large_cap + flexi + mid cap cores; small cap, value, thematic, quant satellites). No debt or conservative hybrid in Phase 1 picks.

### After

```typescript
export function getProfileTypeForCoreSatellite(risk: string, goal: string): string {
  if (goal === 'retirement') return 'retirement';          // goal checked FIRST
  if (goal === 'capital_preservation') return 'preservation';
  if (risk === 'aggressive') return 'aggressive';
  // ...
}
```

### Core-satellite models selected by profile

| Profile | Core Strategy Groups | Satellite Strategy Groups |
|---------|---------------------|--------------------------|
| **retirement** | large_cap_index, flexi_multi_cap, conservative_hybrid, balanced_hybrid, short_debt, corp_debt | arbitrage, equity_savings, multi_asset, mid_cap, value |
| **aggressive** | large_cap_index, flexi_multi_cap, mid_cap | small_cap, value, thematic_sectoral, quant, other |
| **preservation** | ultra_short_debt, liquid, money_market, short_debt, corp_debt, floater, gilt, medium_debt, dynamic_debt, long_debt | arbitrage, conservative_hybrid |

**Key change:** A retirement-goal user with aggressive financial capacity now gets the `retirement` core-satellite model — Phase 1 picks include conservative hybrid, balanced hybrid, short debt, and corporate bond alongside large cap and flexi cap funds. Small cap, thematic sectoral, and quant are removed from Phase 1.

---

## Fix 3 — Capital Preservation Fallback Protection (categoryMappings.ts)

### Before

```typescript
capital_preservation: {
  // ...
  lockInFlag: false,    // fallback COULD drop goal constraints
}
```

When `lockInFlag` is `false`, the fallback chain eventually progresses to "Risk-only" and "Risk+Horizon" steps that drop goal eligibility entirely. For capital_preservation, this means a user could get equity funds if insufficient debt funds pass the filters.

### After

```typescript
capital_preservation: {
  // ...
  lockInFlag: true,     // fallback NEVER drops goal constraints
}
```

With `lockInFlag: true`, the fallback chain for capital_preservation becomes:

```
1. Risk+Goal+Horizon       (all constraints)
2. Goal+Horizon            (relaxed risk)
3. Risk+Goal               (relaxed horizon)
4. Goal-only               (relaxed risk+horizon)
```

Every step keeps goal eligibility in place. If none of these steps produce ≥5 funds, the last resort still applies goal blocked categories:

```typescript
const lastResort = applyRiskConstraints(cleanFunds, risk);
const goalFiltered = goalConfig
  ? lastResort.filter(f => {
      const cat = catCode(f);
      if (goalConfig.blockedCategories.includes(cat)) return false;
      return true;
    })
  : lastResort;
```

**Capital preservation users will NEVER see equity categories in their recommendations**, even under fallback.

---

## Fix 4 — Call Site Updated (Index.tsx)

### Before

```typescript
const riskResult = deriveRiskFromProfile({
  market_reaction: profile.market_reaction,
  investor_stage: profile.investor_stage,
  // ...
  // primary_goal NOT passed
});
```

### After

```typescript
const riskResult = deriveRiskFromProfile({
  market_reaction: profile.market_reaction,
  investor_stage: profile.investor_stage,
  // ...
  primary_goal: effectiveGoal,    // NEW
});
```

`effectiveGoal` is computed immediately above the call from `profile.primary_goal` or mapped from `profile.investment_goal`. This is the same goal value passed to `recommendFundsV2()` on the next line.

---

## Test Results

### New Regression Tests (36 tests, all pass)

| Suite | Tests | What's Verified |
|-------|-------|-----------------|
| **Risk Derivation** | 7 | Retirement caps aggressive→moderate; preservation caps→conservative; wealth/tax unchanged; downward-only enforcement |
| **Core-Satellite Profile** | 6 | Goal wins before risk for retirement/preservation; wealth+aggressive returns aggressive; wealth+moderate returns retirement |
| **Capital Preservation Lock** | 5 | `lockInFlag=true` confirmed; no EQ- prefixes allowed; tax_saving still locked; others still unlocked |
| **Retirement Portfolio** | 7 | Contains HY-DAA, HY-CH, DT-*; AMC cap ≤1; ETF cap ≤3; no sectorals |
| **Preservation Portfolio** | 4 | No EQ-* categories; no plain Equity/Index; contains DT-*; AMC cap ≤1 |
| **Aggressive Wealth Portfolio** | 4 | ≥6 of 9 equity; contains growth categories (SC/MC/FLX); AMC cap ≤1; 7-9 funds |
| **Allocation Models** | 4 | Aggressive+retirement → mixed equity/hybrid/debt; cons+preservation → debt only; agg+wealth → equity only; mod+retirement → includes HY-DAA/HY-CH/DT-* |

### Existing Tests (8 tests, all pass — no regressions)

| Suite | Tests | Status |
|-------|-------|--------|
| `qualityAudit.test.ts` | 1 | Pass — 10 profiles audited, no quality flags |
| `verifyDifferentiation.test.ts` | 7 | Pass — conservative 0% equity, aggressive 100% equity, differentiation confirmed |

### Key Observations from Existing Audit

The existing quality audit confirms the fix is working:

- **Beginner Conservative**: 0% equity, 100% debt — unchanged
- **Wealth Creator vs Retirement Planner overlap**: 11.1% — still low
- **Retirement Planner SC/MC funds**: 0 — goal eligibility properly blocks small/mid cap
- **Aggressive equity count**: 9/9 — unchanged for non-capped profiles

---

## No Other Behavior Changes

The following systems were **not modified** and produce identical output:

| Component | Status |
|-----------|--------|
| `scoringEngineV3.ts` — `scoreV3()`, weights, penalties | Unchanged |
| `intersectionEngine.ts` — `recommendFundsV2()`, eligibility, fallback | Unchanged (beyond lockInFlag) |
| `portfolioConstructor.ts` — Phase 1/2/3 | Unchanged |
| `categoryMappings.ts` — all constraint tables, allocation models | Unchanged (except 1 char) |
| `strategyGroups.ts` — `CATEGORY_TO_STRATEGY_GROUP`, `CORE_SATELLITE_MODELS` | Unchanged |
| `explainabilityEngine.ts` — explanation generation | Unchanged |
| `riskCapacity.ts` — `computeRiskCapacity()` | Unchanged |
| AMC cap, ETF cap, asset class cap, goal prefix checks | Unchanged |

---

## Summary of Impact

| Scenario | Before Fix | After Fix | Impact |
|----------|-----------|-----------|--------|
| Retirement + aggressive risk | aggressive core-satellite model | retirement core-satellite model | Phase 1 includes conservative hybrid, balanced advantage, debt |
| Retirement + aggressive risk | risk label: aggressive | risk label: moderate (capped) | Scoring switches from aggressive to moderate weights |
| Capital preservation + moderate risk | risk label: moderate | risk label: conservative (capped) | Scoring switches to conservative weights |
| Capital preservation + insufficient funds | Fallback could return equity | Fallback keeps goal locked | Preservation users never see equity |
| Wealth creation + aggressive risk | No change | No change | Unaffected |
| Tax saving + aggressive risk | No change | No change | Unaffected |
| All other profiles | No change | No change | Unaffected |
