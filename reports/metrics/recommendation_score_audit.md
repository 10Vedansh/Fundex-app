# Recommendation Score Audit

**Generated:** 2026-06-15T12:25

## Current Scoring Formula

The V3 scoring engine (`scoringEngineV3.ts`) uses profile-adaptive weights:

### Profile Weights

| Component | Conservative | Moderate | Aggressive |
|---|---|---|---|
| Sortino (risk-adjusted) | 0.40 | 0.25 | 0.15 |
| CAGR relative (global) | 0.10 | 0.25 | 0.30 |
| Consistency | 0.20 | 0.15 | 0.20 |
| Sharpe | 0.10 | 0.10 | 0.15 |
| Low Volatility | 0.15 | 0.10 | 0.05 |
| Low Expense | 0.05 | 0.10 | 0.05 |
| AUM | 0.00 | 0.05 | 0.05 |
| Diversification Bonus | 0.00 | 0.00 | 0.05 |

### Calculation

```
score = Σ(weight[i] × normalized_metric[i])

Then apply multiplicative penalties:
  × (1 - credit_penalty)          [debt funds only]
  × 0.80 if DT-CR                  [credit risk funds]
  × 0.70 if beginner + vol > 15    [experience penalty]
  × 0.90 if beginner + expense > 1.5
  × completenessMultiplier         [missing data penalty]
  × ageRecencyMultiplier           [young fund penalty]
```

### Penalty Structure

| Penalty | Effect | Condition |
|---|---|---|
| Credit (debt) | Up to -25% | Low credit quality |
| Credit Risk category | -20% | DT-CR unless very high risk + long horizon |
| Beginner volatility | -30% | vol > 15% |
| Beginner expense | -10% | expense > 1.5% |
| Completeness (critical) | -15% each | Missing Sharpe, Vol, CAGR (3 fields) |
| Completeness (optional) | -5% each | Missing Sortino, consistency, expense, benchmark, fundManager |
| Age < 1 year | -30% | Launch within 1 year |
| Age 1-3 years | -15% | Launch 1-3 years ago |
| Age 3-5 years | -5% | Launch 3-5 years ago |

## Metric Verification

| Metric | Source in Workbook | Source in fund_metrics | Agreement |
|---|---|---|---|
| CAGR 1Y | `cagr1Y` | `cagr_1y` | Should match |
| CAGR 3Y | `cagr3Y` | `cagr_3y` | Should match |
| CAGR 5Y | `cagr5Y` | `cagr_5y` | Should match |
| Sharpe | `sharpeRatio` | `sharpe_ratio_1y` | Should match |
| Sortino | `sortinoRatio` | `sortino_ratio_1y` | Should match |
| Volatility | `volatility` / `stdDev` | `volatility_1y` | Should match |
| Consistency | Approx from period returns | `consistency_score` | fund_metrics more accurate |
| Max Drawdown | Approx from vol | `max_drawdown` | fund_metrics more accurate |
| Expense Ratio | `expenseRatio` | Not populated | Workbook still primary |
| AUM | `netAssets` / `aum` | Not populated | Workbook still primary |

## Gap Analysis

### Metrics fund_metrics has that workbook DOES NOT:
- `consistency_score` (computed from 36-month rolling window)
- `confidence_score` (based on data completeness vs expected)
- `max_drawdown` (computed from full NAV history)
- Multiple timeframes: 1Y, 3Y, 5Y for CAGR, Sharpe, Sortino, Volatility
- `total_data_points`, `first_nav_date`, `last_nav_date`

### Metrics workbook has that fund_metrics DOES NOT:
- `expenseRatio` — NEEDED for scoring
- `netAssets` / `aum` — NEEDED for scoring
- `fundManager` — Display only
- `beta`, `alpha`, `turnover` — Display only
- `avgCreditQuality`, `avgMaturity`, `ytm` — Debt only

## Scoring Improvement Recommendations

1. **Use fund_metrics `consistency_score`** instead of the approximated version
2. **Use fund_metrics `max_drawdown`** instead of `vol * 2.5` approximation
3. **Add `confidence_score`** as a scoring factor (currently only displayed)
4. **Add `total_data_points`** to the completeness penalty (more data = more reliable)
5. **Normalize by category median** for CAGR (currently global normalization dilutes category differences)
6. **Add downside risk** as explicit component (currently only implicit via Sortino)
7. **Remove `benchmark` and `fundManager`** from completeness penalty (not critical for scoring)
