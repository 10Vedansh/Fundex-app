# Architecture Audit Report — Recommendation Problem Diagnosis

**Repository:** Fundex-app-main  
**Date:** 2026-06-19  
**Scope:** All recommendation engines, scoring engines, portfolio constructors, and recommendation entry points  
**Rule:** No code was modified — this is a read-only audit.

---

## SECTION 1 — Recommendation Entry Points

### 1.1 `recommendFunds` (V1 — LEGACY/DEAD)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendationEngine.ts:427` |
| Exported | Yes (`export function`) |
| Called by | **None** — 0 imports across entire codebase |
| Call count | 0 |
| Status | **DEAD CODE** |

### 1.2 `recommendFundsV2` (V2 — PRODUCTION PRIMARY)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendation/intersectionEngine.ts:374` |
| Exported | Yes (`export function`) |
| Called by | `src/pages/Index.tsx`, `src/utils/portfolioComparisonEngine.ts`, `src/utils/recommendation/strategyPortfolioEngine.ts`, `src/utils/recommendation/testDifferentiation.ts`, `verifyDifferentiation.test.ts`, `validateFixes.test.ts`, `qualityAudit.test.ts` |
| Call count | **18** (highest in repo) |
| Status | **PRODUCTION — SINGLE GATEWAY** |

### 1.3 `constructPortfolio` — NEW (production recommendation)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendation/portfolioConstructor.ts:43` |
| Exported | Yes |
| Called by | `src/utils/recommendation/intersectionEngine.ts:465` |
| Call count | 1 |
| Strategy | Core-Satellite Phase 1/2/3 |
| Status | **ACTIVE — used by main engine** |

### 1.4 `constructPortfolio` — OLD (comparison engine)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendation/portfolioConstruction.ts:70` |
| Exported | Yes |
| Called by | `src/utils/portfolioComparisonEngine.ts:315` |
| Call count | 1 |
| Strategy | Equity/Debt bucket allocation |
| Status | **ACTIVE — DIFFERENT LOGIC than primary** |

### 1.5 `generateStrategyPortfolios` (Build Portfolio tab)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendation/strategyPortfolioEngine.ts:434` |
| Exported | Yes |
| Called by | `src/components/dashboard/BuildPortfolio.tsx` |
| Call count | 1 |
| Status | **ACTIVE — third portfolio path** |

### 1.6 `getAllocationModel` — categoryMappings (production)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendation/categoryMappings.ts:417` |
| Exported | Yes |
| Called by | `intersectionEngine.ts`, `portfolioConstructor.ts`, `validateFixes.test.ts` |
| Call count | 5 |
| Status | **ACTIVE — source of truth** |

### 1.7 `getAllocationModel` — recommendationEngine.ts (legacy)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendationEngine.ts:332` |
| Exported | No (private `function`) |
| Called by | `recommendFunds()` (itself dead) |
| Status | **DEAD CODE** |

### 1.8 `comparePortfolios`

| Property | Value |
|----------|-------|
| File | `src/utils/portfolioComparisonEngine.ts:278` |
| Exported | Yes |
| Called by | `PortfolioIntelligenceHero.tsx`, `PortfolioComparison.tsx` |
| Call count | 2 |
| Status | **ACTIVE — uses OLD `constructPortfolio`** |

### 1.9 `runPortfolioReview`

| Property | Value |
|----------|-------|
| File | `src/utils/portfolioReviewEngine.ts:58` |
| Exported | Yes |
| Called by | `PortfolioIntelligenceHero.tsx`, `PortfolioReview.tsx` |
| Call count | 2 |
| Status | **ACTIVE** |

### 1.10 `determineInvestorPersona`

| Property | Value |
|----------|-------|
| File | `src/utils/recommendation/personaEngine.ts:31` |
| Exported | Yes |
| Called by | `src/pages/Index.tsx` |
| Call count | 1 |
| Status | **ACTIVE — display only, no effect on scoring** |

---

## SECTION 2 — Scoring Engines

