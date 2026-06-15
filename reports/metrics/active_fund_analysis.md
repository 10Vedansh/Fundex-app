# Active Fund Analysis

**Generated:** 2026-06-15T12:15

## Summary

| Metric | Value |
|---|---|
| Total schemes in fund_metrics | 33,969 |
| Active (NAV within 730 days) | 8,910 |
| Inactive (no recent NAV) | 25,059 |
| Active % | 26.2% |
| Active & investable (>=60 data pts) | 8,910 |

## Active Fund Definition

- `last_nav_date >= CURRENT_DATE - INTERVAL '730 days'`
- `total_data_points >= 60`

## Database Objects Created

1. **View `active_funds`**: Filters fund_metrics to active + investable only.
   - Used by: recommendation engine, dashboard rankings, category analysis
2. **View `active_fund_stats`**: Quick aggregate counts.
   - Returns: total, active, inactive, active_pct, active_investable
3. **RLS Policies**: `fund_metrics_select_anon` and `fund_metrics_select_auth` allow public SELECT on fund_metrics.

## Data Population Status

| Field | Status |
|---|---|
| Calculated metrics (CAGR, Sharpe, Vol, etc.) | All 33,969 populated |
| `category` | Not populated (no matching key between datasets) |
| `amc` | Not populated |
| `expense_ratio`, `net_assets` | Not populated |
| `fund_manager`, `launch_date`, etc. | Not populated |

## Recommendations

1. **Short-term**: Use workbook_data (2,011 funds) for category/AMC/expense/AUM enrichment
2. **Medium-term**: Build scheme_code ↔ workbook fund mapping table for cross-reference
3. **Long-term**: Source category/AMC from AMFI scheme detail API directly
