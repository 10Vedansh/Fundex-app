# VR API Data Freshness Report

**Date**: 2026-06-16
**Source**: Value Research Online JSON API (`/api/funds/{id}/`)
**Samples inspected**: 5 funds (SBI Equity Hybrid, HDFC Liquid, ICICI Large & Mid Cap, SBI Ultra Short, Sundaram Money)

## Freshness Summary

| Field | Staleness | Source in JSON | Notes |
|---|---|---|---|
| **AUM (Assets)** | 31 May 2026 ~ 16 days | `more_details_data.data[].foot_note` | Standard monthly cycle |
| **Expense Ratio** | 31 May 2026 ~ 16 days | `more_details_data.data[].foot_note` | Same as AUM date |
| **Portfolio holdings** | 31 May 2026 ~ 16 days | `portfolio_data.*.as_on_date_fmt` | Monthly portfolio disclosure |
| **Consistency score** | 15-16 Jun 2026 ~ 0-1 days | `consistency_score_data.as_on_date` | Updated daily |
| **Fund manager** | Since join date | `fund_manager_data.managers[].managed_date_from_fmt` | Changes infrequently |
| **Fund launch date** | Inception | `plan_data.fund_launch_date` | Static |

## Details

### Sample: SBI Medium to Long Duration Fund (VR ID 16230)
- **AUM**: ₹2,020 Cr as on 31 May 2026
- **Expense Ratio**: 0.66% as on 31 May 2026
- **Consistency score**: 15 Jun 2026 (yesterday)
- **Portfolio**: 31 May 2026

### Sample: HDFC Liquid Fund (VR ID 16167)
- **AUM**: ₹67,998 Cr as on 31 May 2026
- **Consistency score**: 15 Jun 2026

### Sample: Invesco India Liquid Fund (VR ID 16780)
- **Consistency score**: 16 Jun 2026 (today!)
- **Portfolio**: 31 May 2026

## Sources of Date Information

From the raw JSON structure:
```
data.more_details_data.data[]  ← entries with title, data, data_fmt, foot_note
data.consistency_score_data.as_on_date  ← YYYY-MM-DD
data.portfolio_data.asset_allocation.as_on_date_fmt  ← "as on DD MMM, YYYY"
data.portfolio_data.holding.as_on_date_fmt
data.portfolio_data.credit_rating.as_on_date_fmt
```

## Conclusion

VR API data is sufficiently fresh for enrichment. AUM and expense_ratio are updated monthly (standard for Indian mutual fund industry, typically ~2 week lag after month end). Portfolio holdings follow the same cycle. Consistency scores and ratings are updated daily.