### 2.1 V3 Scoring — `scoreV3` (PRODUCTION)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendation/scoringEngineV3.ts:274` |
| Exported | Yes |
| Callers | `intersectionEngine.ts:429` |
| Reachable from UI | **YES** — via `recommendFundsV2()` → called from `pages/Index.tsx` |
| Weights (conservative) | Sortino 0.40, CAGR 0.10, Consistency 0.20, Sharpe 0.10, Vol 0.15 |
| Weights (moderate) | Sortino 0.25, CAGR 0.25, Consistency 0.15, Sharpe 0.10, Vol 0.10, Expense 0.10 |
| Weights (aggressive) | Sortino 0.15, CAGR 0.30, Consistency 0.20, Sharpe 0.15, Vol 0.05, Expense 0.05 |

### 2.2 V1 Scoring — `scoreFund` (LEGACY/DEAD)

| Property | Value |
|----------|-------|
| File | `src/utils/recommendationEngine.ts:128` |
| Exported | No (private) |
| Callers | Only `recommendFunds()` within same file |
| Reachable from UI | **NO** — dead code path |
| Status | **DEAD CODE** |

### 2.3 Supporting scoring functions (V3)

| Function | File | Line | Exported | Reachable from UI |
|----------|------|------|----------|-------------------|
| `computeCategoryMedians` | `scoringEngineV3.ts` | 33 | Yes | YES |
| `computeNormStats` | `scoringEngineV3.ts` | 161 | Yes | YES |
| `determineProfileType` | `scoringEngineV3.ts` | 217 | Yes | YES |
| `computeConfidence` | `intersectionEngine.ts` | 56 | Yes | YES |

### 2.4 Offline/batch scoring (competing formulas)

| Location | Formula | Weights |
|----------|---------|---------|
| `sql/sanitize_metric_outliers.sql` (Step 7) | Min/max normalization → weighted avg | CAGR 30%, Sharpe 25%, Sortino 25%, Vol 15%, Expense 5% |
| `supabase/functions/calculate-fund-metrics/index.ts:131-193` | Same as SQL above | Same weights |
| `scripts/calculate-fund-metrics.py` | Calculates component metrics only; sets `recommendation_score = None` | N/A |

**Finding:** Three different scoring formulas coexist: `scoreV3` (real-time, profile-adaptive weights), SQL batch (fixed equal weights), and edge function (same as SQL). These will produce different scores for the same fund.

---

## SECTION 3 — Portfolio Construction

### 3.1 Dependency Graph (main app `src/`)

```
pages/Index.tsx
├── FundCard (renders personalizedFunds)
│
├── determineInvestorPersona(personaEngine.ts:31)          [display only]
│
├── deriveRiskFromProfile(riskCapacity.ts:167)
│
├── recommendFundsV2(intersectionEngine.ts:374)            ★ PRIMARY ENGINE
│   ├── isExcluded()
│   ├── applyRiskConstraints()          → categoryMappings.ts RISK_CONSTRAINTS
│   ├── applyGoalEligibility()          → categoryMappings.ts GOAL_ELIGIBILITY
│   ├── applyHorizonRules()             → categoryMappings.ts HORIZON_RULES
│   ├── applyExperienceFilter()         → categoryMappings.ts EXPERIENCE_MODIFIERS
│   ├── applyAmountConstraints()        → categoryMappings.ts AMOUNT_CONSTRAINTS
│   ├── applyFallback()
│   │
│   ├── determineProfileType()          → scoringEngineV3.ts:217
│   ├── computeCategoryMedians()        → scoringEngineV3.ts:33
│   ├── computeNormStats()              → scoringEngineV3.ts:161
│   │
│   ├── scoreV3() [per fund]            → scoringEngineV3.ts:274
│   │   ├── PROFILE_WEIGHTS
│   │   ├── computeCreditPenalty()
│   │   └── normalize()
│   │
│   ├── computeConfidence() [per fund]  → intersectionEngine.ts:56
│   ├── generateExplanations() [per]    → explainabilityEngine.ts:21
│   │
│   └── constructPortfolio()            → portfolioConstructor.ts:43  ★ NEW CONSTRUCTOR
│       ├── getAllocationModel()         → categoryMappings.ts:417
│       ├── getProfileTypeForCoreSatellite() → strategyGroups.ts:142
│       ├── CORE_SATELLITE_MODELS        → strategyGroups.ts:119
│       ├── PHASE 1a: Core picks
│       ├── PHASE 1b: Satellite picks
│       ├── PHASE 2: Allocation bucket fill
│       └── PHASE 3: Fill remaining to 9
│
├── BuildPortfolio → generateStrategyPortfolios(strategyPortfolioEngine.ts:434)
│   ├── computeRiskCapacity()
│   ├── recommendFundsV2() [narrow]
│   ├── recommendFundsV2() [broad]
│   ├── getStrategyTemplates()
│   └── selectFundsForTemplate() [per template]
│
└── PortfolioIntelligenceHero / PortfolioComparison
    ├── comparePortfolios(portfolioComparisonEngine.ts:278)
    │   ├── computeCurrentMetrics()
    │   ├── computeRiskCapacity()
    │   ├── recommendFundsV2()
    │   ├── constructPortfolio()         → portfolioConstruction.ts:70  ★ OLD CONSTRUCTOR
    │   ├── computeRecommendedMetrics()
    │   └── computeImprovementScore()
    └── runPortfolioReview(portfolioReviewEngine.ts:58)
```

