# CIFRAA Final Data Architecture

## Eliminating Value Research Dependency Permanently

---

## 1. Storage Estimates — historical-mf-nav-data Dataset

### Dataset Profile (from GitHub release)

| Metric | Value |
|---|---|
| NAV records | 36,324,347 |
| Schemes covered | 37,936 |
| Securities mapped | 34,724 |
| Date range | 2006-04-01 to present (~20 years) |

### Raw Size (SQLite)

| Format | Estimated Size |
|---|---|
| SQLite (compressed, GitHub release) | ~100 MB |
| SQLite (uncompressed) | ~350 MB |
| CSV export (uncompressed) | ~2.5 GB |

### PostgreSQL Size Projections

| Component | Formula | Estimated Size |
|---|---|---|
| Data (36M rows × ~70 bytes avg) | 36,000,000 × 70 | ~2.5 GB |
| Tuple overhead (Postgres ~24 bytes/row) | 36,000,000 × 24 | ~864 MB |
| Toast/alignment padding | ~10% of data | ~250 MB |
| PK index (scheme_code, nav_date) | B-tree, ~30 bytes/key | ~1.1 GB |
| nav_date index | B-tree, ~16 bytes/key | ~576 MB |
| scheme_code index | B-tree, ~16 bytes/key | ~576 MB |
| **Total on disk** | | **~5.9 GB** |

### Supabase Plan Impact

| Plan | Database Limit | 36M Import Feasibility | Verdict |
|---|---|---|---|
| **Free** | 500 MB | ❌ Impossible by 12x | Cannot store full history |
| **Pro** | 8 GB | ⚠️ Tight fit (5.9 GB + headroom ~2.1 GB) | Feasible but no room for other tables |
| **Team** | 16 GB | ✅ Comfortable | Works, but $599/mo |
| **Enterprise** | Custom | ✅ Definitely | Overkill |

**Conclusion: Storing 36M raw NAV records in Supabase is not viable on Free or Pro.** The dataset alone consumes 75% of Pro's 8 GB, leaving no room for application data, auth metadata, or growth.

---

## 2. Proposed Architecture — Metrics-First Design

### Principle

**Process externally, store only results in Supabase.**

Raw historical NAV data is processed offline or in ephemeral compute. Only calculated metrics and recent daily NAV enter Supabase.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CIFRAA DATA ARCHITECTURE                      │
│                                                                     │
│  EXTERNAL (ephemeral / offline)     SUPABASE (persistent storage)   │
│  ┌──────────────────────────┐      ┌──────────────────────────┐    │
│  │ 1. historical-mf-nav-data│      │ nav_history              │    │
│  │    SQLite DB (20yr)      │      │ ─────────────────        │    │
│  │    Downloaded once       │      │ scheme_code │ nav_date   │    │
│  │    Processed locally     │      │ nav │ scheme_name        │    │
│  └──────────┬───────────────┘      │ ← Rolling 24 months     │    │
│             │                       └──────────────────────────┘    │
│             │ process & calculate         ▲                         │
│             ▼                              │ daily upsert           │
│  ┌──────────────────────────┐      ┌──────┴───────────────────┐    │
│  │ 2. Metric Calculator     │      │ fund_metrics              │    │
│  │    (Python / Node.js)    │─────▶│ ─────────────────         │    │
│  │                           │      │ scheme_code (PK)         │    │
│  │    Inputs:                │      │ cagr_1y, cagr_3y ...     │    │
│  │    • SQLite DB (backfill) │      │ sharpe_ratio_1y ...      │    │
│  │    • nav_history (daily)  │      │ sortino_ratio_1y ...     │    │
│  │    • AMFI (live)          │      │ confidence_score         │    │
│  │                           │      │ last_calculated          │    │
│  │    Outputs:               │      └──────────────────────────┘    │
│  │    • fund_metrics rows    │                │                     │
│  │    • Audit log            │                │ read                │
│  └──────────────────────────┘      ┌─────────▼─────────────────┐    │
│                                    │ recommendationEngine.ts    │    │
│  DAILY FLOW                        │ ──────────────────────    │    │
│  ┌────────────┐                    │ Reads MutualFund-like     │    │
│  │ AMFI       │───daily cron───▶   │ object with metrics       │    │
│  │ NAVAll.txt │     ingest-        │ from fund_metrics         │    │
│  └────────────┘     amfi-nav       │ instead of workbook       │    │
│                                    └──────────────────────────┘    │
│                                                                     │
│  WEEKLY FLOW                                                       │
│  ┌────────────┐    ┌──────────────────┐                            │
│  │ nav_history│───▶│ recalculate_     │──▶ fund_metrics (UPDATE)   │
│  │ (new data) │    │ metrics (GitHub  │                            │
│  └────────────┘    │ Actions / EdgeFn)│                            │
│                    └──────────────────┘                            │
│                                                                     │
│  MONTHLY FLOW                                                      │
│  ┌────────────┐    ┌──────────────────┐                            │
│  │ nav_history│───▶│ archive_old_nav  │──▶ Supabase Storage JSONL  │
│  │ (>24 mo)   │    │ (delete from DB) │    (cheap, 1 GB free)     │
│  └────────────┘    └──────────────────┘                            │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### nav_history (Exists — Add Retention Policy)

