#!/usr/bin/env python3
"""
calculate-fund-metrics.py

Reads historical NAV data from a SQLite database, calculates all CIFRAA fund
metrics per scheme, and exports to CSV with a coverage report.

Usage:
    python scripts/calculate-fund-metrics.py funds.db -o fund_metrics.csv
    python scripts/calculate-fund-metrics.py funds.db --risk-free-rate 6.0
"""

import argparse
import csv
import math
import sqlite3
import sys
from collections import OrderedDict
from datetime import datetime, date, timedelta

TRADING_DAYS_PER_YEAR = 252
RISK_FREE_RATE_DEFAULT = 6.5
MIN_DATA_POINTS = 60


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

def parse_date(val):
    if isinstance(val, (date, datetime)):
        return val if isinstance(val, date) else val.date()
    if isinstance(val, str):
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                return datetime.strptime(val, fmt).date()
            except ValueError:
                continue
    raise ValueError(f"Cannot parse date: {val}")


def find_nav_before(nav_dates, target_date):
    for nav, d in nav_dates:
        if d <= target_date:
            return nav
    return None


# ---------------------------------------------------------------------------
# Metric calculators
# ---------------------------------------------------------------------------

def calc_simple_return(nav_dates, latest_nav, lookback_days):
    target = nav_dates[-1][1] - timedelta(days=lookback_days)
    past = find_nav_before(reversed(nav_dates), target)
    if past is None or past == 0:
        return None
    return (latest_nav - past) / past


def calc_cagr(nav_dates, latest_nav, lookback_days, years):
    target = nav_dates[-1][1] - timedelta(days=lookback_days)
    past = find_nav_before(reversed(nav_dates), target)
    if past is None or past == 0:
        return None
    return (latest_nav / past) ** (1.0 / years) - 1.0


def calc_daily_log_returns(navs):
    out = []
    for i in range(1, len(navs)):
        p, c = navs[i - 1], navs[i]
        if p > 0 and c > 0:
            out.append(math.log(c / p))
    return out


def calc_annualized_vol(log_returns, n_trading_days):
    recent = log_returns[-n_trading_days:] if len(log_returns) > n_trading_days else log_returns
    if len(recent) < 2:
        return None
    mean_r = sum(recent) / len(recent)
    var_ = sum((r - mean_r) ** 2 for r in recent) / (len(recent) - 1)
    return math.sqrt(var_) * math.sqrt(TRADING_DAYS_PER_YEAR)


def calc_max_drawdown(navs):
    peak = navs[0]
    mdd = 0.0
    for n in navs:
        if n > peak:
            peak = n
        dd = (peak - n) / peak
        if dd > mdd:
            mdd = dd
    return mdd


def calc_sharpe(cagr, vol, rf_rate):
    if vol is None or vol == 0:
        return None
    return (cagr - rf_rate) / vol


def calc_downside_dev(log_returns, n_trading_days, target=0.0):
    recent = log_returns[-n_trading_days:] if len(log_returns) > n_trading_days else log_returns
    if len(recent) < 2:
        return None
    downside = [r - target for r in recent if r < target]
    if len(downside) < 2:
        return None
    d_var = sum(d ** 2 for d in downside) / (len(recent) - 1)
    return math.sqrt(d_var) * math.sqrt(TRADING_DAYS_PER_YEAR)


def calc_sortino(cagr, dd, rf_rate):
    if dd is None or dd == 0:
        return None
    return (cagr - rf_rate) / dd


def group_monthly_returns(navs, dates):
    monthly = {}
    for n, d in zip(navs, dates):
        key = (d.year, d.month)
        if key not in monthly or d > monthly[key][1]:
            monthly[key] = (n, d)
    sorted_months = sorted(monthly.items(), key=lambda x: x[0])
    returns = []
    for i in range(1, len(sorted_months)):
        p = sorted_months[i - 1][1][0]
        c = sorted_months[i][1][0]
        if p > 0:
            returns.append((c - p) / p)
    return returns


