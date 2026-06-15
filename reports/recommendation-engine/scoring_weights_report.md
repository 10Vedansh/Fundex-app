# Scoring Engine — Factor Weight Analysis

**Date:** 2026-06-12  
**Data Source:** scoringEngineV3.ts, intersectionEngine.ts  

## Scoring Factor Summary

| # | Factor | Conservative | Moderate | Aggressive | Normalization | Max Contrib | Type | Impact |
|---|---|---:|---:|---:|---|---|---|
| 1 | Sortino Ratio | 40% | 25% | 15% | Min-max (range -7.95–11.08) | 0.00–0.40 (varies by profile) | Ranking signal | HIGHEST — conservative: 40%, moderate: 25%, aggressive: 15% |
| 2 | Category-Relative CAGR (3Y) | 10% | 25% | 30% | Global min-max (range 0.00–57.24) | 0.10–0.30 (varies by profile) | Ranking signal | HIGH — aggressive: 30%, moderate: 25% |
| 3 | Rolling Consistency (multi-period outperformance) | 20% | 15% | 20% | Ratio of periods where period return > 80% of category median CAGR (0–1) | 0.15–0.20 | Ranking signal | MODERATE-HIGH — 15–20% weight across all profiles |
| 4 | Sharpe Ratio | 10% | 10% | 15% | Global min-max (range -4.68–4.28) | 0.10–0.15 | Ranking signal | MODERATE — 10–15% weight. Null → 0 score. |
| 5 | Low Volatility (inverted) | 15% | 10% | 5% | 1 - min-max (range 0.00–40.00). Null → vol=0 → 1 - norm(0,..) = 1.0 (PERFECT SCORE) | 0.05–0.15 | Ranking signal | MODERATE — KEY ISSUE: null volatility → vol=0 → normalized to 1.0 (best possible). This gives a significant boost to funds missing volatility data. |
| 6 | Completeness Penalty (missing metrics) | N/A | N/A | N/A | 15% per missing critical (Sharpe, Vol, CAGR) + 5% per optional (Sortino, Consistency, Expense, Benchmark, FundManager) | ×1.0 (no nulls) | Penalty (multiplicative) | MODERATE — but insufficient to overcome other factors. 3 critical nulls → ×0.55. |
| 7 | Age-Based Recency Penalty | N/A | N/A | N/A | <1yr → ×0.70, 1-3yr → ×0.85, 3-5yr → ×0.95, ≥5yr → ×1.0 | ×1.0 (5+ years) | Penalty (multiplicative) | MODERATE — young funds penalized 15-30%. But funds 3-5yr only lose 5%. |
| 8 | Category-Relative Expense | 5% | 10% | 5% | 1 - min(expense/median, 2) × 0.35. Null → 0.5 | 0.05–0.10 | Ranking signal | LOW — 5–10% weight. Null → 0.5 (neutral). |
| 9 | AUM Stability | 0% | 5% | 5% | Global min-max (range 0–213439 Cr). Null → 0.5 | 0.00–0.05 | Ranking signal | LOW — only moderate/aggressive profiles. 5% weight. |
| 10 | Category Breadth (Diversification Bonus) | 0% | 0% | 5% | Lookup table: EQ-SC=1.0, EQ-MC=0.9, EQ-FLX=0.9, EQ-LC=0.7, etc. Default 0.2 | 0.05 (small cap gets max 1.0 × 5%) | Ranking signal | NEGLIGIBLE — only aggressive profile, 5% weight. |
| 11 | Experience Modifier (beginner only) | N/A | N/A | N/A | If beginner and vol>15 → ×0.70, if expense>1.5 → ×0.90. Cumulative. | ×1.0 (no penalty) | Penalty (multiplicative) | CONDITIONAL — only for beginner experience level. |
| 12 | Credit Risk Penalty (debt only) | N/A | N/A | N/A | 0–25% multiplicative penalty based on avgCreditQuality + DT-CR category | ×0.75 (max penalty) | Penalty (multiplicative) | DEBT-ONLY — not relevant for equity funds. |


## Profile Weight Configuration

| Factor | Conservative | Moderate | Aggressive |
|---|---|---:|---:|
| Sortino | 40% | 25% | 15% |
| CAGR (Relative) | 10% | 25% | 30% |
| Consistency | 20% | 15% | 20% |
| Sharpe | 10% | 10% | 15% |
| Low Volatility | 15% | 10% | 5% |
| Expense | 5% | 10% | 5% |
| AUM | 0% | 5% | 5% |
| Diversification | 0% | 0% | 5% |
| **Total** | **100%** | **100%** | **100%** |


## Penalty Application Order

1. **Score = weighted composite** (sum of factor × weight)
2. **× Credit Penalty** (debt only, 0–25%)
3. **× DT-CR category suppression** (×0.80 unless very high risk + long)
4. **× Experience Modifier** (beginner only, ×0.63–1.0)
5. **× Completeness Multiplier** (×0.55–1.0 for 3 critical nulls)
6. **× Age Multiplier** (×0.70–1.0 based on fund age)
7. **Final Score** (rounded to 2 decimal places)


## Critical Insight: Missing Volatility → Score Boost

When a fund has `volatility = null` and `stdDev = null`, the scoring engine defaults to `vol = 0`.

The volatility score is computed as:

```
volN = 1 - normalize(vol, minVol, maxVol)
     = 1 - normalize(0, minVol, maxVol)
     = 1 - 0
     = 1.0 (PERFECT)
```

This means funds with **no volatility data get the best possible volatility score**.

For a conservative profile (volatility weight = 15%), this contributes **0.15** to the pre-penalty score — equivalent to a fund with excellent volatility data.

For an aggressive profile (volatility weight = 5%), this contributes **0.05**, which is small but still a net positive instead of a penalty.

**Fix recommendation:** When volatility is missing, default volN to 0.5 (neutral) instead of 1.0 (perfect).


## Why HSBC Multi Cap (3 nulls) Outranks Complete Funds

Using the "aggressive" retirement profile as an example:

| Factor | Weight | HSBC Multi Cap (null sharpe, sortino, vol) | Typical Complete Fund |
|---|---:|---:|---:|
| Sortino | 15% | 0 (all null → 0.0) | 0.10 (typical 0.67 norm) |
| CAGR | 30% | **0.30** (CAGR=24.95 → top tier) | 0.15 (typical median) |
| Consistency | 20% | **0.20** (high CAGR beats threshold) | 0.12 (typical) |
| Sharpe | 15% | 0 (null → 0.0) | 0.08 (typical 0.5 norm) |
| Volatility | 5% | **0.05** (null → vol=0 → perfect 1.0) | 0.03 (typical) |
| Expense | 5% | 0.05 (low expense) | 0.03 (typical) |
| AUM | 5% | 0.03 (high AUM) | 0.02 (typical) |
| Diversification | 5% | 0.01 (Multi Cap=0.2) | 0.01 (typical) |
| **Pre-penalty** | | **0.64** | **0.54** |
| × Completeness | | ×0.55 (3 critical nulls) | ×1.0 |
| × Age | | ×0.85 (launched 2023-01) | ×0.95 or 1.0 |
| **Final Score** | | **~27.8** | **~49.0** |

The CAGR dominance (30% weight × top-tier CAGR = 0.30) and consistency boost overcome the ×0.55 completeness penalty. 

**Root cause:** CAGR weight (30%) is double the combined null penalty impact (3×15% = 45% of score but applied to a 0.64 base). The fund's CAGR is so far above the global median that even with a 45% completeness haircut, it outranks mid-tier complete funds.