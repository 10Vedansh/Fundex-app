# Final Metadata Coverage Report

**Generated:** 2026-06-15
**Phase:** 5 (Steps 1-3)

## 1. Ecosystem Overview

| Table | Rows | Notes |
|-------|-----:|-------|
| `fund_master` | 33,978 | Canonical fund registry |
| `fund_master_enriched` | 33,978 | JOIN view (fund_master + fund_metrics) |
| `fund_metrics` | 33,969 | Computed NAV metrics |
| Active (`is_active = true`) | 33,969 | Has recent NAV data |
| Inactive (`is_active = false`) | 9 | No recent NAV data |

## 2. Field Coverage Summary

### scheme_name
| Source | Rows | % of Total |
|--------|-----:|:----------:|
| Workbook (matched) | 1,805 | 5.3% |
| AMFI NAVAll.txt parse | 11,958 | 35.2% |
| mfapi.in API batch fetch | 19,696 | 58.0% |
| **Total** | **33,459** | **98.5%** |
| Still empty | 519 | 1.5% |

### amc
| Source | Rows | % of Total |
|--------|-----:|:----------:|
| Workbook (matched) | 1,805 | 5.3% |
| AMFI scheme name heuristic | 11,958 | 35.2% |
| mfapi.in fund_house | 19,696 | 58.0% |
| **Total** | **33,459** | **98.5%** |
| Still empty | 519 | 1.5% |

### category
| Source | Rows | % of Total |
|--------|-----:|:----------:|
| Workbook (matched) — short codes | 1,805 | 5.3% |
| AMFI scheme name keyword inference | 6,670 | 19.6% |
| mfapi.in scheme_category (normalized) | 19,696 | 58.0% |
| **Total canonical** | **28,171** | **82.9%** |
| Other - Unclassified (garbage) | 1,401 | 4.1% |
| Unknown (still empty) | 4,406 | 13.0% |
| **Total** | **33,978** | **100.0%** |

### Computed Metrics (from NAV calculator)

| Metric | Coverage | Notes |
|--------|:--------:|-------|
| volatility_3y | 100.0% | Available for all 33,969 active funds |
| total_data_points | 100.0% | Available for all 33,969 active funds |
| last_nav_date | 100.0% | Available for all 33,969 active funds |
| cagr_3y | 56.5% | 19,194 of 33,969 |
| sharpe_ratio_3y | 56.2% | 19,080 of 33,969 |
| sortino_ratio_3y | 55.0% | 18,668 of 33,969 |

### Remaining Fields (need external data)

| Field | Coverage | Source Needed |
|-------|:--------:|---------------|
| expense_ratio | 5.2% (1,759) | Workbook + external API |
| aum | 5.2% (1,767) | Workbook + external API |
| fund_manager | 5.3% (1,805) | Workbook only |
| beta | 3.1% (1,057) | Workbook + NAV regression |
| alpha | 3.1% (1,057) | Workbook + NAV regression |
| std_dev | 3.3% (1,125) | volatility_3y available (100%) |

## 3. Category Taxonomy (49 canonical categories)

### Equity (15)
1. Equity - Large Cap
2. Equity - Mid Cap
3. Equity - Small Cap
4. Equity - Large & Mid Cap
5. Equity - Multi Cap
6. Equity - Flexi Cap
7. Equity - Value
8. Equity - Focused
9. Equity - Dividend Yield
10. Equity - ELSS
11. Equity - Index
12. Equity - Thematic
13. Equity - Sectoral - Banking
14. Equity - Sectoral - Technology
15. Equity - Sectoral - Pharma
16. Equity - Sectoral - Consumption
17. Equity - Sectoral - Infrastructure
18. Equity - Sectoral - PSU
19. Equity - Sectoral - Manufacturing

