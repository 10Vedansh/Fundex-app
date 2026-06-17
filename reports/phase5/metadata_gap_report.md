# Phase 5 — Metadata Gap Report

**Generated:** 2026-06-15

## 1. Ecosystem Overview

| Table / View | Rows | Notes |
|-------------|-----:|-------|
| `fund_master` | 33,978 | Canonical fund registry |
| `fund_metrics` | 33,969 | Computed metrics from NAV history |
| `fund_master_enriched` | 33,978 | JOIN view (fund_master + fund_metrics) |
| Active (`is_active = true`) | 33,969 | Has recent NAV data |
| Inactive (`is_active = false`) | 9 | No recent NAV data |

**Match breakdown (fund_master):**

| Method | Count | % |
|--------|------:|---:|
| exact | 1,244 | 3.7% |
| normalized | 6 | 0.0% |
| fuzzy | 555 | 1.6% |
| amc_fuzzy | 0 | 0.0% |
| metrics_only (no workbook) | 32,173 | 94.7% |
| **Total** | **33,978** | **100%** |

## 2. Coverage Analysis

### P0 Fields (Blocking Recommendation Scoring)

| Field | fund_metrics | fund_master | View | Active Coverage | Inactive Coverage |
|-------|------------:|-----------:|-----:|----------------:|------------------:|
| category | **0** / 33,969 (0%) | **1,805** / 33,978 (5.3%) | 1,805 (5.3%) | 1,796 / 33,969 (5.3%) | 9 / 9 (100%) |
| amc | **0** / 33,969 (0%) | **1,805** / 33,978 (5.3%) | 1,805 (5.3%) | 1,796 / 33,969 (5.3%) | 9 / 9 (100%) |
| expense_ratio | **0** / 33,969 (0%) | **1,759** / 33,978 (5.2%) | 1,759 (5.2%) | 1,757 / 33,969 (5.2%) | 2 / 9 (22.2%) |
| aum | **0** / 33,969 (0%) | **1,767** / 33,978 (5.2%) | 1,767 (5.2%) | 1,765 / 33,969 (5.2%) | 2 / 9 (22.2%) |

### P1 Fields (Important for Scoring Quality)

| Field | fund_metrics | fund_master | View | Active Coverage | Inactive Coverage |
|-------|------------:|-----------:|-----:|----------------:|------------------:|
| fund_manager | **0** / 33,969 (0%) | **1,805** / 33,978 (5.3%) | 1,805 (5.3%) | 1,796 / 33,969 (5.3%) | 9 / 9 (100%) |
| beta | **0** / 33,969 (0%) | **1,057** / 33,978 (3.1%) | 1,057 (3.1%) | 1,056 / 33,969 (3.1%) | 1 / 9 (11.1%) |
| alpha | **0** / 33,969 (0%) | **1,057** / 33,978 (3.1%) | 1,057 (3.1%) | 1,056 / 33,969 (3.1%) | 1 / 9 (11.1%) |
| std_dev | **0** / 33,969 (0%) | **1,125** / 33,978 (3.3%) | 1,125 (3.3%) | 1,124 / 33,969 (3.3%) | 1 / 9 (11.1%) |

### Computed Metrics (Good Coverage — from NAV Calculator)

| Metric | Populated | Coverage |
|--------|----------:|--------:|
| volatility_3y | 33,969 | **100.0%** |
| total_data_points | 33,969 | **100.0%** |
| last_nav_date | 33,969 | **100.0%** |
| cagr_3y | 19,194 | 56.5% |
| sharpe_ratio_3y | 19,080 | 56.2% |
| sortino_ratio_3y | 18,668 | 55.0% |

## 3. Which Fields Block Recommendation Scoring?

The recommendation engine (`intersectionEngine.ts` + `scoringEngineV3.ts`) uses these fields:

### Required (fully block recommendations if missing):