```sql
CREATE TABLE IF NOT EXISTS nav_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  nav NUMERIC,
  nav_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nav_history_scheme_code_date
  ON nav_history(scheme_code, nav_date);
CREATE INDEX IF NOT EXISTS idx_nav_history_nav_date
  ON nav_history(nav_date);
CREATE INDEX IF NOT EXISTS idx_nav_history_scheme_code
  ON nav_history(scheme_code);
```

**Retention:** 24 months rolling. Older rows archived to Supabase Storage, then deleted.

**Row count estimate (24 months):**
- 14,212 schemes × ~500 trading days = ~7.1M rows
- At ~70 bytes/row: ~500 MB (data only)
- With indexes: ~800 MB — exceeds Free (500 MB) but fits in Pro (8 GB)

**Mitigation for Free plan:** Reduce retention to 14 months (~4.1M rows, ~450 MB with indexes).

---

### fund_metrics (New — Central Metrics Table)

```sql
CREATE TABLE IF NOT EXISTS fund_metrics (
  scheme_code TEXT PRIMARY KEY,
  scheme_name TEXT NOT NULL,
  category TEXT,
  amc TEXT,

  -- Returns
  cagr_1y NUMERIC,
  cagr_3y NUMERIC,
  cagr_5y NUMERIC,
  returns_1m NUMERIC,
  returns_3m NUMERIC,
  returns_6m NUMERIC,

  -- Risk
  volatility_1y NUMERIC,
  volatility_3y NUMERIC,
  volatility_5y NUMERIC,
  max_drawdown_1y NUMERIC,
  max_drawdown_3y NUMERIC,
  max_drawdown_5y NUMERIC,

  -- Risk-adjusted
  sharpe_ratio_1y NUMERIC,
  sharpe_ratio_3y NUMERIC,
  sharpe_ratio_5y NUMERIC,
  sortino_ratio_1y NUMERIC,
  sortino_ratio_3y NUMERIC,
  sortino_ratio_5y NUMERIC,

  -- Quality
  consistency_score NUMERIC,
  information_ratio NUMERIC,
  alpha NUMERIC,
  beta NUMERIC,
  tracking_error NUMERIC,
  expense_ratio NUMERIC,

  -- Metadata
  data_quality TEXT CHECK (data_quality IN ('full', 'partial', 'minimal')),
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  first_nav_date DATE,
  last_nav_date DATE,
  total_data_points INTEGER,
  last_calculated TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_metrics_category ON fund_metrics(category);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_confidence ON fund_metrics(confidence_score);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_cagr_1y ON fund_metrics(cagr_1y);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_sharpe_1y ON fund_metrics(sharpe_ratio_1y);
```