### 3.2 Critical Finding: TWO `constructPortfolio` Implementations

| Aspect | `portfolioConstructor.ts:43` (NEW) | `portfolioConstruction.ts:70` (OLD) |
|--------|-----------------------------------|-------------------------------------|
| Called by | `intersectionEngine.ts` (V3 engine) | `portfolioComparisonEngine.ts` |
| Used by | Primary recommendation flow | Portfolio comparison flow |
| Strategy | Phase 1/2/3: Core+Satellite → Bucket Fill → Fill Remaining | Equity/Debt bucket allocation with % weights |
| Model source | `CORE_SATELLITE_MODELS` (strategyGroups.ts) | `getEquityAllocation` + hardcoded buckets |
| AMC cap | **1** fund per AMC | **2** funds per AMC |
| Max from class | 60% from same asset class | Not enforced |
| `selectionReason` | Yes (per fund) | No |
| Fund limit | 9 total | Determined by bucket size |

**Impact:** The comparison engine (`comparePortfolios`) constructs a different portfolio than what was originally recommended to the user. This means the "how to improve" suggestions shown in PortfolioIntelligenceHero and PortfolioComparison are based on a different portfolio construction algorithm than the one the user actually received.

### 3.3 Third Portfolio Path: `strategyPortfolioEngine.ts`

The "Build My Portfolio" tab has its own independent portfolio construction via `generateStrategyPortfolios` → `selectFundsForTemplate()`. This does NOT use either `constructPortfolio` above. It has its own strategy templates, its own fund selection logic, and its own AMC cap (varies per template).

---

## SECTION 4 — UI Execution Path

### Exact Trace: Dashboard → Save Preferences → Recommendation Render

```
1. DashboardHeader.tsx:126    user clicks "Preferences"
                              → opens <PreferencesModal>

2. PreferencesModal.tsx:211   handleSubmit()
   2a. profileRules.ts:337       validateProfile()
   2b. useAuth.tsx:216           updateProfile()
        ├── saveQuestionnaireToLocal() → localStorage
        ├── supabase.from('profiles').update() → DB
        └── fetchProfile() → setProfile()

3. Index.tsx:64-65            profile/funds change → re-compute useMemo()
   3a. Index.tsx:189            determineInvestorPersona(profile)
                                → personaEngine.ts:31
   3b. Index.tsx:228            deriveRiskFromProfile(profile)
                                → riskCapacity.ts:167
   3c. Index.tsx:245            recommendFundsV2(funds, prefs)
                                → intersectionEngine.ts:374
       ├── eligibility filters          → categoryMappings.ts constraints
       ├── determineProfileType()       → scoringEngineV3.ts:217
       ├── computeCategoryMedians()     → scoringEngineV3.ts:33
       ├── computeNormStats()           → scoringEngineV3.ts:161
       ├── scoreV3() [per fund]         → scoringEngineV3.ts:274
       ├── computeConfidence() [per f]  → intersectionEngine.ts:56
       ├── generateExplanations() [per] → explainabilityEngine.ts:21
       └── constructPortfolio()         → portfolioConstructor.ts:43

4. Index.tsx:508              {personalizedFunds.map(fund => <FundCard />)}
                               → src/components/dashboard/FundCard.tsx:78
                                  Renders: name, category badge, CAGR,
                                  volatility, sharpe, expense, NAV, AUM,
                                  reasons[] + confidenceReason
```