def calc_consistency(navs, dates):
    monthly = group_monthly_returns(navs, dates)
    if len(monthly) < 6:
        return None
    window = monthly[-36:]
    pos = sum(1 for r in window if r > 0)
    return pos / len(window)


def calc_confidence(total_points, first_date, last_date):
    if total_points < MIN_DATA_POINTS or first_date >= last_date:
        return 0.0
    span_days = (last_date - first_date).days
    expected = (span_days / 7.0) * 5.0
    ratio = total_points / expected if expected > 0 else 0.0
    return min(1.0, max(0.0, ratio))


# ---------------------------------------------------------------------------
# Schema detection
# ---------------------------------------------------------------------------

def detect_nav_table(conn):
    cur = conn.cursor()
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [r[0] for r in cur.fetchall()]
    date_cols = {'nav_date', 'date', 'navdate'}
    for t in sorted(tables, key=lambda x: 0 if 'nav' in x.lower() else 1):
        cur.execute(f'PRAGMA table_info("{t}")')
        cols = {r[1].lower() for r in cur.fetchall()}
        if 'scheme_code' in cols and bool(cols & date_cols) and 'nav' in cols:
            return t
    for t in tables:
        cur.execute(f'PRAGMA table_info("{t}")')
        cols = {r[1].lower() for r in cur.fetchall()}
        if 'scheme_code' in cols and bool(cols & date_cols) and 'nav' in cols:
            return t
    return None