**Size estimate:** 14,212 rows × ~300 bytes = ~4.3 MB data + ~2 MB indexes = **~7 MB total**. Negligible.

---

### fund_metrics_audit (New — Audit Trail)

```sql
CREATE TABLE IF NOT EXISTS fund_metrics_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT NOT NULL,
  metrics_snapshot JSONB,
  data_source TEXT,
  records_used INTEGER,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fund_metrics_audit_scheme
  ON fund_metrics_audit(scheme_code);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_audit_created
  ON fund_metrics_audit(created_at);
```

**Size estimate:** ~50 bytes + metrics JSON/scheme/run. At 1 run/week × 14,212 schemes × ~200 bytes = ~2.8 MB/week. Prune after 90 days.

---

### Storage Budget Summary (Supabase Pro)

| Table | Rows | Data | Indexes | Total |
|---|---|---|---|---|
| nav_history (24 mo) | 7.1M | 500 MB | 300 MB | 800 MB |
| fund_metrics | 14K | 4 MB | 2 MB | 7 MB |
| fund_metrics_audit | 55K (90 days) | 10 MB | 2 MB | 12 MB |
| Other app tables | ~100K | 50 MB | 30 MB | 80 MB |
| **Total** | | **564 MB** | **334 MB** | **~900 MB** |

**Free plan (500 MB)** — Exceeded at ~900 MB. **Pro plan (8 GB)** — Comfortable at 11% utilization.

**Free plan alternative:** Reduce nav_history to 14 months → ~450 MB total → fits in 500 MB.

---

## 4. Metric Definitions & Formulas

### CAGR (Compound Annual Growth Rate)

```
CAGR_N = (NAV_today / NAV_N_years_ago) ^ (1/N) - 1
```

- **Periods:** 1 year, 3 year, 5 year
- **Data required:** NAV at start and end of period (closest available trading day)
- **Edge case:** If start date falls on a non-trading day, use the nearest prior NAV

### Volatility (Annualized Standard Deviation)

```
daily_returns = [ln(nav_t / nav_t-1) for each consecutive trading day]
mean_return = avg(daily_returns)
variance = sum((r - mean_return)^2) / (n - 1)
volatility = sqrt(variance) * sqrt(252)  -- annualized
```

- **Periods:** 1 year (~252 returns), 3 year (~756), 5 year (~1260)
- **Minimum data:** 60 trading days (~3 months) for a meaningful value
- **NaN handling:** Exclude days where nav_t or nav_t-1 is NULL

### Sharpe Ratio

```
sharpe_ratio = (annualized_return - risk_free_rate) / annualized_volatility
```

- **Risk-free rate:** Use 6.5% (current Indian 10-year G-sec yield proxy). Store as a constant so it can be updated.
- **Some notes on Sharpe:** Uses the same annualized_return and volatility as above
- **Minimum data:** Same as volatility (60 trading days)

### Sortino Ratio

```
downside_returns = [min(r - target_return, 0) for each daily return r]
downside_variance = sum(downside_returns^2) / (n - 1)
downside_deviation = sqrt(downside_variance) * sqrt(252)
sortino_ratio = (annualized_return - risk_free_rate) / downside_deviation
```

- **Target return:** 0% (treating any negative return as downside). Could also use risk-free rate.
- **Minimum data:** Same as volatility (60 trading days)

### Max Drawdown

```
peak = max(nav_1 ... nav_t)
drawdown_t = (nav_t - peak) / peak
max_drawdown = min(drawdown_1 ... drawdown_n)
```

- **Periods:** 1 year, 3 year, 5 year rolling windows
- Reports the **largest peak-to-trough decline** within each window
- **Minimum data:** At least 60 trading days for any meaningful result

### Consistency Score

```
positive_periods = count(monthly_return > 0)
total_periods = count(all monthly returns)
consistency = positive_periods / total_periods
```