### Key Files in the Trace

| Step | File | Key Functions |
|------|------|---------------|
| UI trigger | `src/components/dashboard/DashboardHeader.tsx:126` | Opens PreferencesModal |
| Save | `src/components/dashboard/PreferencesModal.tsx:211` | `handleSubmit()` |
| Profile write | `src/hooks/useAuth.tsx:216` | `updateProfile()`, `fetchProfile()` |
| Orchestration | `src/pages/Index.tsx:64-65,189,228,245` | `getPortfolioInsight()`, `deriveRiskFromProfile()`, `determineInvestorPersona()`, `recommendFundsV2()` |
| Engine | `src/utils/recommendation/intersectionEngine.ts:374` | `recommendFundsV2()`, `computeConfidence()` |
| Scoring | `src/utils/recommendation/scoringEngineV3.ts:274` | `scoreV3()`, `computeCategoryMedians()`, `computeNormStats()`, `determineProfileType()` |
| Construction | `src/utils/recommendation/portfolioConstructor.ts:43` | `constructPortfolio()` (Phase 1/2/3) |
| Mappings | `src/utils/recommendation/categoryMappings.ts` | `getAllocationModel()`, constraint tables |
| Strategy | `src/utils/recommendation/strategyGroups.ts` | `getStrategyGroup()`, `getProfileTypeForCoreSatellite()`, `CORE_SATELLITE_MODELS` |
| Explain | `src/utils/recommendation/explainabilityEngine.ts:21` | `generateExplanations()` |
| Render | `src/components/dashboard/FundCard.tsx:78` | `FundCard()` |

---

## SECTION 5 — Dead Code

### 5.1 Recommendation engines never called

| File | Function | Status |
|------|----------|--------|
| `src/utils/recommendationEngine.ts` | `recommendFunds()` | **DEAD** — 0 imports |
| `src/utils/recommendationEngine.ts` | `scoreFund()` | **DEAD** — private, only called by dead `recommendFunds` |
| `src/utils/recommendationEngine.ts` | `getAllocationModel()` | **DEAD** — private, only called by dead `recommendFunds` |
| `CIFRAA-app/src/utils/recommendationEngine.ts` | `recommendFunds()` | **DEAD** — same |

### 5.2 Scoring engines never called

| File | Function | Status |
|------|----------|--------|
| `src/utils/recommendationEngine.ts:128` | `scoreFund()` | **DEAD** — private, dead path |
| `CIFRAA-app/src/utils/recommendationEngine.ts:128` | `scoreFund()` | **DEAD** |

### 5.3 Components never rendered

| File | Component | Status |
|------|-----------|--------|
| `src/components/dashboard/RecommendationCard.tsx` | `RecommendationCard` | **DEAD** — imported/rendered nowhere |
| `CIFRAA-app/src/components/dashboard/RecommendationCard.tsx` | `RecommendationCard` | **DEAD** |

### 5.4 Utility modules never imported

| File | Exports | Status |
|------|---------|--------|
| `src/utils/recommendation/preferenceValidator.ts` | `validatePreferences()` | **DEAD** — 0 imports in `src/` |
| `src/utils/recommendation/personaAllocations.ts` | `PERSONA_ALLOCATIONS`, `AllocationConfig` | **DEAD** — 0 imports |

### 5.5 Test/utility files never imported by production code

| File | Status |
|------|--------|
| `src/utils/recommendation/testDifferentiation.ts` | **DEAD** — standalone test utility |
| `src/utils/recommendation/verifyDifferentiation.test.ts` | **DEAD** — test only |
| `src/utils/recommendation/validateFixes.test.ts` | **DEAD** — test only |
| `src/utils/recommendation/qualityAudit.test.ts` | **DEAD** — test only |