| Field | Engine Usage | Currently Blocked? |
|-------|-------------|:------------------:|
| **category** | Goal eligibility, horizon rules, category medians, diversification | ❌ **94.7% of rows unscoreable** |
| **amc** | AMC caps (max 2 per AMC), category grouping | ❌ **94.7% of rows unscoreable** |
| **cagr_3y** | Primary score driver in V3 scoring | ✅ 56.5% coverage — enough for scoring |
| **sharpe_ratio_3y** | Risk-adjusted return component | ✅ 56.2% coverage — enough |
| **volatility_3y** | Risk constraints, score normalization | ✅ 100% coverage |
| **sortino_ratio_3y** | Sortino-dominant scoring (V3 core) | ✅ 55.0% coverage |

### Nice-to-Have (improve score quality):

| Field | Engine Usage | Impact if Missing |
|-------|-------------|:-----------------:|
| **expense_ratio** | Expense score penalty | Scores less precise but still compute |
| **aum** | AUM constraint (min AUM filter) | Constraint skipped; all funds pass |
| **fund_manager** | Display only in explanations | No scoring impact |
| **beta** | Display / diagnostic | No scoring impact |
| **alpha** | Display / diagnostic | No scoring impact |
| **std_dev** | Volatility fallback | Used when volatility_3y absent |

**Key finding:** The P0 fields **category** and **amc** are the critical blockers. Without them, 94.7% of the fund universe cannot be categorized or assigned to an AMC, making the recommendation engine inoperable for those funds.

## 4. Best Source for Backfilling Each Field

| Field | Best Source | Available For | Feasibility |
|-------|-------------|---------------|-------------|
| **category** | **AMFI NAVAll.txt** — contains scheme category in column 4 or via AMC mapping | All 33,969 fund_metrics rows | **Medium** — AMFI data has 14,212 parsed entries (partial coverage) |
| **category** | **Workbook** — has category for 1,805 matched funds | 1,805 matched | Already done |
| **category** | **Value Research / external API** | All schemes | **High** — most reliable source for all schemes |
| **amc** | **AMFI NAVAll.txt** — AMC name can be extracted from scheme name prefix | All 33,969 | **Medium** — requires parsing scheme name |
| **amc** | **Workbook** — has AMC for 1,805 matched | 1,805 matched | Already done |
| **amc** | **External API** (Value Research / Morningstar) | All schemes | **High** |
| **expense_ratio** | **Workbook** — for matched funds | 1,805 matched | Already done (97.5% coverage) |
| **expense_ratio** | **AMFI monthly data** — expense ratios published separately | All schemes | **Medium** — separate data source |
| **expense_ratio** | **External API** (Value Research) | All schemes | **High** |
| **aum** | **Workbook** — for matched funds | 1,805 matched | Already done (97.9% coverage) |
| **aum** | **nav_history** — last NAV × total units (not directly available) | Computed estimate | **Low** — NAV DB doesn't track AUM |
| **aum** | **External API** (Value Research) | All schemes | **High** |
| **fund_manager** | **Workbook** — for matched funds | 1,805 matched | Already done (100% coverage) |
| **fund_manager** | **AMFI** — not in NAVAll.txt | None | **Low** |
| **fund_manager** | **External API** | All schemes | **High** |
| **beta / alpha / std_dev** | **Workbook** — for matched funds | 1,805 matched | Partial (58-62% covered) |
| **beta / alpha / std_dev** | **Calculated from nav_history** — regression against benchmark | All 33,969 | **High** — already have NAV data |
| **beta / alpha / std_dev** | **External API** | All schemes | **High** |

## 5. Phase 5 Completion Estimate

### P0 Fields (Critical)

| Field | Current Coverage | Target Coverage | Gap | Effort to Backfill | Source |
|-------|:---------------:|:---------------:|:---:|:------------------:|--------|
| category | 5.3% (1,805) | 100% (33,978) | 32,173 | 🔴 **High** — needs AMFI parsing or API | AMFI NAVAll / external API |
| amc | 5.3% (1,805) | 100% (33,978) | 32,173 | 🔴 **High** — same as category | AMFI scheme name parsing / API |
| expense_ratio | 5.2% (1,759) | 100% (33,978) | 32,219 | 🟡 **Medium** — AMFI or API | External API (Value Research) |
| aum | 5.2% (1,767) | 100% (33,978) | 32,211 | 🟡 **Medium** — AMFI or API | External API (Value Research) |

