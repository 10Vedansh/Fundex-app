# Workbook Dependency Audit

**Generated:** 2026-06-15 09:00:08.212513+00:00

## Summary

- **fund_master_enriched view rows:** 33,978
- **Rows with workbook enrichment:** 1,805
- **Metrics-only rows (no workbook backfill):** 32,173

## Field Coverage in fund_master_enriched View

| Field | Populated | Coverage | Source |
|-------|----------:|--------:|-------|
| alpha | 1,057 | 3.1% | fund_master |
| amc | 1,805 | 5.3% | fund_master |
| aum | 1,767 | 5.2% | fund_master |
| avg_credit_quality | 0 | 0.0% | fund_metrics |
| benchmark | 0 | 0.0% | fund_metrics |
| beta | 1,057 | 3.1% | fund_master |
| cagr_1y | 29,080 | 85.6% | fund_metrics |
| cagr_3y | 19,194 | 56.5% | fund_metrics |
| cagr_5y | 7,686 | 22.6% | fund_metrics |
| category | 1,805 | 5.3% | fund_master |
| confidence_score | 33,969 | 100.0% | fund_metrics |
| consistency_score | 32,632 | 96.0% | fund_metrics |
| exit_load | 0 | 0.0% | fund_metrics |
| expense_ratio | 1,759 | 5.2% | fund_master |
| fund_manager | 1,805 | 5.3% | fund_master |
| max_drawdown | 33,969 | 100.0% | fund_metrics |
| min_investment | 0 | 0.0% | fund_metrics |
| net_assets | 0 | 0.0% | fund_metrics |
| recommendation_score | 0 | 0.0% | fund_metrics |
| scheme_name | 33,978 | 100.0% | fund_master |
| sharpe_ratio_3y | 19,080 | 56.2% | fund_metrics |
| sortino_ratio_3y | 18,668 | 54.9% | fund_metrics |
| std_dev | 1,125 | 3.3% | fund_master |
| turnover | 0 | 0.0% | fund_metrics |
| volatility_3y | 33,969 | 100.0% | fund_metrics |

## MutualFund Interface — Field Source Mapping

| MutualFund Field | fund_master/View Source | Workbook-Dependent? | Engine-Relevant? |
|-----------------|------------------------|:-------------------:|:----------------:|
| id | workbook_id || scheme_code | No | No |
| name | scheme_name || workbook_name | No | Yes |
| category | category (from fund_master) | No | Yes |
| amc | amc (from fund_master) | No | Yes |
| nav | NOT AVAILABLE — defaults to 0 | Yes | No |
| aum | aum (from fund_master) or net_assets | No | Yes |
| expenseRatio | expense_ratio (from fund_master) | No | Yes |
| cagr1Y | cagr_1y | No | Yes |
| cagr3Y | cagr_3y | No | Yes |
| cagr5Y | cagr_5y | No | Yes |
| volatility | volatility_3y || std_dev | No | Yes |
| sharpeRatio | sharpe_ratio_3y || sharpe_ratio_1y | No | Yes |
| beta | beta | No | Yes |
| alpha | alpha | No | Yes |
| rank | NOT AVAILABLE — defaults to 0 | Yes | No |
| strengthBadge | NOT AVAILABLE — defaults to Balanced | Yes | No |
| riskLevel | NOT AVAILABLE — defaults to Moderate | Yes | No |
| minInvestment | min_investment | No | No |
| exitLoad | exit_load | No | No |
| benchmark | benchmark | No | No |
| sortinoRatio | sortino_ratio_3y || sortino_ratio_1y | No | Yes |
| fundManager | fund_manager | No | No |
| ret1W | ret_1w | No | No |
| ret1M | return_1m | No | Yes |
| ret3M | return_3m | No | Yes |
| ret6M | return_6m | No | Yes |
| ret1Y | ret_1y_overall || cagr_1y | No | No |
| ret3Y | ret_3y_overall || cagr_3y | No | No |
| ret5Y | ret_5y_overall || cagr_5y | No | No |
| avgCreditQuality | avg_credit_quality | No | No |
| avgMaturity | avg_maturity | No | No |
| ytm | ytm | No | No |

## Remaining Workbook Dependencies

| # | Field | Used By | Removable? | Priority |
|---|-------|---------|:----------:|:--------:|
| 1 | nav | UI display (nav, latestNav, previousNav) | No — AMFI NAV data not in fund_master | Low — display only |
| 2 | rank | UI display (rank badge) | Yes — can be removed or computed from metrics | Low — display only |
| 3 | strengthBadge | UI display | Yes — can be derived from risk/volatility | Low — display only |
| 4 | riskLevel | UI display | Yes — can be derived from category/volatility | Low — display only |
| 5 | high52W / low52W | UI display | No — only in AMFI/NAV source | Low — display only |
| 6 | marketCap | UI display | Yes — not essential | Low — display only |
| 7 | infoRatio / rSquared | Not used | Yes — not needed | Low — never used |
| 8 | latestNav / previousNav | UI display, AMFI enrichment | No — only from AMFI API | Low — display only |
| 9 | sectorAllocation | Portfolio analytics | No — separate data source | Low — outside scope |

## Verdict

The recommendation engine (intersectionEngine.ts) does NOT directly reference any
workbook-only fields. All fields it uses for scoring and constraints are available
from the fund_master_enriched view:

- **category**, **amc**: from fund_master (matched) or fund_metrics (all)
- **cagr1Y/3Y/5Y**, **sharpeRatio**, **sortinoRatio**, **volatility**: from fund_metrics
- **expenseRatio**, **aum**, **fundManager**: from fund_master (workbook-enriched)
- **beta**, **alpha**, **stdDev**: from fund_master
- **ret1M/3M/6M**, **ret1Y/3Y/5Y**: from fund_metrics

**Remaining workbook dependencies are UI-only display fields** (nav, rank, strengthBadge,
riskLevel, 52-week high/low). These do not affect the recommendation engine.

The workbook can be partially retired for the recommendation pipeline,
but is still needed for UI display of certain fields not yet in fund_metrics/fund_master.