### 5.6 Traces using different logic than production

| Trace | Logic | Production Equivalent |
|-------|-------|-----------------------|
| `portfolioComparisonEngine.ts:315` → `portfolioConstruction.ts:70` | OLD `constructPortfolio` (equity/debt buckets, AMC cap 2) | NEW `portfolioConstructor.ts:43` (core-satellite, AMC cap 1) |
| `scripts/calculate-fund-metrics.py` | Sets `recommendation_score = None` | Edge function computes real score |
| `sql/sanitize_metric_outliers.sql` Step 7 | SQL-based recalculation | Duplicates edge function |
| CIFRAA-app `scoringEngineV3.ts` | Different expense formula, no age penalty | Main app has full penalties |

### 5.7 Legacy/duplicate allocation models

| Location | Model Type | Status |
|----------|-----------|--------|
| `src/utils/recommendationEngine.ts:332` | Inline `getAllocationModel()` | **DEAD** — in dead code |
| `src/utils/recommendation/categoryMappings.ts:417` | `getAllocationModel()` | **ACTIVE** — production |
| `CIFRAA-app/src/utils/recommendation/categoryMappings.ts:366` | `getAllocationModel()` | **ACTIVE** — different allocation tables |

---

## SECTION 6 — Source of Truth

### 6.1 Profile

| Aspect | Single Source of Truth | Location |
|--------|----------------------|--------|
| Profile schema | Supabase `profiles` table + localStorage | `useAuth.tsx` + `localQuestionnaire.ts` |
| Profile validation | `profileRules.ts` | `src/utils/recommendation/profileRules.ts` |
| Profile merge | `loadQuestionnaireFromLocal()` + DB fetch | `useAuth.tsx:58-101` |
| **Competing:** | `preferenceValidator.ts` | Never imported — **DEAD** |
| **Competing:** | CIFRAA-app `preferenceValidator.ts` | Only used by CIFRAA-app |

### 6.2 Risk

| Aspect | Single Source of Truth | Location |
|--------|----------------------|--------|
| Risk derivation from profile | `deriveRiskFromProfile()` | `riskCapacity.ts:167` |
| Risk capacity score | `computeRiskCapacity()` | `riskCapacity.ts:68` |
| **Competing:** | Inline mapping in `PreferencesModal.tsx:98-105` | Secondary derivation |
| **Competing:** | Inline in `Index.tsx` | Derives risk again before `recommendFundsV2` |

### 6.3 Goal

| Aspect | Single Source of Truth | Location |
|--------|----------------------|--------|
| Goal eligibility | `GOAL_ELIGIBILITY` constant | `categoryMappings.ts:160-224` |
| Goal normalization | `normalizeGoal()` | `intersectionEngine.ts:117` |
| **Competing:** | `recommendationEngine.ts` internal goal logic | Dead path |
| **Competing:** | CIFRAA-app `categoryMappings.ts` | DIFFERENT goal eligibility tables |

### 6.4 Category Mapping

| Aspect | Single Source of Truth | Location |
|--------|----------------------|--------|
| Name → code | `CATEGORY_NAME_TO_CODE` | `categoryMappings.ts:39-88` |
| Code conversion | `toCategoryCode()` | `categoryMappings.ts:90` |
| **Competing:** | CIFRAA-app LACKS `toCategoryCode()` | Assumes short codes already present |
| **Competing:** | `normalize-categories.py` Python script | Offline canonical mapping |

### 6.5 Scoring

| Aspect | Single Source of Truth | Location |
|--------|----------------------|--------|
| Real-time fund scoring | `scoreV3()` | `scoringEngineV3.ts:274` |
| Category medians | `computeCategoryMedians()` | `scoringEngineV3.ts:33` |
| Profile type | `determineProfileType()` | `scoringEngineV3.ts:217` |
| **Competing:** | `scoreFund()` in `recommendationEngine.ts:128` | Dead (V1, different weights) |
| **Competing:** | `sql/sanitize_metric_outliers.sql` Step 7 | Offline SQL — different formula |
| **Competing:** | `supabase/functions/calculate-fund-metrics/index.ts:131-193` | Edge function — different formula |
| **Competing:** | CIFRAA-app `scoringEngineV3.ts` | Different expense formula, no age penalty, different `determineProfileType` |