### Hybrid (7)
20. Hybrid - Aggressive
21. Hybrid - Conservative
22. Hybrid - Balanced
23. Hybrid - Equity Savings
24. Hybrid - Arbitrage
25. Hybrid - Multi Asset Allocation
26. Hybrid - Dynamic Asset Allocation

### Debt (16)
27. Debt - Liquid
28. Debt - Money Market
29. Debt - Overnight
30. Debt - Ultra Short Duration
31. Debt - Low Duration
32. Debt - Short Duration
33. Debt - Medium Duration
34. Debt - Long Duration
35. Debt - Dynamic Bond
36. Debt - Corporate Bond
37. Debt - Banking and PSU
38. Debt - Gilt
39. Debt - Credit Risk
40. Debt - Floater
41. Debt - Income
42. Debt - IDF

### Commodity (1)
43. Commodity - Gold

### Other (6)
44. Other - Fund of Funds
45. Other - International
46. Other - ETF
47. Other - Solution Oriented
48. Other - Unclassified
49. Unknown

## 4. Recommendation Engine Readiness

| Requirement | Status | Notes |
|-------------|:------:|-------|
| scheme_name for display | ✅ 98.5% | 519 legacy schemes without names |
| AMC for diversification caps | ✅ 98.5% | 519 same schemes lack AMC |
| Category for eligibility/constraints | ✅ 82.9% canonical | 4,406 still Unknown, 1,401 Unclassified |
| CAGR 3Y for scoring | ✅ 56.5% | Engine works for 19K funds |
| Sharpe/Sortino for scoring | ✅ 55-56% | Sufficient for risk-adjusted scoring |
| Expense ratio for expense score | ❌ 5.2% | Ph5.4 target — external API |
| AUM for minimum AUM filter | ❌ 5.2% | Ph5.4 target — external API |
| Beta/Alpha/StdDev for diagnostics | ❌ 3.1-3.3% | Ph5.4 target — NAV regression |
| Fund manager for display | ❌ 5.3% | Ph5.4 target — external API |

## 5. Pipeline Health

| Component | Status |
|-----------|:------:|
| AMFI NAV ingestion | ✅ Operational |
| NAV calculator | ✅ Run 33,969 schemes |
| fund_master build | ✅ 33,978 rows |
| fund_master_enriched view | ✅ 33,978 rows |
| Category normalization | ✅ 49 canonical categories |
| Recommendation engine | ✅ Uses fund_master_enriched |
| `useFundMaster` hook | ✅ Created (not wired to UI) |
| `useFundCache` fallback chain | ✅ Updated |

## 6. Phase 5 Summary

| Step | What | Status | Report |
|:----:|------|:------:|--------|
| 5.1 | Metadata gap audit | ✅ | `reports/phase5/metadata_gap_report.md` |
| 5.2 | Category/AMC backfill | ✅ | `reports/phase5/phase5-2_backfill_report.md` |
| 5.3 | Category normalization | ✅ | `reports/phase5/category_normalization_report.md` |
| 5.4 | Expense/AUM/Beta/Alpha backfill | 📋 Pending | External API integration |
| 5.5 | Wire useFundMaster into UI | 📋 Pending | Index.tsx, Search.tsx |

## 7. Remaining Gaps

| Gap | Funds Affected | Priority | Approach |
|-----|:-------------:|:--------:|----------|
| 519 unfetched scheme names (mfapi.in timeouts) | 519 | Low | Re-run failed batch |
| 4,406 Unknown category (empty) | 4,406 | Medium | mfapi.in retry or manual mapping |
| 1,401 Other - Unclassified (garbage) | 1,401 | Low | Manual reclassification per AMC |
| Expense ratio, AUM | 32,211 (94.8%) | **High** | Value Research / external API |
| Fund manager | 32,173 (94.7%) | Medium | External API |
| Beta, Alpha | 32,921 (96.9%) | Medium | NAV regression (Nifty benchmark) |
| Wire useFundMaster to UI | All | **High** | Index.tsx + Search.tsx refactor |