- **Scale:** 0.0 to 1.0
- **Window:** Rolling 36 months (aligns with 3Y horizon)
- **Minimum data:** At least 6 monthly periods (6 months)

### Additional Metrics

| Metric | Formula | Purpose |
|---|---|---|
| **Beta** | Cov(fund_return, benchmark_return) / Var(benchmark_return) | Market sensitivity |
| **Alpha** | fund_return - (risk_free_rate + beta × (benchmark_return - risk_free_rate)) | Excess return vs. risk |
| **Information Ratio** | (fund_return - benchmark_return) / tracking_error | Active return per unit of active risk |
| **Tracking Error** | StdDev(fund_return - benchmark_return) | How closely fund tracks its benchmark |
| **Expense Ratio** | From AMFI/AMC data | Cost efficiency |

**Benchmark mapping** (for Beta, Alpha, Tracking Error):
| Category | Benchmark |
|---|---|
| Large Cap | Nifty 50 TRI |
| Mid Cap | Nifty Midcap 150 TRI |
| Small Cap | Nifty Smallcap 250 TRI |
| Flexi Cap | Nifty 500 TRI |
| Multi Cap | Nifty 500 TRI |
| ELSS | Nifty 500 TRI |
| Liquid | CRISIL Liquid Fund Index |
| Overnight | CRISIL Overnight Index |
| Short Duration | CRISIL Short Term Bond Fund Index |
| Gilt | Nifty G-Sec Index |
| Aggressive Hybrid | CRISIL Hybrid 35+65 Aggressive Index |
| Conservative Hybrid | CRISIL Hybrid 85+15 Conservative Index |
| Arbitrage | Nifty 50 Arbitrage Index |

---

## 5. Calculation Pipeline

### Phase A — One-Time Historical Backfill

```
Step 1: Download SQLite DB from historical-mf-nav-data GitHub release
         (36M NAV records, 2006-2026, 38K schemes)

Step 2: Run backfill script (Python recommended) that:
         a. Connects to SQLite, reads NAV records per scheme
         b. Cleans data: removes duplicate dates, handles missing days
         c. Calculates all metrics per scheme using formulas above
         d. Maps AMFI scheme_code → computed metrics
         e. Bulk inserts into Supabase fund_metrics table
            (14K records, takes ~30 min)

Step 3: Verify: compare metrics for 10 known funds against Value Research workbook
         to validate calculation accuracy.
```

**Script pseudocode:**

```
for each scheme in SQLite:
    navs = sorted(historical_navs)
    if len(navs) < 60: skip (not enough data)

    cagr_1y = compute_cagr(navs, 252)
    cagr_3y = compute_cagr(navs, 756)
    cagr_5y = compute_cagr(navs, 1260)

    daily_returns = compute_daily_returns(navs)
    vol_1y = compute_volatility(daily_returns, 252)
    vol_3y = compute_volatility(daily_returns, 756)
    vol_5y = compute_volatility(daily_returns, 1260)

    sharpe_1y = (cagr_1y - RISK_FREE_RATE) / vol_1y
    sortino_1y = (cagr_1y - RISK_FREE_RATE) / compute_downside_dev(daily_returns, 252)

    max_dd_1y = compute_max_drawdown(navs, 252)
    consistency = compute_consistency(navs)

    upsert into fund_metrics
        on conflict(scheme_code) do update
```

**Performance:** Python with pandas processes 36M rows in ~5-10 min on a laptop. With per-scheme loops and metric calc, total time ~30 min.

---

### Phase B — Daily Incremental Update

```
Already running: ingest-amfi-nav (Edge Function)
    │
    ▼
nav_history ← new row for each scheme with today's NAV
    │
    ▼ (weekly cron via GitHub Actions)
recalculate-metrics:
    1. SELECT from nav_history where nav_date > fund_metrics.last_nav_date
    2. For each scheme with new data:
        a. Recalculate 1Y metrics (volatility, Sharpe, Sortino) — these change daily
        b. Recalculate CAGR_1Y if 1 year of data exists
        c. For 3Y/5Y metrics: if historical backfill data exists, blend
        d. Update fund_metrics row
    3. Set last_calculated = now()
```

