# fund_metrics Migration Report

**Status:** Schema created | **Date:** 2026-06-15
**Migration file:** `supabase/migrations/20260615000000_create_fund_metrics.sql`

---

## Purpose

The `fund_metrics` table is the central metrics store for all mutual fund schemes tracked by CIFRAA. It will eventually replace the Value Research workbook as the single source of truth for fund performance, risk, and quality metrics.

This migration creates only the schema. No data is imported and the recommendation engine is not modified.

---

## Schema Definition

### Table: `fund_metrics`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| **scheme_code** | `TEXT` | `PRIMARY KEY` | AMFI scheme code (natural key) |
| **scheme_name** | `TEXT` | `NOT NULL` | Full scheme name |
| **category** | `TEXT` | nullable | e.g. "Large Cap", "Liquid" |
| **amc** | `TEXT` | nullable | Asset Management Company name |
| **return_1m** | `NUMERIC` | nullable | 1-month return (%) |
| **return_3m** | `NUMERIC` | nullable | 3-month return (%) |
| **return_6m** | `NUMERIC` | nullable | 6-month return (%) |
| **cagr_1y** | `NUMERIC` | nullable | 1-year CAGR (%) |
| **cagr_3y** | `NUMERIC` | nullable | 3-year CAGR (%) |
| **cagr_5y** | `NUMERIC` | nullable | 5-year CAGR (%) |
| **volatility_1y** | `NUMERIC` | nullable | 1-year annualised volatility |
| **volatility_3y** | `NUMERIC` | nullable | 3-year annualised volatility |
| **volatility_5y** | `NUMERIC` | nullable | 5-year annualised volatility |
| **max_drawdown** | `NUMERIC` | nullable | Maximum peak-to-trough decline |
| **sharpe_ratio_1y** | `NUMERIC` | nullable | 1-year Sharpe ratio |
| **sharpe_ratio_3y** | `NUMERIC` | nullable | 3-year Sharpe ratio |
| **sharpe_ratio_5y** | `NUMERIC` | nullable | 5-year Sharpe ratio |
| **sortino_ratio_1y** | `NUMERIC` | nullable | 1-year Sortino ratio |
| **sortino_ratio_3y** | `NUMERIC` | nullable | 3-year Sortino ratio |
| **sortino_ratio_5y** | `NUMERIC` | nullable | 5-year Sortino ratio |
| **consistency_score** | `NUMERIC` | nullable | Score for return consistency |
| **confidence_score** | `NUMERIC` | nullable | Score for data confidence |
| **recommendation_score** | `NUMERIC` | nullable | Aggregate recommendation score |
| **first_nav_date** | `DATE` | nullable | Earliest available NAV date |
| **last_nav_date** | `DATE` | nullable | Most recent NAV date |
| **total_data_points** | `INTEGER` | nullable | Count of NAV data points |
| **last_calculated** | `TIMESTAMPTZ` | nullable | Timestamp of last metric calculation |
| **created_at** | `TIMESTAMPTZ` | `DEFAULT now()` | Row creation time |
| **updated_at** | `TIMESTAMPTZ` | `DEFAULT now()` | Row last update time |

### Row Level Security

RLS is enabled on the table. No policies are created yet — these will be added when the consuming feature (dashboard/reports) is built.

---

## Indexes

| Index | Column(s) | Order | Purpose |
|---|---|---|---|
| `idx_fund_metrics_category` | `category` | ASC | Filter funds by category |
| `idx_fund_metrics_amc` | `amc` | ASC | Filter funds by AMC |
| `idx_fund_metrics_cagr_1y` | `cagr_1y` | DESC | Rank funds by 1Y return |
| `idx_fund_metrics_cagr_3y` | `cagr_3y` | DESC | Rank funds by 3Y return |
| `idx_fund_metrics_cagr_5y` | `cagr_5y` | DESC | Rank funds by 5Y return |
| `idx_fund_metrics_sharpe_1y` | `sharpe_ratio_1y` | DESC | Rank funds by 1Y Sharpe |
| `idx_fund_metrics_sharpe_3y` | `sharpe_ratio_3y` | DESC | Rank funds by 3Y Sharpe |
| `idx_fund_metrics_sharpe_5y` | `sharpe_ratio_5y` | DESC | Rank funds by 5Y Sharpe |
| `idx_fund_metrics_consistency` | `consistency_score` | DESC | Rank funds by consistency |
| `idx_fund_metrics_confidence` | `confidence_score` | DESC | Rank funds by confidence |
| `idx_fund_metrics_recommendation` | `recommendation_score` | DESC | Rank funds by recommendation |
| `idx_fund_metrics_last_calculated` | `last_calculated` | DESC | Identify stale entries |

### Index Rationale

1. **Filter indexes** (`category`, `amc`) — enable fast segment-based filtering (e.g. "all Large Cap funds").
2. **Return indexes** (`cagr_1y`, `cagr_3y`, `cagr_5y`) — descending B-tree for leaderboard-style ranking queries. Postgres can also use these for range filters like `WHERE cagr_1y > 15`.
3. **Risk-adjusted indexes** (`sharpe_ratio_1y/3y/5y`) — descending order because higher Sharpe is better.
4. **Quality indexes** (`consistency_score`, `confidence_score`, `recommendation_score`) — descending for top-N scoring queries used by the recommendation engine.
5. **Staleness index** (`last_calculated DESC`) — allows efficient queries like `WHERE last_calculated IS NULL OR last_calculated < now() - interval '24 hours'`.

> **Note:** No composite indexes were added at this stage. The primary query patterns are not yet known, and single-column indexes give Postgres the flexibility to bitmap-combine them. Composite indexes can be added in a follow-up migration once real query patterns are observed.

---

## Migration File

```
supabase/migrations/20260615000000_create_fund_metrics.sql
```

Run with:
```bash
supabase migration up
```

---

## Post-Migration Steps (Future)

1. **Add RLS policies** — when the dashboard/reports feature is built.
2. **Import data** — populate from NAV history or Value Research export.
3. **Add composite indexes** — if profiling reveals specific query patterns.
4. **Wire into recommendation engine** — only when explicitly requested.

---

## Rollback

```sql
DROP TABLE IF EXISTS fund_metrics;
```

This will cascade-drop all associated indexes.
