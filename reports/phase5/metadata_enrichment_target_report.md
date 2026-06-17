# Metadata Enrichment Target Report

**Generated:** 2026-06-15 17:25

## 1. Target Population

The recommendation_universe has **8,095** funds that need metadata enrichment.

| Field | Currently Have | Need Enrichment | % Missing |
|-------|:--------------:|:----------------:|:---------:|
| expense_ratio | 1,326 | 6,769 | 83.6% |
| aum | 1,327 | 6,768 | 83.6% |
| fund_manager | 1,352 | 6,743 | 83.3% |

## 2. Phased Enrichment Strategy

| Phase | Field | Est. Effort | Source | Target |
|-------|-------|:-----------:|--------|:------:|
| 5.4B.1 | expense_ratio | High | Value Research API | 6,769 funds |
| 5.4B.2 | aum | High | Value Research API | 6,768 funds |
| 5.4B.3 | fund_manager | Medium | Value Research API | 6,743 funds |

## 3. Comparison: Before vs After

| Metric | fund_master (before) | recommendation_universe (after) |
|--------|:-------------------:|:-------------------------------:|
| Total funds | 33,978 | 8,095 |
| Funds needing expense_ratio | 32,219 | 6,769 |
| Funds needing AUM | 32,211 | 6,768 |
| Funds needing fund_manager | 32,173 | 6,743 |

## 4. Cost Savings

By building a clean universe first, we avoid enriching **25,883 rows** that would have been excluded.
This is a **76.2% reduction** in the enrichment target.