### 6.6 Portfolio Construction

| Aspect | Single Source of Truth | Location |
|--------|----------------------|--------|
| Primary recommendation | `portfolioConstructor.ts:43` (NEW) | Used by `recommendFundsV2` → `Index.tsx` |
| Portfolio comparison | `portfolioConstruction.ts:70` (OLD) | Used by `comparePortfolios` → comparison UI |
| Build Portfolio tab | `strategyPortfolioEngine.ts:434` | Used by `BuildPortfolio.tsx` |
| **Competing:** | CIFRAA-app `portfolioConstruction.ts` | Only constructor; no strategy groups |
| **Competing:** | CIFRAA-app `diversify()` in `intersectionEngine.ts` | Self-contained, simpler implementation |

---

## SECTION 7 — Verdict

### 7.1 Is there exactly one recommendation engine used by production UI?

**No.** There is ONE primary orchestrator (`recommendFundsV2` in `intersectionEngine.ts`) but **THREE portfolio construction paths** and **TWO `constructPortfolio` implementations**:

| Path | Constructor | Used by |
|------|------------|---------|
| Primary recommendation | `portfolioConstructor.ts:43` (NEW, core-satellite) | `intersectionEngine.ts` → `Index.tsx` |
| Portfolio comparison | `portfolioConstruction.ts:70` (OLD, equity/debt buckets) | `portfolioComparisonEngine.ts` → comparison UI |
| Build Portfolio tab | `strategyPortfolioEngine.ts:434` (self-contained) | `BuildPortfolio.tsx` |

### 7.2 Are there duplicate engines?

**Yes.**

| Duplicate | Primary | Secondary | Status |
|-----------|---------|-----------|--------|
| `recommendFunds` (V1) | `recommendFundsV2` (V3 engine) | `recommendationEngine.ts:427` | **DEAD** |
| `constructPortfolio` | `portfolioConstructor.ts` (NEW) | `portfolioConstruction.ts` (OLD) | **BOTH ACTIVE — different logic** |
| CIFRAA-app engines | Main app engines | CIFRAA-app copies | **BOTH ACTIVE — different logic** |

### 7.3 Are there duplicate scoring systems?

**Yes — three competing scoring formulas:**

1. **`scoreV3()`** (`scoringEngineV3.ts:274`) — Production UI, profile-adaptive weights (Sortino-dominant for conservative, CAGR-dominant for aggressive). Includes age penalties, completeness penalties, experience modifiers, credit penalties.
2. **SQL `sanitize_metric_outliers.sql`** — Offline batch, fixed weights (CAGR 30%, Sharpe 25%, Sortino 25%, Vol 15%, Expense 5%).
3. **Edge function `calculate-fund-metrics/index.ts`** — Same fixed weights as SQL.

### 7.4 Are there duplicate allocation models?

**Yes — three distinct model sets:**

1. **`categoryMappings.ts:417`** `getAllocationModel()` — Production, used by primary engine
2. **`recommendationEngine.ts:332`** `getAllocationModel()` — Dead code (V1)
3. **CIFRAA-app's `categoryMappings.ts:366`** `getAllocationModel()` — Different allocation tables for many goal/risk combinations

### 7.5 Are there traces using different logic than production?

**Yes.**

