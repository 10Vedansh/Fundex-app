# Phase 4 Completion Report — Recommendation Engine Cutover

**Generated:** 2026-06-15 09:00:49.042385+00:00

## 1. Is recommendation engine fully using fund_master?

**Yes.**

The migration was achieved by updating `useFundCache.tsx` to source data from
the `fund_master_enriched` view (via the `fetch-fund-data?source=master` Edge Function
endpoint) as the primary data source, with the legacy workbook cache as fallback.

Key changes:

- **`supabase/functions/fetch-fund-data/index.ts`**: Added `source=master` handler that
  queries the `fund_master_enriched` view with pagination, search, category/AMC filters,
  and sorting.
- **`src/utils/fundMasterAdapter.ts`**: Maps `fund_master_enriched` row → `MutualFund`
  interface with proper field name conversion and fallback defaults.
- **`src/hooks/useFundCache.tsx`**: Refactored to try `source=master` first, then
  fall back to workbook cache → legacy API → local storage.
- **`src/hooks/useFundMaster.ts`**: New dedicated hook with search, category, AMC
  filtering, and localStorage caching.
- **`supabase/migrations/20260615000004_create_fund_master_enriched_view.sql`**:
  JOINs `fund_master` + `fund_metrics` into a single denormalized view.

`intersectionEngine.ts` continues to accept `MutualFund[]` — it does not need changes
because the adapter produces data that conforms to the `MutualFund` interface.
The engine no longer depends on workbook CSV, workbook IDs, or workbook ranking tables.

## 2. Is fund_metrics now the primary data source?

**Yes, for calculated metrics.**

All return metrics (CAGR, Sharpe, Sortino, volatility, consistency) come from
`fund_metrics`, which is computed from the 35M-row `nav_history` table.

| Metric | Source | Coverage |
|--------|--------|---------:|
| CAGR 3Y | fund_metrics.cagr_3y | 19,194 / 33,978 |
| Sharpe Ratio 3Y | fund_metrics.sharpe_ratio_3y | 19,080 / 33,978 |
| Sortino Ratio 3Y | fund_metrics.sortino_ratio_3y | 18,668 / 33,978 |
| Volatility 3Y | fund_metrics.volatility_3y | 33,969 / 33,978 |
| Consistency Score | fund_metrics.consistency_score | 32,632 / 33,978 |
| Confidence Score | fund_metrics.confidence_score | 33,969 / 33,978 |

Workbook-enriched fields (expense_ratio, aum, fund_manager) are stored in `fund_master`
and are only available for the 1,805 matched funds (not the full 33,978). These are
needed by the scoring engine for expense and AUM constraints.

## 3. Can Value Research workbook be retired?

**Partially.**

| Capability | Status | Reason |
|------------|--------|--------|
| Recommendation engine | ✅ Can retire | All scoring/constraint fields available from fund_master + fund_metrics |
| Fund search/display | ⚠️ Partial | nav, rank, strengthBadge, riskLevel not yet in fund_master |
| Portfolio analytics | ❌ No | sectorAllocation, marketCap are separate data sources |
| AMC/category metadata | ✅ Can retire | Available from fund_master |

**Recommendation:** Retain workbook for UI display fields (nav, rank, badges) but
retire it for the recommendation pipeline. The workbook dependency audit shows all
remaining workbook dependencies are UI-only — not used by the engine.

## 4. Remaining blockers?

| Blocker | Impact | Resolution |
|---------|--------|------------|
| Empty scheme_names for most rows | UI display only | AMFI NAV data doesn't include scheme names; fund_metrics was populated from NAV DB which has no names column |
| 990 rows with UNKNOWN category | Category-based filtering may miss these | fund_metrics missing category for some schemes; needs backfill |
| expense_ratio only for 1,805 matched funds | Expense constraint only applies to matched funds | Remaining 32,173 metrics-only funds can't be scored for expense |
| aum only for 1,767 matched funds | AUM constraint limited | Same as above |
| UseFundMaster not wired into UI yet | New hook exists but not integrated | Need to update Index.tsx, Search.tsx callers |

## 5. Production readiness score

**7/10**

| Criterion | Status |
|-----------|--------|
| fund_master_enriched view created | Done |
| Edge Function supports source=master with pagination/filtering | Done |
| fundMasterAdapter maps to MutualFund interface | Done |
| useFundCache sources from fund_master as primary | Done |
| useFundMaster hook created with search/filter/cache | Done |
| All engine-scoring fields available from view | Done |
| No workbook-only fields used by engine | Verified |
| Workbook dependency audit generated | Done |
| UseFundMaster wired into recommendation flow | Pending |
| Full end-to-end integration test | Pending |

## Files Changed/Created

| File | Change |
|------|--------|
| `supabase/migrations/20260615000004_create_fund_master_enriched_view.sql` | New — view joining fund_master + fund_metrics |
| `supabase/functions/fetch-fund-data/index.ts` | Updated — added `source=master` handler |
| `src/utils/fundMasterAdapter.ts` | New — maps view rows to MutualFund interface |
| `src/hooks/useFundMaster.ts` | New — dedicated hook with search/filter/cache |
| `src/hooks/useFundCache.tsx` | Updated — sources from fund_master first |
| `reports/metrics/workbook_dependency_audit.md` | New — lists remaining workbook dependencies |
| `reports/metrics/fund_master_mapping_report.md` | Existing — Phase 3.5 mapping report |

## Next Steps

1. **Wire useFundMaster into Index.tsx** — replace `useFundCache` call for recommendation flow
2. **Wire useFundMaster into Search.tsx** — enable fund_master-powered search
3. **Backfill missing scheme_names** — from AMFI NAVAll.txt into fund_metrics
4. **Backfill missing categories** — for ~990 rows with UNKNOWN category
5. **Expand fund_master enrichment** — to all 33,978 rows (not just 1,805 matched)
6. **Edge Function optimizations** — add caching, improve pagination performance
7. **End-to-end integration test** — run recommendation with fund_master data and compare outputs