def build_column_map(cols):
    mapping = {}
    for c in cols:
        cl = c.lower()
        if cl in ('scheme_code', 'schemecode', 'code'):
            mapping['scheme_code'] = c
        elif cl in ('nav_date', 'date', 'navdate'):
            mapping['nav_date'] = c
        elif cl in ('nav', 'net_asset_value', 'netassetvalue'):
            mapping['nav'] = c
        elif cl in ('scheme_name', 'name', 'schemename'):
            mapping['scheme_name'] = c
    return mapping


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Calculate CIFRAA fund metrics from historical NAV data")
    parser.add_argument("input_db", help="Path to SQLite NAV database")
    parser.add_argument("--output", "-o", default="fund_metrics.csv",
                        help="Output CSV path")
    parser.add_argument("--risk-free-rate", "-rf", type=float,
                        default=RISK_FREE_RATE_DEFAULT,
                        help=f"Annual risk-free rate in %% (default: {RISK_FREE_RATE_DEFAULT})")
    parser.add_argument("--table", "-t",
                        help="NAV table name (auto-detected if omitted)")
    args = parser.parse_args()

    rf_rate = args.risk_free_rate / 100.0
    conn = sqlite3.connect(args.input_db)

    table = args.table or detect_nav_table(conn)
    if not table:
        print("ERROR: Could not auto-detect NAV table. Use --table to specify.")
        sys.exit(1)

    cur = conn.cursor()
    cur.execute(f'PRAGMA table_info("{table}")')
    cols = [r[1] for r in cur.fetchall()]
    col_map = build_column_map(cols)

    missing = [r for r in ('scheme_code', 'nav_date', 'nav') if r not in col_map]
    if missing:
        print(f"ERROR: Missing required columns in '{table}': {missing}")
        print(f"Available: {', '.join(cols)}")
        sys.exit(1)

    sc_col = col_map['scheme_code']
    nd_col = col_map['nav_date']
    n_col = col_map['nav']
    sn_col = col_map.get('scheme_name')

    query = f'SELECT "{sc_col}", "{nd_col}", "{n_col}"'
    if sn_col:
        query += f', "{sn_col}"'
    query += f' FROM "{table}" ORDER BY "{sc_col}", "{nd_col}"'

    print(f"Reading from table '{table}' ...")
    cur.execute(query)

    csv_fields = [
        "scheme_code", "scheme_name",
        "return_1m", "return_3m", "return_6m",
        "cagr_1y", "cagr_3y", "cagr_5y",
        "volatility_1y", "volatility_3y", "volatility_5y",
        "max_drawdown",
        "sharpe_ratio_1y", "sharpe_ratio_3y", "sharpe_ratio_5y",
        "sortino_ratio_1y", "sortino_ratio_3y", "sortino_ratio_5y",
        "consistency_score", "confidence_score", "recommendation_score",
        "first_nav_date", "last_nav_date", "total_data_points",
        "last_calculated",
    ]

    now_ts = datetime.now().isoformat(timespec="seconds")

    # Coverage counters
    total_schemes = 0
    total_rows = 0
    processed = 0
    skipped_short = 0
    skipped_log = 0
    with_1y = 0
    with_3y = 0
    with_5y = 0

    results = []

    # Process scheme by scheme via streaming cursor
    prev_code = None
    navs = []
    dates = []
    sname = None

    def flush_scheme(code):
        nonlocal processed, skipped_short, skipped_log
        nonlocal with_1y, with_3y, with_5y
        if not navs:
            return
        if len(navs) < MIN_DATA_POINTS:
            skipped_short += 1
            return

        log_returns = calc_daily_log_returns(navs)
        if len(log_returns) < MIN_DATA_POINTS:
            skipped_log += 1
            return

        processed += 1
        nav_dates_list = list(zip(navs, dates))
        latest_nav = navs[-1]

        # Returns
        return_1m = calc_simple_return(nav_dates_list, latest_nav, 30)
        return_3m = calc_simple_return(nav_dates_list, latest_nav, 90)
        return_6m = calc_simple_return(nav_dates_list, latest_nav, 180)

        # CAGR
        cagr_1y = calc_cagr(nav_dates_list, latest_nav, 365, 1)
        cagr_3y = calc_cagr(nav_dates_list, latest_nav, 365 * 3, 3)
        cagr_5y = calc_cagr(nav_dates_list, latest_nav, 365 * 5, 5)

        if cagr_1y is not None:
            with_1y += 1
        if cagr_3y is not None:
            with_3y += 1
        if cagr_5y is not None:
            with_5y += 1

        # Volatility
        vol_1y = calc_annualized_vol(log_returns, TRADING_DAYS_PER_YEAR)
        vol_3y = calc_annualized_vol(log_returns, TRADING_DAYS_PER_YEAR * 3)
        vol_5y = calc_annualized_vol(log_returns, TRADING_DAYS_PER_YEAR * 5)

        # Max drawdown
        max_dd = calc_max_drawdown(navs)

        # Sharpe
        sharpe_1y = calc_sharpe(cagr_1y, vol_1y, rf_rate) if cagr_1y is not None else None
        sharpe_3y = calc_sharpe(cagr_3y, vol_3y, rf_rate) if cagr_3y is not None else None
        sharpe_5y = calc_sharpe(cagr_5y, vol_5y, rf_rate) if cagr_5y is not None else None

        # Sortino
        dd_1y = calc_downside_dev(log_returns, TRADING_DAYS_PER_YEAR)
        dd_3y = calc_downside_dev(log_returns, TRADING_DAYS_PER_YEAR * 3)
        dd_5y = calc_downside_dev(log_returns, TRADING_DAYS_PER_YEAR * 5)

        sortino_1y = calc_sortino(cagr_1y, dd_1y, rf_rate) if cagr_1y is not None else None
        sortino_3y = calc_sortino(cagr_3y, dd_3y, rf_rate) if cagr_3y is not None else None
        sortino_5y = calc_sortino(cagr_5y, dd_5y, rf_rate) if cagr_5y is not None else None

        # Quality
        consistency = calc_consistency(navs, dates)
        confidence = calc_confidence(len(navs), dates[0], dates[-1])

        results.append(OrderedDict([
            ("scheme_code", code),
            ("scheme_name", sname or ""),
            ("return_1m", return_1m),
            ("return_3m", return_3m),
            ("return_6m", return_6m),
            ("cagr_1y", cagr_1y),
            ("cagr_3y", cagr_3y),
            ("cagr_5y", cagr_5y),
            ("volatility_1y", vol_1y),
            ("volatility_3y", vol_3y),
            ("volatility_5y", vol_5y),
            ("max_drawdown", max_dd),
            ("sharpe_ratio_1y", sharpe_1y),
            ("sharpe_ratio_3y", sharpe_3y),
            ("sharpe_ratio_5y", sharpe_5y),
            ("sortino_ratio_1y", sortino_1y),
            ("sortino_ratio_3y", sortino_3y),
            ("sortino_ratio_5y", sortino_5y),
            ("consistency_score", consistency),
            ("confidence_score", confidence),
            ("recommendation_score", None),
            ("first_nav_date", dates[0].isoformat()),
            ("last_nav_date", dates[-1].isoformat()),
            ("total_data_points", len(navs)),
            ("last_calculated", now_ts),
        ]))

    for row in cur:
        code = str(row[0])
        d = parse_date(row[1])
        nv = float(row[2]) if row[2] is not None else None
        name = str(row[3]) if sn_col and row[3] is not None else None

        if code != prev_code and prev_code is not None:
            flush_scheme(prev_code)
            navs.clear()
            dates.clear()
            sname = None

        if nv is not None:
            navs.append(nv)
            dates.append(d)
            if name and not sname:
                sname = name

        prev_code = code
        total_rows += 1

        if total_rows % 1_000_000 == 0:
            print(f"  ... {total_rows:,} rows scanned, {processed:,} schemes processed")

    # Last scheme
    if prev_code is not None:
        flush_scheme(prev_code)

    conn.close()

    # Write CSV
    with open(args.output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=csv_fields)
        writer.writeheader()
        writer.writerows(results)

    total_schemes = processed + skipped_short + skipped_log
    coverage_lines = []
    coverage_lines.append("=" * 60)
    coverage_lines.append("  COVERAGE REPORT")
    coverage_lines.append("=" * 60)
    coverage_lines.append(f"  Total NAV rows scanned:        {total_rows:>8,}")
    coverage_lines.append(f"  Total schemes in DB:           {total_schemes:>8,}")
    coverage_lines.append(f"  Processed (>=60 data pts):     {processed:>8,}")
    coverage_lines.append(f"  Skipped (<60 NAV rows):        {skipped_short:>8,}")
    coverage_lines.append(f"  Skipped (<60 log returns):     {skipped_log:>8,}")
    coverage_lines.append(f"  Total skipped:                 {skipped_short + skipped_log:>8,}")
    coverage_lines.append(f"  ----------------------------------------")
    coverage_lines.append(f"  Schemes with 1Y metrics:       {with_1y:>8,}")
    coverage_lines.append(f"  Schemes with 3Y metrics:       {with_3y:>8,}")
    coverage_lines.append(f"  Schemes with 5Y metrics:       {with_5y:>8,}")
    coverage_lines.append("=" * 60)
    coverage_lines.append("")

    for line in coverage_lines:
        print(line)

    # Write coverage report to file
    report_path = "reports/metrics/fund_metrics_coverage_report.md"
    try:
        from datetime import datetime as dt2
        with open(report_path, "w") as rf:
            rf.write("# Fund Metrics Coverage Report\n\n")
            rf.write(f"Generated: {dt2.now().isoformat(timespec='minutes')}\n\n")
            rf.write("```\n")
            for line in coverage_lines:
                rf.write(line + "\n")
            rf.write("```\n")
            rf.write(f"\n## File\n\n")
            rf.write(f"- CSV: `{args.output}` ({processed:,} schemes)\n")
            rf.write(f"- Processed schemes: {processed:,}\n")
            rf.write(f"- Total columns: {len(csv_fields)}\n")
    except Exception as e:
        print(f"  (Could not write coverage report: {e})")

    print(f"\nOutput written to {args.output}")


if __name__ == "__main__":
    main()