| Trace | What's different | Impact |
|-------|-----------------|--------|
| `portfolioComparisonEngine.ts` → `portfolioConstruction.ts:70` | Uses OLD constructor (equity/debt buckets, AMC cap 2, no core-satellite) instead of NEW one | Comparison engine shows different portfolio than user received |
| CIFRAA-app `scoringEngineV3.ts` | Different expense formula, no age penalty, different profile type logic, DT-CR suppression | Same fund → different score |
| CIFRAA-app `intersectionEngine.ts` | No `explainabilityEngine`, no `computeConfidence`, different fallback, self-contained `diversify()` instead of `portfolioConstructor` | Same inputs → different recommendations |
| CIFRAA-app `categoryMappings.ts` | Different goal eligibility tables (e.g., wealth_creation only allows equity in CIFRAA, allows debt/hybrid in main) | Same risk+goal → different eligible funds |
| SQL / edge function scoring | Fixed weights vs profile-adaptive weights | Different score for same fund |
| `scripts/calculate-fund-metrics.py` | Explicitly sets `recommendation_score = None` | Pipeline produces incomplete data |

### 7.6 What files should be deleted, merged, or archived?

#### DELETE (dead code — not imported/rendered by any production code):

| File | Reason |
|------|--------|
| `src/components/dashboard/RecommendationCard.tsx` | Never imported or rendered anywhere |
| `CIFRAA-app/src/components/dashboard/RecommendationCard.tsx` | Same |
| `src/utils/recommendation/preferenceValidator.ts` | `validatePreferences()` never imported |
| `src/utils/recommendation/personaAllocations.ts` | `PERSONA_ALLOCATIONS` never imported |
| `src/utils/recommendationEngine.ts` | Entire file dead — `recommendFunds()` not imported by anything |
| `CIFRAA-app/src/utils/recommendationEngine.ts` | Same |

#### ARCHIVE or move to `docs/scripts/`:

| File | Reason |
|------|--------|
| `scripts/calculate-fund-metrics.py` | Standalone ETL, not called by UI |
| `scripts/build-recommendation-universe.py` | Standalone ETL, not called by UI |
| `scripts/enrich-recommendation-universe.py` | Standalone ETL, not called by UI |
| `scripts/normalize-categories.py` | One-time migration |
| `src/utils/recommendation/testDifferentiation.ts` | Development/test utility |
| `src/utils/recommendation/verifyDifferentiation.test.ts` | Test only |
| `src/utils/recommendation/validateFixes.test.ts` | Test only |
| `src/utils/recommendation/qualityAudit.test.ts` | Test only |

#### MERGE/RESOLVE (competing implementations — HIGH PRIORITY):

| What | Action Required |
|------|----------------|
| `portfolioConstructor.ts` vs `portfolioConstruction.ts` | **Merge**: `portfolioComparisonEngine.ts` should use the same constructor as the main engine. Eliminate the OLD one or make them share code. This is the highest-impact issue — the comparison engine constructs a different portfolio than was recommended. |
| `categoryMappings.ts` (src) vs (CIFRAA-app) | **Synchronize**: Two diverging copies of goal/risk mapping tables will produce different recommendations from same inputs. Decide which is correct and align. |
| `scoringEngineV3.ts` (src) vs (CIFRAA-app) | **Synchronize**: Different `determineProfileType`, expense formula, experience modifiers, age/recency penalties, DT-CR suppression. |
| `intersectionEngine.ts` (src) vs (CIFRAA-app) | **Synchronize**: Latter lacks `portfolioConstructor`, `explainabilityEngine`, `computeConfidence`, has different fallback logic. |
| `sql/sanitize_metric_outliers.sql` vs edge function vs V3 | **Resolve**: Three scoring formulas exist. Decide on one canonical formula and eliminate the others. |

### Root Cause Summary

The inconsistent recommendation outputs are caused by **four systemic issues**:

1. **Two `constructPortfolio` implementations**: The comparison engine uses different portfolio construction logic than the main recommendation engine, producing mismatched comparison results.

2. **CIFRAA-app codebase divergence**: A full copy of the recommendation engine exists in `CIFRAA-app/` with different scoring formulas, allocation models, and eligibility rules — guaranteed to produce different outputs from the same inputs.

3. **Three scoring formulas**: `scoreV3` (profile-adaptive), SQL batch (fixed weights), and edge function (fixed weights) all compute scores differently.

4. **Dead code creating confusion**: The legacy `recommendationEngine.ts` (V1) and unused modules (`preferenceValidator.ts`, `personaAllocations.ts`, `RecommendationCard.tsx`) mislead developers about which code is actually running.