**Incremental update formula for CAGR (no need to recompute from scratch):**

```
CAGR_1Y = (nav_today / nav_252_trading_days_ago) ^ 1 - 1
```

This only needs 2 data points: today and 252 trading days back. If both are in nav_history (due to 24-month retention), it's a direct lookup. If the anchor point was archived, use the stored anchor value.

**Anchor value optimization:** Store a `cagr_1y_anchor_nav` and `cagr_1y_anchor_date` in fund_metrics. On each recalc:

```
if nav_history has data 252 days back:
    anchor_nav = nav from 252 days ago
else:
    use stored anchor values (from backfill)

cagr_1y = (nav_today / anchor_nav) ^ (365 / days_between) - 1
```

This avoids needing the full 252-day window in nav_history.

---

### Phase C — Weekly Metric Recalculation (GitHub Actions)

```
name: recalculate-metrics
on:
  schedule:
    - cron: '0 14 * * 1'   # Every Monday at 2 PM IST
  workflow_dispatch:        # Manual trigger

jobs:
  recalculate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: node scripts/recalculate-metrics.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

**Timeout estimate:** 14K funds × ~20ms per fund = ~4.7 minutes. Within GitHub Actions 6-hour limit.

---

### Phase D — Monthly nav_history Archival

```
name: archive-nav-history
on:
  schedule:
    - cron: '0 6 1 * *'  # 1st of each month

jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - run: |
          # Export rows older than 24 months to JSONL
          supabase db query \
            "SELECT * FROM nav_history WHERE nav_date < NOW() - INTERVAL '24 months' \
             ORDER BY nav_date" \
            --export > nav_history_archive_$(date +%Y%m).jsonl

          # Upload to Supabase Storage (free tier: 1 GB)
          supabase storage upload nav-history-archive/${{ date }}.jsonl

          # Delete from DB
          supabase db query \
            "DELETE FROM nav_history WHERE nav_date < NOW() - INTERVAL '24 months'"
```

---

## 6. New Fund Handling

### Discovery Pipeline

```
AMFI NAVAll.txt
    │
    ├── scheme_code = "NEW123"  ← never seen before
    │
    ▼
ingest-amfi-nav (Edge Function):
    1. Insert into nav_history (daily NAV)
    2. Insert skeleton into fund_metrics:
         scheme_code, scheme_name, category, amc
         data_quality = 'minimal'
         confidence_score = 0.05
         last_nav_date = today
         total_data_points = 1
```

### Confidence Score Progression

| Data Available | confidence_score | data_quality | Calculatable Metrics |
|---|---|---|---|
| 0-3 months (< 60 data points) | 0.05 → 0.15 | `minimal` | None (all NULL) |
| 3-6 months (60-125 data points) | 0.15 → 0.30 | `partial` | Volatility, Returns_1M/3M |
| 6-12 months (125-250 data points) | 0.30 → 0.50 | `partial` | + CAGR_1Y, Sharpe, Sortino, MaxDD |
| 1-3 years (250-750 data points) | 0.50 → 0.80 | `partial` | + CAGR_3Y, 3Y metrics |
| 3-5 years (750-1250 data points) | 0.80 → 0.95 | `full` | + CAGR_5Y, 5Y metrics |
| > 5 years | 0.95 → 1.00 | `full` | All metrics |

### Recommendation Engine Integration for New Funds

```
In recommendationEngine.ts, when scoring a fund:

1. Read fund_metrics row along with scheme data
2. confidence_score determines metric weighting:
     ≥ 0.80: Use all metrics normally (full confidence)
     ≥ 0.50: Use 1Y metrics, discount 3Y/5Y by 50%
     ≥ 0.30: Use volatility + returns_1M/3M only. Heavily discount.
     < 0.30: Skip fund (insufficient data for meaningful scoring)
