# Engine Problem — Solution Plan

**Objective:** Freeze recommendation-quality work. Create ONE canonical recommendation architecture.

This document provides:
1. File-by-file migration plan (KEEP / DELETE / ARCHIVE / MERGE)
2. Portfolio construction unification plan
3. Scoring unification plan
4. CIFRAA-app audit with evidence
5. Final architecture diagram showing files that remain after cleanup

---

## 1. File Migration Plan

### 1.1 Recommendation Engine Files (`src/utils/`)

| File | Classification | Rationale |
|------|--------------|-----------|
| `src/utils/recommendationEngine.ts` | **DELETE** | Entire file is dead code. `recommendFunds()` (V1) has 0 imports. `scoreFund()` private + dead path. `getAllocationModel()` only called internally by dead `recommendFunds()`. No UI component or active utility imports anything from this file. |
| `src/utils/portfolioComparisonEngine.ts` | **MERGE** | Actively used by `PortfolioIntelligenceHero.tsx` and `PortfolioComparison.tsx` BUT calls the OLD `portfolioConstruction.ts:70` constructor. Must be refactored to use the NEW `portfolioConstructor.ts:43`. |
| `src/utils/portfolioReviewEngine.ts` | **KEEP** | Active, used by `PortfolioIntelligenceHero.tsx` and `PortfolioReview.tsx`. No overlapping logic with other engines. |

### 1.2 Recommendation Engine Files (`src/utils/recommendation/`)

| File | Classification | Rationale |
|------|--------------|-----------|
| `scoringEngineV3.ts` | **KEEP** | Single source of truth for real-time scoring. Called by `intersectionEngine.ts`. All exports reachable from UI. |
| `categoryMappings.ts` | **KEEP** | Single source of truth for constraints, allocation models, category codes. Heavily imported. |
| `intersectionEngine.ts` | **KEEP** | Single orchestrator `recommendFundsV2()` used by all production features. |
| `portfolioConstructor.ts` | **KEEP** | NEW canonical portfolio constructor (Phase 1/2/3, core-satellite). This is the one to standardise on. |
| `portfolioConstruction.ts` | **MERGE → DELETE** | OLD constructor. Currently used ONLY by `portfolioComparisonEngine.ts`. Must refactor that caller to use `portfolioConstructor.ts`, then delete this file. |
| `explainabilityEngine.ts` | **KEEP** | Active, called by `intersectionEngine.ts` in main app. Essential for user-facing explanations. |
| `strategyGroups.ts` | **KEEP** | Active, used by `portfolioConstructor.ts` for core-satellite models. |
| `strategyPortfolioEngine.ts` | **KEEP** | Active, called by `BuildPortfolio.tsx`. Separate concern — strategy templates, not overlapping with main constructor. |
| `riskCapacity.ts` | **KEEP** | Active, called by `Index.tsx`, `portfolioComparisonEngine.ts`, `strategyPortfolioEngine.ts`. All exported functions reachable from UI. |
| `personaEngine.ts` | **KEEP** | Active, called by `Index.tsx`. Determines investor persona for display. |
| `personaAllocations.ts` | **DELETE** | `PERSONA_ALLOCATIONS` and `AllocationConfig` never imported anywhere. Dead code. |
| `profileRules.ts` | **KEEP** | Active, called by `Onboarding.tsx` and `PreferencesModal.tsx`. Core validation logic. |
| `preferenceValidator.ts` | **DELETE** | `validatePreferences()` never imported anywhere in `src/`. Dead code. |
| `testDifferentiation.ts` | **ARCHIVE** | Standalone test utility, not imported by production code. Move to `docs/scripts/` or delete. |
| `verifyDifferentiation.test.ts` | **ARCHIVE** | Test file, not imported by production code. Keep only if test suite is maintained. |
| `validateFixes.test.ts` | **ARCHIVE** | Test file, not imported by production code. Same. |
| `qualityAudit.test.ts` | **ARCHIVE** | Test file, not imported by production code. Same. |

### 1.3 Components

| File | Classification | Rationale |
|------|--------------|-----------|
| `src/components/dashboard/RecommendationCard.tsx` | **DELETE** | Never imported or rendered anywhere in the codebase. 0 references. Dead component. |
| `src/components/dashboard/FundCard.tsx` | **KEEP** | Active — renders recommendations in `Index.tsx`. |
| `src/components/dashboard/BuildPortfolio.tsx` | **KEEP** | Active — "Build My Portfolio" tab. |
| `src/components/dashboard/PortfolioReview.tsx` | **KEEP** | Active — AI Portfolio Review card. |
| `src/components/dashboard/PortfolioComparison.tsx` | **KEEP** | Active — Portfolio vs CIFRAA comparison. |
| `src/components/dashboard/PortfolioIntelligenceHero.tsx` | **KEEP** | Active — Intelligence banner with health/comparison. |
| `src/components/dashboard/PreferencesModal.tsx` | **KEEP** | Active — user preference form. |

