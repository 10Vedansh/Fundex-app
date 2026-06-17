# Recommendation Universe Report

**Generated:** 2026-06-15 17:25
**Script:** `scripts/build-recommendation-universe.py`

## 1. Universe Size

| Metric | Count |
|--------|------:|
| fund_master total | 33,978 |
| Rows removed (filters) | 22,706 |
| Rows removed (dedup) | 3,177 |
| **recommendation_universe** | **8,095** |
| Reduction | 25,883 rows (76.2%) |

## 2. Rows Removed -- Breakdown

### Exclusion Filters

| Reason | Count |
|--------|------:|
| Excluded category 'Unknown' | 3,168 |
| Stale scheme (last NAV 2017) | 2,508 |
| Stale scheme (last NAV 2018) | 2,111 |
| Stale scheme (last NAV 2014) | 2,100 |
| Stale scheme (last NAV 2016) | 2,043 |
| Stale scheme (last NAV 2015) | 1,449 |
| Stale scheme (last NAV 2013) | 1,356 |
| Stale scheme (last NAV 2019) | 1,356 |
| Stale scheme (last NAV 2009) | 1,352 |
| Stale scheme (last NAV 2012) | 1,287 |
| Stale scheme (last NAV 2008) | 1,147 |
| Stale scheme (last NAV 2011) | 754 |
| Stale scheme (last NAV 2010) | 641 |
| Missing scheme name | 519 |
| Stale scheme (last NAV 2007) | 497 |
| Excluded category 'Other - Unclassified' | 290 |
| Stale scheme (last NAV 2006) | 119 |
| Inactive scheme | 9 |

### Deduplication

| Reason | Count |
|--------|------:|
| Plan type variant (Regular) | 1,773 |
| Plan type variant (Direct) | 873 |
| Dividend variant | 525 |
| Duplicate variant | 6 |

## 3. Category Distribution

| Category | Count | % of Universe |
|----------|------:|:-------------:|
| Debt - Income | 876 | 10.8% |
| Debt - Liquid | 504 | 6.2% |
| Equity - Index | 452 | 5.6% |
| Debt - IDF | 436 | 5.4% |
| Debt - Short Duration | 426 | 5.3% |
| Equity - Large Cap | 335 | 4.1% |
| Debt - Overnight | 298 | 3.7% |
| Debt - Low Duration | 291 | 3.6% |
| Equity - Sectoral - Banking | 259 | 3.2% |
| Debt - Dynamic Bond | 258 | 3.2% |
| Hybrid - Arbitrage | 227 | 2.8% |
| Equity - Mid Cap | 218 | 2.7% |
| Hybrid - Aggressive | 217 | 2.7% |
| Equity - Flexi Cap | 216 | 2.7% |
| Hybrid - Equity Savings | 215 | 2.7% |
| Equity - Thematic | 208 | 2.6% |
| Debt - Money Market | 188 | 2.3% |
| Debt - Corporate Bond | 182 | 2.2% |
| Debt - Gilt | 167 | 2.1% |
| Hybrid - Multi Asset Allocation | 155 | 1.9% |
| Debt - Long Duration | 135 | 1.7% |
| Hybrid - Conservative | 133 | 1.6% |
| Debt - Credit Risk | 130 | 1.6% |
| Debt - Medium Duration | 128 | 1.6% |
| Equity - ELSS | 121 | 1.5% |
| Equity - Small Cap | 116 | 1.4% |
| Equity - Value | 115 | 1.4% |
| Equity - Sectoral - Consumption | 92 | 1.1% |
| Debt - Floater | 91 | 1.1% |
| Other - International | 90 | 1.1% |
| Other - Fund of Funds | 86 | 1.1% |
| Debt - Ultra Short Duration | 78 | 1.0% |
| Commodity - Gold | 72 | 0.9% |
| Equity - Sectoral - Pharma | 64 | 0.8% |
| Equity - Sectoral - Infrastructure | 60 | 0.7% |
| Equity - Focused | 58 | 0.7% |
| Debt - Banking and PSU | 58 | 0.7% |
| Equity - Large & Mid Cap | 56 | 0.7% |
| Equity - Sectoral - PSU | 52 | 0.6% |
| Hybrid - Dynamic Asset Allocation | 46 | 0.6% |
| Equity - Sectoral - Technology | 42 | 0.5% |
| Equity - Sectoral - Manufacturing | 40 | 0.5% |
| Equity - Dividend Yield | 34 | 0.4% |
| Equity - Multi Cap | 30 | 0.4% |
| Hybrid - Balanced | 25 | 0.3% |
| Other - ETF | 9 | 0.1% |
| Other - Solution Oriented | 6 | 0.1% |

## 4. AMC Distribution (Top 20)

| AMC | Count | % of Universe |
|-----|------:|:-------------:|
| ICICI Prudential | 451 | 5.6% |
| Aditya Birla Sun Life Mutual Fund | 371 | 4.6% |
| Nippon India | 332 | 4.1% |
| UTI | 287 | 3.5% |
| SBI | 258 | 3.2% |
| SBI Mutual Fund | 258 | 3.2% |
| Aditya Birla Sun Life | 238 | 2.9% |
| Tata | 225 | 2.8% |
| Axis | 214 | 2.6% |
| HSBC | 193 | 2.4% |
| Sundaram | 182 | 2.2% |
| Mirae Asset | 150 | 1.9% |
| Groww | 149 | 1.8% |
| HDFC | 145 | 1.8% |
| Sundaram Mutual Fund | 143 | 1.8% |
| Motilal Oswal | 131 | 1.6% |
| Edelweiss | 131 | 1.6% |
| Baroda BNP Paribas | 129 | 1.6% |
| DSP | 128 | 1.6% |
| Invesco | 125 | 1.5% |
| ... and 787 more | | |

## 5. Recommendation Readiness

| Metric | Count | Coverage |
|--------|------:|:--------:|
| Total investable funds | 8,095 | 100.0% |
| Funds with category | 8,095 | 100.0% |
| Funds with CAGR 3Y | 6,455 | 79.7% |
| Funds with Sharpe 3Y | 6,395 | 79.0% |
| Funds with Sortino 3Y | 6,215 | 76.8% |
| Funds with expense_ratio | 1,326 | 16.4% |
| Funds with AUM | 1,327 | 16.4% |
| Funds with fund_manager | 1,352 | 16.7% |
| Funds with workbook enrich | 1,352 | 16.7% |

## 6. Readiness Score

**Overall Readiness: 63.0%**

Time elapsed: 50.9s
