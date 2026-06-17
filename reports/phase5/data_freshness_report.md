# Data Freshness Report

**Generated:** 2026-06-15
**Scope:** `nav_history`, `fund_metrics`, `recommendation_universe`

## 1. Latest Data Points

| Data Store | Field | Latest Value |
|------------|-------|-------------|
| `nav_history` | Latest `nav_date` | 2026-06-14 |
| `nav_history` | Latest `created_at` | 2026-06-14 (689 rows ingested) |
| `fund_metrics` | Latest `last_calculated` | 2026-06-15T11:41:08+00:00 |
| `fund_metrics` | Latest `last_nav_date` | 2026-06-14 |
| `fund_metrics` | Earliest `last_nav_date` | 2006-06-16 |
| `fund_master` | Last built | ~2026-06-15 |
| `recommendation_universe` | Last built | ~2026-06-15 |

## 2. NAV Freshness in fund_metrics

| Bucket | Funds | % of Total (33,969) |
|--------|:-----:|:-------------------:|
| Today (2026-06-15) | 0 | 0.0% |
| Yesterday (2026-06-14, Sun) | 682 | 2.0% |
| Last 7 days | 8,362 | 24.6% |
| Last 30 days | 8,393 | 24.7% |
| **Stale (>30 days)** | **25,576** | **75.3%** |

### Interpretation
- **0 funds have NAV for today** (June 15 is Monday — AMFI may not have published yet; ingestion hasn't run)
- **682 funds have NAV for yesterday** (Sunday — partial AMFI weekend update)
- **8,362 funds updated in last 7 days** — this is the active universe
- **25,576 stale funds** — mostly closed, merged, or very old schemes inherited from the legacy fund_metrics calculation

## 3. NAV Freshness in nav_history

| Bucket | Funds | Notes |
|--------|:-----:|-------|
| Today (2026-06-15) | 0 | No ingestion run today |
| Yesterday (2026-06-14, Sun) | 689 | Incomplete weekend data |
| Last 7 days | 8,607 | 2026-06-12 bulk + 2026-06-14 partial |

## 4. nav_history Dates Distribution

| Date | Day of Week | Rows | Notes |
|------|:-----------:|:----:|-------|
| 2026-06-14 | Sunday | 689 | Weekend partial |
| 2026-06-12 | Friday | 7,868 | Best date (56% of full AMFI) |
| 2026-06-11 | Thursday | 50 | Test/partial ingestion |
| 2026-06-01 | Monday | 5 | Historical trace |
| 2026-05-29 | Friday | 12 | Historical trace |
| 2026-05-17 | Sunday | 1 | Historical trace |

### Key Finding
- Only **2 dates** have meaningful NAV data (2026-06-12, 2026-06-14)
- The ingestion function truncates data due to timeout on every invocation
- No multi-day trend data available in `nav_history`

## 5. recommendation_universe Metadata Coverage

| Field | Covered | Total | % |
|-------|:-------:|:-----:|:-:|
| scheme_code | 8,095 | 8,095 | 100.0% |
| scheme_name | 8,095 | 8,095 | 100.0% |
| category | 8,095 | 8,095 | 100.0% |
| amc | 8,024 | 8,095 | 99.1% |
| fund_manager | 1,352 | 8,095 | 16.7% |
| expense_ratio | 1,326 | 8,095 | 16.4% |
| aum | 1,327 | 8,095 | 16.4% |

## 6. Staleness Risk

### High Risk: nav_history
- **nav_history is incomplete** due to timeout — 44% of AMFI schemes never ingested
- No data exists for 2026-06-13 (Saturday), 2026-06-10, 2026-06-09, etc.
- **Cannot be used for trend analysis or multi-day metrics**

### Low Risk: fund_metrics
- Calculated from `funds.db` (20 years of data) — not affected by nav_history gaps
- Last calculated 2026-06-15 — up to date
- **However**, 75.3% of funds (25,576) are stale (>30 days since last NAV)
- These stale funds are correctly excluded from `recommendation_universe` by the stale filter

### Medium Risk: recommendation_universe
- 8,095 fresh funds selected — stale funds already filtered out
- Metadata coverage is the only gap (expense_ratio 16.4%)

## 7. Summary

| Criterion | Status | Risk |
|-----------|:------:|:----:|
| NAV data in nav_history this week | ⚠️ Partial (8,607 rows) | HIGH |
| NAV data in fund_metrics this week | ✅ 8,362 funds | LOW |
| fund_metrics last calculated | ✅ 2026-06-15 | LOW |
| Universe fresh (<30d stale filtered) | ✅ 8,095 funds | LOW |
| Metadata usable for scoring | ⚠️ 16.4% expense_ratio | HIGH |
| Auto-refresh possible | ❌ None | CRITICAL |

**Overall Freshness Score: 4/10**
- nav_history needs timeout fix and re-ingestion
- fund_metrics is fresh but disconnected from nav_history
- Universe needs metadata enrichment before production use