### 1.4 Hooks

| File | Classification | Rationale |
|------|--------------|-----------|
| `src/hooks/usePortfolio.tsx` | **KEEP** | Active — user portfolio CRUD. |
| `src/hooks/useAuth.tsx` | **KEEP** | Active — auth + profile state. |
| `src/hooks/useFundCache.tsx` | **KEEP** | Active — fund data fetching. |
| `src/hooks/useFundMaster.ts` | **KEEP** | Active — fund master adapter. |
| `src/hooks/useFundMetrics.ts` | **KEEP** | Active — fund metrics fetching. |

### 1.5 Utility Files (`src/utils/`)

| File | Classification | Rationale |
|------|--------------|-----------|
| `fundMasterAdapter.ts` | **KEEP** | Active — used by `useFundMaster` and `useFundCache`. |
| `holdingsGenerator.ts` | **KEEP** | Active — used by `HoldingsTable` and `HoldingAnalysisCharts`. |
| `localQuestionnaire.ts` | **KEEP** | Active — used by `useAuth.tsx`. |
| `investmentGuidance.ts` | **KEEP** | Active — used by `FundDetailModal`. |
| `sectorDataGenerator.ts` | **KEEP** | Active — used by multiple components. |
| `displayUtils.ts` | **KEEP** | Active — display helpers. |
| `isMobileApp.ts` | **KEEP** | Active — mobile detection. |
| `reportPath.ts` | **KEEP** | Active — report path utility. |
| `termDefinitions.ts` | **KEEP** | Active — glossary data. |

### 1.6 Supabase / Edge Functions / Scripts

| File | Classification | Rationale |
|------|--------------|-----------|
| `supabase/functions/calculate-fund-metrics/index.ts` | **MERGE** | Contains scoring formula (CAGR 30%, Sharpe 25%, Sortino 25%, Vol 15%, Expense 5%) that COMPETES with `scoreV3()`. Must be reconciled — either align with V3 or V3 aligns with this. See Section 3. |
| `sql/sanitize_metric_outliers.sql` (Step 7) | **MERGE** | Same competing scoring formula as edge function. Must be reconciled. |
| `scripts/calculate-fund-metrics.py` | **ARCHIVE** | Sets `recommendation_score = None`. Standalone ETL not called from UI. Move to `docs/scripts/`. |
| `scripts/build-recommendation-universe.py` | **ARCHIVE** | Standalone ETL not called from UI. Variation-selection logic not related to scoring/construction. |
| `scripts/enrich-recommendation-universe.py` | **ARCHIVE** | Standalone ETL not called from UI. Data enrichment only. |
| `scripts/normalize-categories.py` | **ARCHIVE** | One-time migration. Do not delete but archive. |
| `scripts/analyze-outliers.ts` | **ARCHIVE** | Standalone diagnostic script not called from UI. |
| `scripts/backfill-fund-metrics.py` | **ARCHIVE** | One-off data backfill. |
| `scripts/batch-fetch-mfapi.py` | **ARCHIVE** | Data pipeline script. |
| `scripts/upload-fund-metrics.py` | **ARCHIVE** | Data upload script. |

### 1.7 CIFRAA-app (Entire Directory)

| Entity | Classification | Rationale |
|--------|--------------|-----------|
| Entire `CIFRAA-app/` directory | **ARCHIVE** | See Section 4 for full evidence. Abandoned orphan copy. No node_modules, no dist, 0 cross-imports, not referenced by main app build. Safe to archive. |

---

## 2. Portfolio Construction Unification Plan

### 2.1 Current State

```
intersectionEngine.ts:465  ──►  portfolioConstructor.ts:43   ★ NEW (Core-Satellite, Phase 1/2/3)
                                    AMC cap = 1
                                    Max same-asset-class = 60%
                                    selectionReason per fund
                                    Uses strategyGroups.ts models

portfolioComparisonEngine.ts:315 ──►  portfolioConstruction.ts:70   ★ OLD (Equity/Debt buckets)
                                        AMC cap = 2
                                        No asset class limit
                                        No selectionReason
                                        Uses hardcoded buckets

strategyPortfolioEngine.ts:482  ──►  selectFundsForTemplate()       ★ THIRD PATH (template-based)
                                        AMC cap varies by template
                                        Strategy templates instead of buckets
```

