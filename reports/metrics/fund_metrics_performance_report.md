# Fund Metrics Performance Report

**Generated:** 2026-06-15T12:30

## Current Indexes on fund_metrics

| Index Name | Column(s) | Order | Purpose |
|---|---|---|---|
| `fund_metrics_pkey` | `scheme_code` | ASC | Primary key (implicit) |
| `idx_fund_metrics_category` | `category` | ASC | Category filtering |
| `idx_fund_metrics_amc` | `amc` | ASC | AMC filtering |
| `idx_fund_metrics_cagr_1y` | `cagr_1y` | DESC | 1Y CAGR ranking |
| `idx_fund_metrics_cagr_3y` | `cagr_3y` | DESC | 3Y CAGR ranking |
| `idx_fund_metrics_cagr_5y` | `cagr_5y` | DESC | 5Y CAGR ranking |
| `idx_fund_metrics_sharpe_1y` | `sharpe_ratio_1y` | DESC | 1Y Sharpe ranking |
| `idx_fund_metrics_sharpe_3y` | `sharpe_ratio_3y` | DESC | 3Y Sharpe ranking |
| `idx_fund_metrics_sharpe_5y` | `sharpe_ratio_5y` | DESC | 5Y Sharpe ranking |
| `idx_fund_metrics_consistency` | `consistency_score` | DESC | Consistency ranking |
| `idx_fund_metrics_confidence` | `confidence_score` | DESC | Confidence ranking |
| `idx_fund_metrics_recommendation` | `recommendation_score` | DESC | Recommendation ranking |
| `idx_fund_metrics_last_calculated` | `last_calculated` | DESC | Staleness check |
| **NEW** `idx_fund_metrics_last_nav_date` | `last_nav_date` | DESC | Active fund filtering |
| **NEW** `idx_fund_metrics_expense_ratio` | `expense_ratio` | ASC | Expense filtering |
| **NEW** `idx_fund_metrics_net_assets` | `net_assets` | DESC | AUM ranking |
| **NEW** `idx_fund_metrics_amc_category` | `amc, category` | ASC | AMC/Category grouping |

## Estimated Query Latency

| Query Type | Current | With Indexes | Notes |
|---|---|---|---|
| Active funds (last_nav_date >= 730d) | Seq scan (33,969 rows) | Index scan (~500ms) | New idx_fund_metrics_last_nav_date |
| Top 10 by CAGR 1Y | Index scan DESC (~10ms) | Already indexed | |
| Top 10 by Sharpe 3Y | Index scan DESC (~10ms) | Already indexed | |
| Filter by category | Index scan (~5ms) | Already indexed | |
| Filter by AMC | Index scan (~5ms) | Already indexed | |
| Filter by expense < 1.5 | Seq scan (~100ms) | Index scan (~10ms) | New idx_fund_metrics_expense_ratio |
| AMC + Category group | Seq scan (~200ms) | Index scan (~20ms) | New idx_fund_metrics_amc_category |
| Full table scan | 33,969 rows | N/A | ~1-2s via service_role |

## Slow Query Analysis

### Expected Slow Queries

1. **`SELECT * FROM fund_metrics WHERE category IS NULL`**
   - 33,969 rows scanned (all rows have NULL category)
   - No partial index exists for NULLs
   - Recommendation: Add partial index `WHERE category IS NOT NULL`

2. **`SELECT * FROM active_funds ORDER BY cagr_3y DESC`**
   - Uses `idx_fund_metrics_cagr_3y` first, then filters by last_nav_date
   - Better: Composite index `(last_nav_date DESC, cagr_3y DESC)`
   - Estimated latency: ~50ms

3. **`SELECT * FROM fund_metrics WHERE amc = 'HDFC' AND category LIKE 'EQ-%'`**
   - New `idx_fund_metrics_amc_category` covers this
   - Estimated latency: ~5ms

## Optimization Recommendations

1. **Composite indexes for active + rank queries:**
   - `(last_nav_date DESC, cagr_3y DESC)` — active rankings
   - `(last_nav_date DESC, sharpe_ratio_3y DESC)` — active risk-adjusted rankings
   - `(last_nav_date DESC, consistency_score DESC)` — active quality rankings

2. **Partial indexes for NULL filtering:**
   - `WHERE category IS NOT NULL AND amc IS NOT NULL` — for populated rows

3. **Materialized view for dashboard:**
   - Pre-compute top-10 per category and cache as materialized view
   - Refresh daily via pg_cron

4. **BRIN index on `last_nav_date`:**
   - For range queries (active fund filtering), BRIN is more efficient than B-tree
   - Estimated size: ~100KB vs ~1MB for B-tree
