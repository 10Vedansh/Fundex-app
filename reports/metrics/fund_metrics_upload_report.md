# Fund Metrics Upload Report

**Generated:** 2026-06-15T12:00

## Overview

Upload of `fund_metrics.csv` (33,969 schemes) to Supabase `fund_metrics` table via `scripts/upload-fund-metrics.py`.

## Upload Summary

| Metric | Value |
|---|---|
| Total rows in CSV | 33,969 |
| Successfully uploaded | 33,969 |
| Errors | 0 |
| Upload duration | 32.3s |
| Average rate | 1,051 rows/s |
| Batch size | 2,000 |
| Upsert conflict column | `scheme_code` |
| Final table count | 33,969 |

## Data Quality

| Metric | Count | Coverage |
|---|---|---|
| Total schemes | 33,969 | 100% |
| With 1Y CAGR | 29,080 | 85.6% |
| With 3Y CAGR | 19,194 | 56.5% |
| With 5Y CAGR | 7,686 | 22.6% |
| With consistency_score | 32,632 | 96.1% |
| With confidence_score | 33,969 | 100% |
| recommendation_score | 0 | NULL by design |

## Columns Uploaded (25)

scheme_code, scheme_name, return_1m, return_3m, return_6m, cagr_1y, cagr_3y, cagr_5y, volatility_1y, volatility_3y, volatility_5y, max_drawdown, sharpe_ratio_1y, sharpe_ratio_3y, sharpe_ratio_5y, sortino_ratio_1y, sortino_ratio_3y, sortino_ratio_5y, consistency_score, confidence_score, recommendation_score, first_nav_date, last_nav_date, total_data_points, last_calculated

## Notes

- `recommendation_score` set to `NULL` (reserved for recommendation engine aggregate)
- RLS enabled on `fund_metrics`, no client-side policies — only accessible via `service_role`
- No duplicate conflicts detected (all upserts matched unique `scheme_code`)