### 2.2 Target State

```
ALL PATHS ──►  portfolioConstructor.ts:43   ★ SINGLE CANONICAL CONSTRUCTOR
```

### 2.3 Migration Steps

**Step 1 — Refactor `portfolioComparisonEngine.ts`**
- Change import from `./recommendation/portfolioConstruction` to `./recommendation/portfolioConstructor`
- Map `ConstructedPortfolio` types — the old `portfolioConstruction.ts` returns `{ allocations, expectedCagr, expectedVolatility, ... }`; the new `portfolioConstructor.ts` returns `FundWithReason[]`. The comparison engine expects `ConstructedPortfolio` allocations. A thin adapter or migration of `computeRecommendedMetrics()` is needed to accept `FundWithReason[]`.

**Step 2 — Update `computeRecommendedMetrics()`**
- Currently at `portfolioComparisonEngine.ts:131-182`, it consumes `ConstructedPortfolio.allocations[]`. Refactor to consume `FundWithReason[]` from the new constructor. The data required (category, expected return, expense ratio, etc.) is available on `ScoredFund` which `FundWithReason` extends.

**Step 3 — Delete `portfolioConstruction.ts`**
- Once `portfolioComparisonEngine.ts` no longer imports it, remove the file. No other file references it.

**Step 4 — Verify consistency**
- After migration, verify that `recommendFundsV2()` (main recommendation) and `comparePortfolios()` (comparison) produce portfolios using the same algorithm.

### 2.4 What Stays Separate

`strategyPortfolioEngine.ts:434` and its `selectFundsForTemplate()` serve a different purpose — generating multiple named strategy alternatives (Conservative, Balanced, Growth, Aggressive) for the "Build My Portfolio" tab. This is not a competing constructor, it's a different feature. **KEEP separate** but ensure it uses the same `scoringEngineV3.ts` scoring pipeline (which it already does via `recommendFundsV2()`).

---

## 3. Scoring Unification Plan

### 3.1 Current State — Three Competing Scoring Systems

| System | Location | Formula | Used By |
|--------|----------|---------|---------|
| **A — `scoreV3()`** | `scoringEngineV3.ts:274` | Profile-adaptive weights (Sortino-dominant for conservative, CAGR-dominant for aggressive). Includes age penalties, completeness penalties, experience modifiers, credit penalties. | **Production UI** — `recommendFundsV2()` → `Index.tsx` |
| **B — Edge Function** | `supabase/functions/calculate-fund-metrics/index.ts:131-193` | Fixed weights: CAGR 30%, Sharpe 25%, Sortino 25%, Vol 15%, Expense 5%. Min/max normalization to 0-100. | **Batch scoring** — writes `recommendation_score` to `fund_metrics` DB table |
| **C — SQL** | `sql/sanitize_metric_outliers.sql` Step 7 | Same as Edge Function (fixed weights). | **Batch scoring** — recalculates DB `recommendation_score` via SQL |

### 3.2 Recommendation

**Keep `scoreV3()` as the single canonical scoring formula for all recommendation purposes.**

**Rationale:**
1. `scoreV3()` is what the user-facing UI actually uses. Systems B and C write a `recommendation_score` to the database that is **never read by the recommendation engine** — the engine computes scores live via `computeCategoryMedians()` and `scoreV3()`.
2. `scoreV3()` is profile-adaptive: conservative investors get Sortino-weighted scoring (downside protection), aggressive investors get CAGR-weighted scoring (growth focus). Systems B and C use one-size-fits-all weights.
3. `scoreV3()` includes critical data-quality safeguards: age-based recency penalties (young funds scored lower), completeness penalties (missing metrics reduce score), credit risk awareness, experience modifiers.

### 3.3 Migration Steps

**Step 1 — Audit whether `fund_metrics.recommendation_score` is read anywhere**
- Search for all `SELECT.*recommendation_score` or `.recommendation_score` in TypeScript source. If the DB column is not consumed by any UI code, the edge function and SQL formulas are irrelevant to the user experience and can be deprecated.

**Step 2 — If DB score IS consumed:**
- If any feature reads the pre-computed `recommendation_score` from the database, that feature must be migrated to use live `scoreV3()` instead. This ensures real-time category-relative scoring that adapts to the current fund universe.

