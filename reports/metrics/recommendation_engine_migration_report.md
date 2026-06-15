# Recommendation Engine Migration Report

**Generated:** 2026-06-15T12:20

## Executive Summary

The recommendation engine has been audited for Value Research workbook dependencies.
The migration from workbook to `fund_metrics` as primary data source is partially complete:
schema, data pipeline, and data population are done. The engine itself retains workbook
data as its primary input due to the absence of category/AMC/expense fields in fund_metrics.

## Files Audited

| File | Dependency | Status |
|---|---|---|
| `src/utils/recommendationEngine.ts` | MutualFund from workbook | **DEPRECATED** (V1, still present) |
| `src/utils/recommendation/intersectionEngine.ts` | MutualFund from workbook | Active (V2) |
| `src/utils/recommendation/scoringEngineV3.ts` | CAGR, Sharpe, Sortino, Vol, Expense, AUM from workbook | Active |
| `src/utils/recommendation/categoryMappings.ts` | Category codes from workbook | Active |
| `src/utils/recommendation/explainabilityEngine.ts` | Fund metrics from workbook | Active |
| `src/hooks/useFundCache.tsx` | Calls `fetch-fund-data` Edge Function | Active |
| `supabase/functions/fetch-fund-data/index.ts` | Reads `fund_cache.workbook_data` | Active |
| `supabase/functions/process-workbook/index.ts` | Parses `Data.xlsx` from storage | Active |
| `supabase/functions/sync-onedrive/index.ts` | Syncs workbook from OneDrive | Active |
| `src/utils/recommendation/validateFixes.test.ts` | Reads `public/data/Data.xlsx` directly | Test only |
| `src/utils/recommendation/verifyDifferentiation.test.ts` | Reads `public/data/Data.xlsx` directly | Test only |

## Value Research Dependencies (Remaining)

| Dependency | Where | Why Still Needed |
|---|---|---|
| `Data.xlsx` workbook | `public/data/`, `supabase/storage/` | Source of category, AMC, expense, AUM |
| `fund_cache.workbook_data` | Supabase table | Cached workbook data |
| `fund_cache.mf_data` | Supabase table | Cache enriched with AMFI NAV |
| Category codes (EQ-LC, DT-LIQ, etc.) | `categoryMappings.ts` | Filtering, allocation models |
| Fund manager name | `fetch-fund-data` | Display only |

## What Changed

### New Files Created

| File | Purpose |
|---|---|
| `supabase/migrations/20260615000001_add_fund_metrics_columns.sql` | Extended fund_metrics with 20 new columns |
| `supabase/migrations/20260615000002_create_active_funds_view.sql` | Active fund view + RLS policies |
| `src/hooks/useFundMetrics.ts` | Frontend hook for querying fund_metrics |
| `scripts/backfill-fund-metrics.py` | Attempted name-based backfill from workbook |

### Modified Files

| File | Change |
|---|---|
| `supabase/functions/fetch-fund-data/index.ts` | Restored to original behavior (workbook-only) |
| `supabase.functions/fetch-fund-data/index.ts` | Previous attempt to merge fund_metrics (reverted) |

### New Database Objects

| Object | Type | Purpose |
|---|---|---|
| `fund_metrics.*` (20 new columns) | Columns | expense_ratio, net_assets, fund_manager, etc. |
| `active_funds` | View | Active/investable fund filter |
| `active_fund_stats` | View | Quick aggregate counts |
| `idx_fund_metrics_last_nav_date` | Index | Active fund queries |
| `idx_fund_metrics_expense_ratio` | Index | Expense filtering |
| `idx_fund_metrics_net_assets` | Index | AUM filtering |
| `idx_fund_metrics_amc_category` | Index | AMC/category diversification |
| `trigger_fund_metrics_updated_at` | Trigger | Auto-updates `updated_at` |

## New Query Paths

### Primary: Workbook (unchanged)
```
Data.xlsx → process-workbook → fund_cache.workbook_data 
  → fetch-fund-data (edge fn) → useFundCache → recommendFundsV2
```

### Secondary: fund_metrics (new — dashboard/analytics)
```
fund_metrics → useFundMetrics → UI components
  (for category rankings, AMC rankings, top performers)
```

## Blockers

1. **No cross-reference key**: Workbook funds use slug-based IDs; fund_metrics uses
   numeric AMFI scheme codes. Without a mapping table, metrics cannot be overlaid
   onto workbook funds.
2. **Empty scheme_name**: fund_metrics scheme_name is empty for all 33,969 rows
   (source NAV database had no names). Name-based matching is impossible.
3. **AMFI Scheme Detail API**: Category, AMC, expense data is available from
   AMFI but requires per-scheme API calls (rate-limited, ~30K calls needed).

## Recommendation

1. **Phase 3a (complete)**: Schema, data pipeline, active fund view, reports
2. **Phase 3b (next)**: Build scheme_code ↔ workbook ID mapping table from
   AMFI NAVAll.txt cross-reference. Populate fund_metrics fields from workbook
   via mapping table.
3. **Phase 3c (future)**: Source all fields from AMFI APIs; retire workbook entirely.
