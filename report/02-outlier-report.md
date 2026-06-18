# Outlier Analysis Report — CIFRAA Fund Metrics

**Generated**: 2026-06-18  
**Data Source**: `public/data/Data.xlsx` (workbook source, 2,011 funds)  
**Analysis Method**: TypeScript scan of all 4 sheets (Equity, Debt, Hybrid, Commodities)

---

## Summary

| Metric | Total Funds | Non-Null | Mean | Min | Max | Outlier Count | Severity |
|---|---|---|---|---|---|---|---|
| CAGR 1Y (ret1Y) | 2,011 | 1,689 | 15.92% | -17.91% | 142.91% | 33 (< -1% → -1) | ⚠️ Low (workbook) |
| CAGR 3Y (ret3Y) | 2,011 | 1,287 | 15.49% | 3.62% | 57.24% | 0 | ✅ Clean |
| CAGR 5Y (ret5Y) | 2,011 | 957 | 12.37% | -1.04% | 35.27% | 1 (< -1%) | ✅ Clean |
| Sharpe Ratio | 2,011 | 1,273 | 1.11 | -4.68 | 4.28 | 0 (>10 or <-10) | ✅ Clean |
| Sortino Ratio | 2,011 | 1,274 | 1.76 | -7.95 | 11.08 | 0 (>20 or <-20) | ✅ Clean |
| Alpha | 2,011 | 1,202 | 1.72 | -12.08 | 15.11 | 0 (>50 or <-50) | ✅ Clean |
| Beta | 2,011 | 1,202 | 0.88 | -4.26 | 4.05 | 2 (>3 or <-3) | ⚠️ Low |
| Expense Ratio | 2,011 | 1,960 | 0.50% | 0.01% | 2.56% | 0 (>5%) | ✅ Clean |
| StdDev (Volatility) | 2,011 | 1,274 | 9.45% | 0.14% | 40.00% | N/A | ✅ Normal |

---

## CAGR Analysis

**Important note**: The CAGR values in the Excel workbook are in **percentage format** (15.92 = 15.92%). The CAGR in `fund_metrics` (from NAV calculation) is in **decimal format** (0.15 = 15%). The outlier thresholds `> 5` and `< -1` are calibrated for decimal format and only apply to NAV-calculated CAGR.

### CAGR 1Y (ret1Y)

```
Non-null:  1,689 / 2,011 (84.0%)
Mean:      15.92%
Min:       -17.91%
Max:       142.91%
Median:    11.71%

Count > 5%:     1,572 (93.1% of non-null)
Count < -1%:      33 (  2.0% of non-null)
```

The maximum of 142.91% is high but plausible for a small-cap or sectoral fund in a strong year. No action needed for workbook CAGR.

### CAGR 3Y (ret3Y)

```
Non-null:  1,287 / 2,011 (64.0%)
Mean:      15.49%
Min:       3.62%
Max:       57.24%
Median:    14.68%

Count > 5%:     1,277 (99.2% of non-null)
Count < -1%:       0 (  0.0% of non-null)
```

All 3Y CAGR values are positive and reasonable. Clean.

### CAGR 5Y (ret5Y)

```
Non-null:  1,287 / 2,011 (47.6%)
Mean:      12.37%
Min:       -1.04%
Max:       35.27%
Median:    11.92%

Count > 5%:       946 (98.9% of non-null)
Count < -1%:        1 (  0.1% of non-null)
```

One fund slightly below -1%. Clean.

---

## Risk-Adjusted Metrics

### Sharpe Ratio

```
Non-null:  1,273 / 2,011 (63.3%)
Mean:      1.11
Min:       -4.68
Max:       4.28
Median:    1.06

Count > 10:     0
Count < -10:    0
```

All Sharpe ratios are within [-5, 5]. No extreme outliers.

### Sortino Ratio

```
Non-null:  1,274 / 2,011 (63.4%)
Mean:      1.76
Min:       -7.95
Max:       11.08
Median:    1.52

Count > 20:     0
Count < -20:    0
```

All Sortino ratios within reasonable bounds. None exceed ±20.

---

## Volatility (StdDev)

```
Non-null:  1,274 / 2,011 (63.4%)
Mean:      9.45%
Min:       0.14%
Max:       40.00%
Median:    7.83%

Count > 0.5%:     1,112
Count > 1.0%:     1,064
```

Range from 0.14% (liquid fund) to 40.00% (aggressive equity). Expected distribution.

---

## Expense Ratio

```
Non-null:  1,960 / 2,011 (97.5%)
Mean:      0.50%
Min:       0.01%
Max:       2.56%
Median:    0.40%

Count > 5%:      0
Count > 10%:     0
```

Only 51 funds missing expense ratio (2.5%). No values exceed 2.56%. Clean.

---

## Alpha & Beta

### Alpha

```
Non-null:  1,202 / 2,011 (59.8%)
Mean:      1.72
Min:       -12.08
Max:       15.11
Median:    1.08

Count > 50:     0
Count < -50:    0
```

No extreme alpha values. All within [-13, 16].

### Beta

```
Non-null:  1,202 / 2,011 (59.8%)
Mean:      0.88
Min:       -4.26
Max:       4.05
Median:    0.94

Count > 3:     1
Count < -3:    1
```

Two funds with extreme beta (>3 or <-3). These are likely sectoral or inverse funds. Low severity.

---

## Data Completeness by Sheet

| Sheet | Total Funds | ret1Y (CAGR 1Y) | ret3Y (CAGR 3Y) | ret5Y (CAGR 5Y) | Sharpe | Sortino | StdDev | Expense |
|---|---|---|---|---|---|---|---|---|
| Equity | 1,179 | 1,103 (94%) | 963 (82%) | 754 (64%) | 1,008 (86%) | 1,008 (86%) | 1,008 (86%) | 1,149 (97%) |
| Debt | 492 | 315 (64%) | 193 (39%) | 134 (27%) | 163 (33%) | 164 (33%) | 164 (33%) | 481 (98%) |
| Hybrid | 255 | 203 (80%) | 113 (44%) | 62 (24%) | 89 (35%) | 89 (35%) | 89 (35%) | 250 (98%) |
| Commodities | 85 | 68 (80%) | 18 (21%) | 7 (8%) | 13 (15%) | 13 (15%) | 13 (15%) | 80 (94%) |
| **Total** | **2,011** | **1,689 (84%)** | **1,287 (64%)** | **957 (48%)** | **1,273 (63%)** | **1,274 (63%)** | **1,274 (63%)** | **1,960 (97%)** |

---

## Conclusion

**No additional data-quality issues found beyond the known CAGR outlier (scheme 107002).**

- Sharpe, Sortino, Alpha: Zero extreme outliers ✅
- Expense Ratio: Near-complete coverage (97.5%), all within reasonable bounds ✅
- CAGR: The 648.25 outlier in `fund_metrics` (from NAV calculation) is already sanitized to NULL in all 3 calculation paths ✅
- CAGR workbook values (percentage format) are clean — the max of 142.91% is plausible for specific fund types

---

*End of Outlier Report*