**Step 3 — Deprecate / align edge function**
- If the DB `recommendation_score` column must be kept (for analytics, export, ordering), change the edge function to call `scoreV3()` logic (reimplemented for Deno) rather than the fixed-weight formula. Alternatively, mark the column as deprecated and null it out.

**Step 4 — Update SQL migration**
- Remove or comment out Step 7 (scoring recalculation) from `sanitize_metric_outliers.sql`. The SQL should sanitise outliers but not overwrite scores with a different formula.

### 3.4 Summary

| System | Action |
|--------|--------|
| `scoringEngineV3.ts` (`scoreV3()`) | **KEEP** — single source of truth |
| Edge function scoring | **DEPRECATE or ALIGN** with V3 |
| SQL scoring (Step 7) | **REMOVE** — stop overwriting with different formula |
| `scripts/calculate-fund-metrics.py` | **ARCHIVE** — sets score to None, not used |

---

## 4. CIFRAA-app Audit

### 4.1 Evidence Summary

| Evidence | Finding |
|----------|---------|
| **Has its own `package.json`** | Yes — name "fundex", same dependencies as main app |
| **Has its own `vite.config.ts`** | Yes — `@/` resolves to `CIFRAA-app/src/`, NOT main `src/` |
| **Has its own `tsconfig.app.json`** | Yes — only includes `CIFRAA-app/src` |
| **Has its own `main.tsx`** | Yes — identical to main app |
| **Has its own `index.html`** | Yes — at `CIFRAA-app/index.html` |
| **Has `node_modules`?** | **NO** — directory does not exist. Cannot be built or developed. |
| **Has `dist/`?** | **NO** — never been built. Not deployed. |
| **Cross-imports from main app?** | **NO** — all imports use `@/` which resolves to its own `./src`. No `../` traversal into main app. |
| **Main app imports from it?** | **NO** — grep for `CIFRAA-app` in `src/` returns only brand name text, not code imports. |
| **Supabase reference** | Shares the same Supabase project (`skvvltawshbphrgnqjzf`) as main app |
| **File count** (rec utils) | 7 files vs main app's 17 — missing 10 key files |
| **Feature parity** | Missing: `portfolioConstructor.ts`, `strategyGroups.ts`, `explainabilityEngine.ts`, `personaEngine.ts`, `personaAllocations.ts`, `profileRules.ts`, `portfolioComparisonEngine.ts`, `portfolioReviewEngine.ts`, plus all tests |
| **Scoring differences** | Different expense formula, no age penalty, different `determineProfileType`, different goal eligibility tables |

### 4.2 Verdict

**CIFRAA-app/ is an abandoned orphan copy of an earlier version of the main app.** It is:
- Not deployed (no `dist/`)
- Not buildable (no `node_modules/`)
- Not importable from the main app (different `@/` alias)
- Not importing from the main app
- Stale — missing 10 of 17 recommendation files
- Divergent — different scoring, allocation, and eligibility logic

### 4.3 Recommendation

**ARCHIVE the entire `CIFRAA-app/` directory.**

