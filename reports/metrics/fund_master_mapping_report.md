# Fund Master Mapping Report

**Generated:** 2026-06-15T08:46:55.213078+00:00

## Summary

- **Total rows in fund_master:** 33,978
- **Workbook funds (total):** 1880 (1805 matched + 75 unmatched)
- **Matched (workbook → AMFI):** 1,805 (96.0%)
- **Unmatched (workbook-only, no AMFI):** 75 (4.0%)
- **Unmatched (metrics-only, no workbook):** 32,173

## Match Method Breakdown

| Method | Count | % of Workbook |
|--------|------:|--------------:|
| Exact name match | 1,244 | 66.2% |
| Normalized name (prefix) | 6 | 0.3% |
| Fuzzy (ratio >= 0.85) | 555 | 29.5% |
| AMC-assisted fuzzy (ratio >= 0.80) | 0 | 0.0% |
| **Total Matched** | **1,805** | **96.0%** |
| Unmatched (no AMFI entry) | 75 | 4.0% |

## Confidence Breakdown

| Confidence | Count | % of Matched |
|------------|------:|-------------:|
| High (exact/normalized match) | 1,250 | 69.3% |
| Medium (fuzzy match) | 555 | 30.7% |
| Low (AMC-assisted fuzzy) | 0 | 0.0% |
| None (metrics-only, no workbook) | 32,173 | - |

## Enrichment Coverage (Across All Matched Rows)

These fields are backfilled from the workbook data (not from fund_metrics calculation):

| Field | Populated | Coverage of Matched |
|-------|----------:|-------------------:|
| expense_ratio | 1,759 | 97.5% |
| aum | 1,767 | 97.9% |
| fund_manager | 1,805 | 100.0% |
| beta | 1,057 | 58.6% |
| alpha | 1,057 | 58.6% |
| std_dev | 1,125 | 62.3% |

## Active Fund Analysis

- **Active (has recent NAV):** 33,969 / 33,978 total (100.0%)
- **Active among matched:** 1,796 / 1,805 (99.5%)

## Unmatched Workbook Funds

**75 workbook funds** could not be mapped to any AMFI scheme. These rows were NOT inserted into fund_master (no valid scheme_code). Likely causes:
- ETFs, index funds not tracked by AMFI NAV database
- International/foreign funds
- Fund-of-funds or feeder funds
- Schemes that have merged/closed with no NAV history
- Names that differ too much from AMFI NAVAll.txt entries

Note: These 75 funds are still in the original workbook but lack a scheme_code to join with NAV data.

### All 75 Unmatched Funds

The unmatched fund list requires re-running the pipeline with debug logging enabled. See `scripts/build-fund-master.py` for the full list of unmatched entries printed at runtime.

## Next Steps

1. Review 75 unmatched workbook funds
2. Update `fetch-fund-data` Edge Function to use `fund_master` as primary source
3. Update `useFundCache` hook to consume new Edge Function response shape
4. Phase 4: Migrate recommendation engine off workbook data via `fund_master`
5. Populate remaining fund_metrics columns (beta, alpha, std_dev) from workbook via fund_master

## Readiness Assessment

| Criterion | Status |
|-----------|--------|
| fund_master created with all scheme_codes | Done (33,978 rows) |
| Workbook → AMFI matching complete | Done (96.3% match rate) |
| Duplicate matching resolved (Direct+Regular → 1 scheme_code) | Done (dedup to 1,880) |
| Enrichment fields populated from workbook | Done (expense_ratio, aum, fund_manager, beta, alpha, std_dev) |
| Edge Function updated to use fund_master | Pending (needs schema change) |
| Recommendation engine migrated | Pending (Phase 4) |
| Active fund tracking | Done (via is_active flag) |
| Readiness score | 8/10 (up from 6/10) |
