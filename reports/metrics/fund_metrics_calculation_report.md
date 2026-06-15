# fund_metrics Calculation Report

**Status:** Calculator built | **Date:** 2026-06-15
**Script:** `scripts/calculate-fund-metrics.py`

---

## Overview

The calculator reads historical NAV data from a SQLite database, groups records by scheme, computes all metrics following the CIFRAA formulas, and exports to CSV. No Supabase update or recommendation engine modification is performed.

---

## Input

| Property | Description |
|---|---|
| **Source** | SQLite database (e.g. from `historical-mf-nav-data` GitHub release) |
| **Table** | Auto-detected (prefers tables with `nav` in name + `scheme_code`, `nav_date`, `nav` columns) |
| **Column mapping** | `scheme_code`/`schemecode`/`code`, `nav_date`/`date`, `nav`/`net_asset_value`, `scheme_name`/`name` |
| **Minimum data** | 60 data points per scheme (otherwise skipped) |

---

## Calculation Formulas

### Returns (simple)

| Metric | Formula |
|---|---|
| `return_1m` | `(nav_today / nav_30d_ago) - 1` |
| `return_3m` | `(nav_today / nav_90d_ago) - 1` |
| `return_6m` | `(nav_today / nav_180d_ago) - 1` |

Lookup: nearest NAV on or before the target date (handles non-trading days).

### CAGR

| Metric | Formula |
|---|---|
| `cagr_1y` | `(nav_today / nav_1y_ago) ^ (1/1) - 1` |
| `cagr_3y` | `(nav_today / nav_3y_ago) ^ (1/3) - 1` |
| `cagr_5y` | `(nav_today / nav_5y_ago) ^ (1/5) - 1` |

Same nearest-NAV lookup as returns. Returns `None` if anchor NAV cannot be found.

### Volatility (annualized)

```
daily_log_returns = [ln(nav_t / nav_{t-1}) for each pair]
recent = last N trading days
variance = sum((r - mean)^2) / (n - 1)
vol = sqrt(variance) * sqrt(252)
```

| Period | Trading days (N) |
|---|---|
| `volatility_1y` | 252 |
| `volatility_3y` | 756 |
| `volatility_5y` | 1260 |

Uses sample variance (`n-1`). Requires at least 2 returns to produce a value.

### Max Drawdown

```
peak = max(nav_1 ... nav_t)
drawdown_t = (nav_t - peak) / peak
max_drawdown = max(drawdown_1 ... drawdown_n)
```

Computed over the entire available NAV series (all-time). A single `max_drawdown` value is output (not period-split).

### Sharpe Ratio

```
sharpe_N = (cagr_N - risk_free_rate) / volatility_N
```

Risk-free rate defaults to **6.5%** (Indian 10-year G-sec yield proxy). Configurable via `--risk-free-rate`.

### Sortino Ratio

```
downside_returns = [min(r - 0, 0) for each daily return r]
downside_variance = sum(downside_returns^2) / (n - 1)
downside_deviation = sqrt(downside_variance) * sqrt(252)
sortino_N = (cagr_N - risk_free_rate) / downside_deviation_N
```

Uses target return of 0% (any negative daily log return is downside).

### Consistency Score

```
monthly_returns = aggregate NAVs by month (last NAV of each month)
positive_months = count(monthly_return > 0) over trailing 36 months
consistency = positive_months / trailing_months
```

Scale: 0.0 to 1.0. Requires at least 6 monthly periods to produce a value.

### Confidence Score

```
span_days = last_nav_date - first_nav_date
expected_points = (span_days / 7) * 5     # ~5 trading days per week
confidence = min(1.0, total_data_points / expected_points)
```

Scale: 0.0 to 1.0. Rewards longer, denser NAV histories.

---

## Output

**File:** `fund_metrics.csv` (configurable via `--output`)

**Columns (22):**

| Group | Columns |
|---|---|
| Identity | `scheme_code`, `scheme_name` |
| Returns | `return_1m`, `return_3m`, `return_6m` |
| CAGR | `cagr_1y`, `cagr_3y`, `cagr_5y` |
| Risk | `volatility_1y`, `volatility_3y`, `volatility_5y`, `max_drawdown` |
| Risk Adj. | `sharpe_ratio_1y`, `sharpe_ratio_3y`, `sharpe_ratio_5y`, `sortino_ratio_1y`, `sortino_ratio_3y`, `sortino_ratio_5y` |
| Quality | `consistency_score`, `confidence_score` |
| Metadata | `first_nav_date`, `last_nav_date`, `total_data_points`, `last_calculated` |

All numeric values are stored as decimals (not multiplied by 100). Display formatting is the caller's responsibility.

`recommendation_score` is **not calculated** by this script — it is an engine-level aggregation reserved for the recommendation engine.

---

## Edge Cases Handled

| Case | Behavior |
|---|---|
| < 60 data points | Scheme skipped |
| Insufficient log returns | Scheme skipped |
| Missing NAV anchor for CAGR | CAGR returns `None` |
| Zero/negative NAV | Excluded from log returns, may reduce available data |
| Duplicate dates | Last NAV for that date wins (ORDER BY + iteration order) |
| Non-trading day lookback | Nearest prior NAV used |
| No `scheme_name` column | Left blank in output |
| No trading in last N months | CAGR/volatility return `None` |

---

## Usage

```bash
# Basic
python scripts/calculate-fund-metrics.py historical_nav.db -o fund_metrics.csv

# Custom risk-free rate
python scripts/calculate-fund-metrics.py historical_nav.db -rf 6.0

# Explicit table name
python scripts/calculate-fund-metrics.py historical_nav.db -t daily_nav
```

---

## Dependencies

- Python 3.8+ (stdlib only: `sqlite3`, `csv`, `math`, `datetime`, `argparse`, `collections`)

No third-party packages required.

---

## Post-Processing Steps (Future)

1. **Validate** — compare output against Data.xlsx for 10 known funds.
2. **Import** — bulk upsert into Supabase `fund_metrics` table.
3. **Incremental** — set up weekly recalculation via GitHub Actions.
4. **Recommendation** — wire `consistency_score` / `confidence_score` into `scoringEngineV3.ts`.