3. Display confidence_score to user as a data-quality badge
```

The existing `confidenceScore` field in `ScoredFund` (currently "High"/"Medium"/"Low") should map directly from `fund_metrics.confidence_score`:

| confidence_score | confidenceScore Label |
|---|---|
| 0.80 - 1.00 | High |
| 0.50 - 0.79 | Medium |
| 0.30 - 0.49 | Low |
| < 0.30 | Insufficient Data (skip) |

### Historical Data for New Funds

If a scheme_code is new to AMFI, it may still have historical NAV data from before its AMFI registration. Two options:

**Option A (Default):** Wait for nav_history to accumulate. The fund becomes fully scorable after 1-3 years.

**Option B (If available):** Check mfdata.in for back-history of the new scheme_code during the weekly recalc. If found, backfill the nav_history table and recalculate metrics immediately. This can accelerate a fund from `minimal` to `full` in one weekly run.

---

## 7. Monthly Operating Costs

### Supabase Free Plan Scenario

| Item | Cost | Notes |
|---|---|---|
| Supabase Free | $0 | 500 MB DB, 2 GB bandwidth, 5 GB storage |
| GitHub Actions | $0 | 300-2000 free min/month (private repo) |
| AMFI data fetch | $0 | Single HTTP GET |
| Historical backfill (one-time) | $0 | Runs locally |
| **Total monthly** | **$0** | **Fully free** |

**Limitations on Free:**
- nav_history limited to ~14 months (450 MB with indexes)
- No point-in-time recovery
- 100,000 monthly active users max (not an issue)

### Supabase Pro Plan Scenario (Recommended for Production)

| Item | Cost |
|---|---|
| Supabase Pro | $25/mo |
| GitHub Actions | Free tier |
| **Total monthly** | **$25/mo** |

**Pro advantages:**
- 8 GB database — nav_history can hold 24+ months
- 50 GB bandwidth
- 100 GB storage (for archives)
- Daily backups with PITR
- Priority support

### Comparison to Current Costs

| Item | Current (Value Research) | New (CIFRAA) |
|---|---|---|
| Data source | Paid workbook + manual updates | Free AMFI + mfdata.in |
| Database | Excel workbook | Supabase |
| Monthly cost | ~Unknown (premium data) | $0-$25/mo |
| Update frequency | Manual | Automated daily |
| Historical coverage | Limited | 20 years |
| Scalability | Manual process | Fully automated |

---

## 8. Migration Plan: Workbook → Automated Metrics Engine

### Phase 1: Data Infrastructure (CURRENT — COMPLETE)

- [x] nav_history table created
- [x] ingest-amfi-nav Edge Function deployed
- [x] Daily AMFI NAV ingestion live
- [x] 14,212 funds imported

### Phase 2: Historical Backfill & Metrics (NEXT — 1-2 days)

1. **Download historical dataset**
   - Go to https://github.com/rajadilipkolli/historical-mf-nav-data/releases
   - Download latest SQLite release (~100 MB compressed)
   - Contains 36M NAV records, 38K schemes, 2006-2026

2. **Run backfill script** (local machine or GitHub Actions)
   - Python script reads SQLite, calculates all metrics
   - ~30 min runtime for 14K active funds
   - Output: fund_metrics rows → upsert into Supabase

3. **Validate against workbook**
   - Pick 10 funds from Value Research workbook
   - Compare CAGR 1Y/3Y/5Y, Sharpe, Sortino, Volatility
   - Adjust formulas if discrepancies > 2%

4. **Deploy fund_metrics table** (migration 20260614000001)

### Phase 3: Incremental Updates (WEEK 2)

1. **Create weekly recalc script** → deploy as GitHub Actions workflow
2. **Create monthly archive script** → deploy as GitHub Actions workflow
3. **Update nav_history retention** → add archiving logic

### Phase 4: Recommendation Engine Integration (WEEK 2-3)

1. **Modify MutualFund interface** to read metrics from fund_metrics
2. **Update data fetching** in recommendation engine to query Supabase instead of workbook
3. **Add confidence_score** display to UI
4. **Remove workbook references** from codebase
5. **Decommission workbook** — stop syncing from OneDrive

### Phase 5: Retirement (WEEK 3)

1. Clean up unused workbook-related code and functions
2. Remove `fetch-fund-data` overhead (no longer needs AMFI enrichment of workbook)
3. Archive final workbook snapshot for reference
4. Document the new architecture

---

## 9. Implementation Order (Recommended)

```
Priority  │ Task                          │ Effort   │ Dependencies
──────────┼───────────────────────────────┼──────────┼──────────────
P0        │ Create fund_metrics migration │ 1 hour   │ None
P0        │ Run backfill script           │ 2 hours  │ fund_metrics table
P1        │ Create GitHub Actions recalc  │ 4 hours  │ fund_metrics table
P1        │ Add new fund handling         │ 2 hours  │ Backfill complete
P2        │ Add confidence_score to UI    │ 4 hours  │ fund_metrics populated
P2        │ Modify recommendation engine  │ 8 hours  │ fund_metrics populated
P3        │ Create archive workflow       │ 2 hours  │ recalc working
P3        │ Remove workbook dependency    │ 4 hours  │ Engine uses fund_metrics
P4        │ Cleanup old code              │ 2 hours  │ Workbook removed
```

---

## 10. Edge Cases & Risk Mitigation

### AMFI NAVAll.txt Fails to Download

- **Risk:** Network issue, AMFI server down
- **Mitigation:** Edge Function returns error, retries next day. nav_history unaffected. No data loss — just a gap.
- **Recovery:** Next successful fetch fills the gap.

### Historical Dataset Contains Errors

- **Risk:** Wrong NAV values in historical-mf-nav-data (transcription errors from AMFI)
- **Mitigation:** Compare against mfdata.in for top 100 funds. Use median of 3 sources (SQLite, mfdata.in, AMFI) for outliers.
- **Recovery:** Manual correction script to update specific scheme_code + date ranges.

### Fund Merges / Name Changes / Scheme Closures

- **Risk:** AMFI drops the old scheme_code from NAVAll.txt; new code appears
- **Detection:** Scheme_code in fund_etrics but no longer in AMFI feed for 30 days
- **Action:** Mark as `status = 'inactive'` in fund_metrics. Keep historical metrics intact.
- **New code:** Handled by "New Fund Handling" above.

### Leap Year / Holiday Calendar

- **Risk:** Different trading calendars across years affect CAGR periods
- **Mitigation:** Use closest available NAV to the target date (±3 trading days). Never extrapolate from a single missing day.

### Risk-Free Rate Changes

- **Risk:** Indian 10-year G-sec yield changes over time
- **Mitigation:** Store current rate as a row in a `config` table or as a constant in the script. Update quarterly. All metrics recalculate with the new rate on next weekly run.

---

## 11. Summary

| Dimension | Current (Value Research Workbook) | New (CIFRAA Architecture) |
|---|---|---|
| Data source | Manual Excel workbook | AMFI (daily) + historical-mf-nav-data (backfill) |
| Metrics | From paid data provider | Self-calculated from raw NAV |
| Update frequency | Manual | Daily (NAV), Weekly (metrics) |
| Historical range | Limited by workbook rows | 20 years (2006-present) |
| Storage | Excel file | Supabase (metrics only) |
| Cost | Unknown premium data + manual effort | $0-$25/mo |
| Schema | Flat workbook columns | Normalized: nav_history + fund_metrics |
| Confidence | Unknown | Explicit confidence_score per fund |
| New funds | Manual workbook entry | Auto-detected from AMFI |
| Scalability | Manual bottleneck | Fully automated, 14K+ funds |