Steps:
1. Move `CIFRAA-app/` to `archive/CIFRAA-app/` (or delete if confident it's not needed).
2. Nothing in the main app or deployment pipeline will break — no imports, no build references, no route dependencies.
3. The Supabase project name "CIFRAA-app" is just a label in Supabase settings; renaming is optional.
4. "CIFRAA" as a brand name in the main app's UI text (Landing.tsx, Footer.tsx, etc.) is unaffected — this is just text strings and a logo file in `src/assets/`.

---

## 5. Final Architecture Diagram

### After Cleanup — Files That Remain

```
┌──────────────────────────────────────────────────────────────────┐
│                       src/pages/Index.tsx                       │
│  (dashboard orchestrator: deriveRiskFromProfile,                 │
│   determineInvestorPersona, recommendFundsV2, FundCard render)   │
└──────┬──────────────┬────────────────┬────────────────┬──────────┘
       │              │                │                │
       ▼              ▼                ▼                ▼
┌────────────┐ ┌────────────┐ ┌──────────────┐ ┌──────────────────┐
│Preferences │ │ Persona    │ │ BuildPortfolio│ │ PortfIntelligence │
│Modal       │ │Engine      │ │ (tab UI)     │ │ Hero / Comparison │
│(profile    │ │(display    │ │              │ │ (review+compare)  │
│ save +     │ │ only)      │ │              │ │                  │
│validation) │ │            │ │              │ │                  │
└──────┬─────┘ └────────────┘ └──────┬───────┘ └────────┬─────────┘
       │                             │                  │
       ▼                             ▼                  ▼
┌──────────────────────────────────────────────────────────────────┐
│               intersectionEngine.ts  (recommendFundsV2)          │
│   ┌─────────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│   │ Eligibility │   │   scoreV3()  │   │  constructPortfolio  │  │
│   │ Filters     │──▶│  (per fund)  │──▶│ (Phase 1/2/3)       │  │
│   │ (hard       │   │              │   │                     │  │
│   │  constraints│   │ + confidence │   │ + selectionReason   │  │
│   │  + fallback)│   │ + explana-   │   │                     │  │
│   └──────┬──────┘   │   tions      │   └────────┬────────────┘  │
│          │           └──────┬───────┘            │               │
└──────────┼──────────────────┼────────────────────┼───────────────┘
           │                  │                    │
           ▼                  ▼                    ▼
┌──────────────────┐ ┌──────────────────┐ ┌────────────────────────┐
│categoryMappings  │ │ scoringEngineV3  │ │ portfolioConstructor   │
│.ts               │ │ .ts              │ │ .ts                    │
│                  │ │                  │ │                        │
│● RISK_           │ │● CategoriesMedians│ │● getAllocationModel()  │
│  CONSTRAINTS     │ │● NormStats       │ │● getProfileTypeFor-   │
│● GOAL_           │ │● scoreV3()       │ │  CoreSatellite()      │
│  ELIGIBILITY     │ │● determineProfile│ │● CORE_SATELLITE_      │
│● HORIZON_RULES   │ │  Type()          │ │  MODELS               │
│● EXPERIENCE_     │ │● computeCredit-  │ │● Phase 1a (core)      │
│  MODIFIERS       │ │  Penalty()       │ │● Phase 1b (satellite) │
│● AMOUNT_         │ │● EXPENSE_        │ │● Phase 2 (buckets)    │
│  CONSTRAINTS     │ │  WEIGHTS (3x)    │ │● Phase 3 (fill)       │
│● getAllocation-  │ └──────────────────┘ │● AMC cap = 1          │
│  Model()         │                     │● Max 60% same class    │
│● toCategoryCode()│                     └────────────────────────┘
│● normalizeAmc-   │
│  Name()          │    ┌──────────────────┐
└──────────────────┘    │ riskCapacity.ts  │    ┌──────────────────┐
                         │                  │    │ strategyGroups   │
┌──────────────────┐    │● computeRisk-    │    │ .ts              │
│ explainability-  │    │  Capacity()      │    │                  │
│ Engine.ts        │    │● deriveRiskFrom- │    │● StrategyGroup   │
│                  │    │  Profile()       │    │  type            │
│● generate-       │    │● getEquityAlloc  │    │● CATEGORY_TO_    │
│  Explanations()  │    │  ation()         │    │  STRATEGY_GROUP  │
│ (13 bullet types)│    └──────────────────┘    │● CORE_SATELLITE_ │
└──────────────────┘                            │  MODELS          │
                                                │● getStrategyGroup│
┌──────────────────┐    ┌──────────────────┐    │● getProfileType- │
│ profileRules.ts  │    │ strategyPortfolio│    │  ForCoreSatellite│
│                  │    │ Engine.ts        │    └──────────────────┘
│● validateProfile │    │                  │
│● getRawField-    │    │● generate-       │    ┌──────────────────┐
│  Availability()  │    │  StrategyPort-   │    │ FundCard.tsx     │
│● getAvailable-   │    │  folios()        │    │                  │
│  Options()       │    │● getStrategy-    │    │● category badge  │
│● getRawValue-    │    │  Templates()     │    │● CAGR, volatility│
│  Overrides()     │    │● selectFunds-    │    │● sharpe, expense │
│● getEngineField  │    │  ForTemplate()   │    │● reasons[]       │
│  ForSourceField()│    └──────────────────┘    │● confidence      │
└──────────────────┘                            └──────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         DATABASE LAYER                           │
│                                                                  │
│  fund_master              fund_metrics           recommendation_ │
│  ┌─────────────┐         ┌──────────────┐        universe        │
│  │ scheme_name  │         │ cagr_1y/3y/5y│        ┌──────────┐   │
│  │ category     │         │ sharpe_ratio │        │expense   │   │
│  │ amc          │         │ sortino      │        │_ratio    │   │
│  │ aum          │         │ volatility   │        │aum       │   │
│  │ launch_date  │         │ std_dev      │        │fund_     │   │
│  │ nav          │         │ consistency  │        │manager   │   │
│  └─────────────┘         │ max_drawdown │        └──────────┘   │
│                           │ confidence   │                       │
│ fund_master_enriched      │ (score V3    │    EDGE FUNCTIONS     │
│  (VIEW joining all above)  │  NOT stored) │    ┌──────────────┐  │
│                           └──────────────┘    │calculate-fund│  │
│                                                │-metrics      │  │
│                                                │(V3-aligned   │  │
│                                                │ scoring)     │  │
│                                                └──────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

### Summary of What Gets Removed

```
DELETE (7 files):
  src/utils/recommendationEngine.ts
  src/utils/recommendation/portfolioConstruction.ts        (after MERGE)
  src/utils/recommendation/personaAllocations.ts
  src/utils/recommendation/preferenceValidator.ts
  src/components/dashboard/RecommendationCard.tsx
  CIFRAA-app/src/components/dashboard/RecommendationCard.tsx  (with CIFRAA-app/)

ARCHIVE (entire directories + scripts):
  CIFRAA-app/                                              (entire directory)
  src/utils/recommendation/testDifferentiation.ts
  src/utils/recommendation/verifyDifferentiation.test.ts
  src/utils/recommendation/validateFixes.test.ts
  src/utils/recommendation/qualityAudit.test.ts
  scripts/calculate-fund-metrics.py
  scripts/build-recommendation-universe.py
  scripts/enrich-recommendation-universe.py
  scripts/normalize-categories.py
  scripts/analyze-outliers.ts
  scripts/backfill-fund-metrics.py
  scripts/batch-fetch-mfapi.py
  scripts/upload-fund-metrics.py

MERGE (1 file + 2 non-source files):
  src/utils/portfolioComparisonEngine.ts                   (refactor to use NEW constructor)
  supabase/functions/calculate-fund-metrics/index.ts        (align scoring with V3 or deprecate)
  sql/sanitize_metric_outliers.sql (Step 7)                  (remove competing scoring formula)

KEEP (all other files — unchanged):
  16 files in src/utils/recommendation/ (after removals)
  4 hooks in src/hooks/
  6 active dashboard components
  All remaining utility files
  All database schema / migrations
```

### New module dependency graph (after cleanup):

```
Index.tsx
├── useAuth (profile)
├── useFundCache (fund data)
├── personaEngine (display)
├── riskCapacity (deriveRiskFromProfile)
└── intersectionEngine.recommendFundsV2
    ├── categoryMappings (constraints)
    ├── scoringEngineV3.scoreV3
    │   └── categoryMappings (toCategoryCode)
    ├── intersectionEngine.computeConfidence
    ├── explainabilityEngine.generateExplanations
    └── portfolioConstructor.constructPortfolio
        ├── categoryMappings.getAllocationModel
        ├── strategyGroups.getProfileTypeForCoreSatellite
        └── strategyGroups.CORE_SATELLITE_MODELS

portfolioComparisonEngine.comparePortfolios
├── riskCapacity.computeRiskCapacity
├── intersectionEngine.recommendFundsV2              (same entry point)
└── portfolioConstructor.constructPortfolio           ★ NOW SAME CONSTRUCTOR

strategyPortfolioEngine.generateStrategyPortfolios
├── riskCapacity.computeRiskCapacity
└── intersectionEngine.recommendFundsV2              (same entry point)
```

**Key architectural guarantees after cleanup:**
1. **One scorer** — `scoreV3()` is the only scoring function used for recommendations
2. **One constructor** — `portfolioConstructor.ts:43` is the only portfolio construction used by all features
3. **One orchestrator** — `recommendFundsV2()` in `intersectionEngine.ts` is the only recommendation entry point
4. **One category mapping** — `categoryMappings.ts` is the only source of truth for constraints and allocation models
5. **No dead code** — all DELETEd files have 0 callers
6. **No divergence** — `CIFRAA-app/` archived eliminates the parallel implementation
7. **No competing formulas** — edge function and SQL aligned with V3 or deprecated

---

## Summary of All Actions

| Action | Count |
|--------|-------|
| DELETE | 7 files |
| ARCHIVE | 1 directory + 11 script/test files |
| MERGE | 1 source file + 2 non-source files |
| KEEP | All other files |
| FTE estimate for migration | 2-3 days (portfolio comparison refactor + scoring alignment + cleanup) |