### P1 Fields (Important)

| Field | Current Coverage | Target Coverage | Gap | Effort | Source |
|-------|:---------------:|:---------------:|:---:|:-----:|--------|
| fund_manager | 5.3% (1,805) | 100% (33,978) | 32,173 | 🔴 **High** — AMFI doesn't have this | External API |
| beta | 3.1% (1,057) | 100% (33,978) | 32,921 | 🟢 **Low** — can compute from NAV data | nav_history regression |
| alpha | 3.1% (1,057) | 100% (33,978) | 32,921 | 🟢 **Low** — can compute from NAV data | nav_history regression |
| std_dev | 3.3% (1,125) | 100% (33,978) | 32,853 | 🟢 **Low** — can compute from NAV data | Already have volatility_3y (100%) |

### Phase 5 Scope by Source

| Source | Fields | Rows to Backfill | Effort |                
|--------|--------|:----------------:|:------:|
| 🔵 **nav_history computation** | beta, alpha, std_dev | ~32,900 each | 🟢 Low — calculator already exists |
| 🟡 **AMFI NAVAll.txt parsing** | category, amc | ~32,000 each | 🟡 Medium — partial coverage |
| 🔴 **External API** (Value Research) | expense_ratio, aum, fund_manager, category, amc | ~32,000 each | 🟠 Medium-High — API cost, rate limits, data freshness |
| 🟢 **Already done (workbook)** | All 8 fields for matched | 1,805 | ✅ Complete |

### Recommended Backfill Strategy

1. **First: Compute beta, alpha, std_dev from nav_history** (🟢 Low effort, 100% coverage possible)
   - Extend the NAV calculator or write a new script
   - Beta/alpha require benchmark index data (Nifty 50, etc.)
   - Std_dev is already partially covered by volatility_3y

2. **Second: Extract category and amc from AMFI NAVAll.txt** (🟡 Medium effort)
   - AMFI data has 14,212 parsed entries — this gives partial but significant coverage
   - Expand AMFI parsing to capture more entries
   - Cross-reference for remaining 20,000+ schemes

3. **Third: Expense ratio and AUM from external source** (🟠 Medium-High effort)
   - Value Research or equivalent API
   - Requires API integration and data freshness management

### Status Summary

| Phase | Effort | Coverage After | Score Impact |
|-------|:------:|:--------------:|:------------:|
| ✅ Phase 3 (NAV calc) | High | CAGR/Sharpe/Sortino: 55-56% | Scoring works for 19K funds |
| ✅ Phase 3.5 (Master) | High | Workbook enrichment: 1,805 matched | Engine works for 1,805 funds |
| 🔲 Phase 5.1 (beta/alpha/sigma) | 🟢 Low | std_dev: 100%, beta: 56%, alpha: 56% | Better score quality |
| 🔲 Phase 5.2 (category/amc) | 🟡 Medium | category/amc: ~42% (from AMFI) | More funds scoreable |
| 🔲 Phase 5.3 (expense/AUM) | 🟠 High | expense_ratio/AUM: ~42% | Better constraint filtering |

## 6. Recommendation Engine Blockers

The engine can currently score **19,194 funds** (those with CAGR 3Y). However, it can only apply **category and AMC constraints** to **1,805 funds** (those with workbook enrichment). This means:

- **32,173 funds** have computed CAGR/Sharpe but no category → cannot participate in category-relative scoring
- **32,173 funds** have no AMC → cannot be checked for AMC diversification caps
- **32,211 funds** have no expense_ratio → cannot be penalized for high expenses
- **32,211 funds** have no AUM → cannot be filtered by minimum AUM

**The engine is effectively limited to the 1,805 matched funds for full scoring.** Expanding category/amc coverage to the full 33,978 is the highest-impact Phase 5 task.
