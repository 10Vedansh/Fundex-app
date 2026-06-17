# Phase 5.2 — Category/AMC Backfill Report

**Generated:** 2026-06-15

## Coverage Improvement

| Field | Before Ph5.2 | After AMFI | After mfapi.in | **Final** |
|-------|:-----------:|:----------:|:--------------:|:---------:|
| scheme_name | 1,805 (5.3%) | 13,763 (40.5%) | 33,459 (98.5%) | **33,459 / 33,978** |
| amc | 1,805 (5.3%) | 13,763 (40.5%) | 33,459 (98.5%) | **33,459 / 33,978** |
| category | 1,805 (5.3%) | 8,475 (24.9%) | 28,171 (82.9%) | **28,171 / 33,978** |
| expense_ratio | 1,759 (5.2%) | — | — | **1,759 / 33,978** (unchanged) |
| aum | 1,767 (5.2%) | — | — | **1,767 / 33,978** (unchanged) |

## Data Sources Used

| Source | Schemes Covered | Fields Obtained | Effort |
|--------|:--------------:|----------------|:------:|
| Workbook (matched) | 1,805 | name, AMC, category (short codes) | ✅ Already done |
| AMFI NAVAll.txt | 11,958 | name, AMC from heuristic, category from keyword inference | 🟡 Medium |
| mfapi.in API | 19,696 | name, fund_house (AMC), scheme_category | 🟠 High (3,531s, 8 workers) |
| **Total** | **33,459** | **98.5% coverage** | |

## 519 Uncovered Schemes

519 schemes (1.5%) still have empty names due to mfapi.in API timeouts. These are older schemes with last NAV dates from 2006-2010. They are low-priority for the recommendation engine.

## Category Format Cleanup

The backfill produced 157 distinct category values due to mixing three different sources:

| Source | Format | Examples |
|--------|--------|---------|
| Workbook (original) | Short codes | `EQ-LC`, `EQ-ELSS`, `DT-LIQ`, `HY-BH` |
| AMFI heuristic inference | Full names | `Equity - Large Cap`, `Debt - Liquid` |
| mfapi.in (raw) | AMFI format | `Equity Scheme - Large Cap Fund`, `Debt Scheme - Liquid Fund` |
| mfapi.in (normalized) | Full names | Same as heuristic output |
| Garbage | Various | `1`, `Direct`, `G`, `Daily` |

A category normalization pass is recommended in Phase 5.3 to consolidate to a single standard format.

## Impact on Recommendation Engine

- **98.5% of schemes** now have AMC → AMC diversification caps can be enforced
- **82.9% of schemes** now have category → category-relative scoring, horizon rules, goal eligibility work for most funds
- The engine previously only scored 1,805 matched funds; now it can use category/AMC constraints for **28,171 funds**
- 519 uncovered schemes are legacy (pre-2010) with <100 NAV data points — low impact

## What Was Built

| Script | Purpose |
|--------|---------|
| `scripts/backfill-metadata.py` | AMFI NAVAll.txt download + scheme name parsing + AMC extraction + category keyword inference + Supabase upsert |
| `scripts/batch-fetch-mfapi.py` | Concurrent mfapi.in batch fetcher (8 workers) + category normalization + dual upsert (fund_master + fund_metrics) |

## Readiness: 8/10 (+1 from Phase 4)

- ✅ scheme_name coverage: 98.5%
- ✅ amc coverage: 98.5%
- ✅ category coverage: 82.9%
- ✅ fund_metrics also backfilled
- ⬜ Category format cleanup needed (157 distinct values)
- ⬜ 519 uncovered schemes (low priority)
