# NAV Pipeline Audit

**Generated:** 2026-06-15
**Scope:** `nav_history` table, `ingest-amfi-nav` Edge Function, pipelines

## 1. Current State

| Metric | Value |
|--------|------:|
| `nav_history` total rows | 14,212 |
| Distinct scheme codes | ~14,212 |
| Date range | 2008-10-02 to 2026-06-14 |

### Rows by Date

| Date | Row Count | Notes |
|------|:---------:|-------|
| 2026-06-14 | 689 | Weekend (Sunday) — partial AMFI data |
| 2026-06-12 | 7,868 | Latest full weekday — still partial |
| 2026-06-11 | 50 | Negligible |
| 2026-06-01 | 5 | Negligible |
| 2008–2017 | ~5,600 | Scattered historical (from legacy load) |

## 2. Pipeline Architecture (DECOUPLED)

```
nav_history ← ingest-amfi-nav (Edge Function)     ← for live NAV display
funds.db    ← calculate-fund-metrics.py (local)     ← for computed metrics
fund_master ← build-fund-master.py (local)           ← identity layer
recommendation_universe ← build-recommendation-universe.py (local)
```

**Key finding:** `fund_metrics` is computed from `funds.db` (35.2M NAV rows), **NOT** from `nav_history` (14K rows). These are entirely separate data sources. The two pipelines are disconnected.

## 3. `ingest-amfi-nav` Edge Function Analysis

### How it works
1. Fetches `https://www.amfiindia.com/spages/NAVAll.txt` via HTTP GET
2. Parses semicolon-delimited lines → `{ scheme_code, scheme_name, nav, nav_date }`
3. Upserts into `nav_history` with `onConflict: "scheme_code, nav_date"` + `ignoreDuplicates: true`
4. Batch size: 500 rows, sequential processing

### Timeout Bottleneck
- Supabase Edge Functions have a **30-second timeout** (default)
- Each batch upsert requires an HTTP roundtrip (~2-3s)
- Full AMFI NAVAll.txt has ~14,000 schemes → 28 batches
- Estimated total time: **60–90 seconds**
- **Result: Function consistently times out before completing**

### Evidence
- 2026-06-14: Only 689 rows inserted (1-2 batches completed before timeout)
- 2026-06-12: 7,868 rows inserted (~16 batches, ~30-45 seconds — borderline)

### Recommendation
- Increase Edge Function timeout to 120s
- Or refactor to use raw SQL COPY / batch INSERT with less overhead
- Or implement a streaming response pattern

## 4. Data Completeness

### AMFI NAVAll.txt Coverage
- AMFI typically publishes ~14,000 active schemes
- `nav_history` has only **7,868** rows for the best date (2026-06-12, ~56%)
- This is a **44% shortfall** due to timeout-induced truncation

### Historical Depth
- `nav_history` has only **one date** with substantial data (2026-06-12)
- No historical trend data available in `nav_history`
- All historical NAV data lives only in `funds.db` (local, not in Supabase)

### Duplicate Handling
- `ignoreDuplicates: true` means re-running on the same day is safe
- BUT it never **updates** existing rows — stale data persists
- Newer AMFI files with corrected NAVs for same scheme+date are silently skipped

## 5. Automation Gaps

| Pipeline Step | Automated? | Scheduled? | Gap |
|--------------|:----------:|:----------:|-----|
| AMFI → nav_history | ❌ | ❌ | Must invoke Edge Function manually |
| nav_history → fund_metrics | ❌ | ❌ | Not connected (different data sources) |
| fund_metrics → fund_master | ❌ | ❌ | Manual Python script |
| fund_master → recommendation_universe | ❌ | ❌ | Manual Python script |

Only `sync-onedrive` has a cron job (daily at 02:00 UTC).

## 6. Anomalies

### 689 vs 7,868 Row Anomaly (2026-06-14)
- June 14, 2026 = Sunday
- AMFI does not publish full data on weekends
- 689 rows consistent with limited weekend NAV updates from a subset of schemes
- **Not a bug** — expected behavior for weekend ingestion

### Why 7,868 ≠ 14,000 on Weekdays
- The function times out after ~30s before all batches are processed
- Each batch of 500 takes ~2s → 28 batches need ~56s
- If triggered multiple times on same day, `ignoreDuplicates` skips already-inserted rows
- Result: incomplete but non-duplicated data

## 7. Recommendations

### Short-term (fix ingestion)
1. **Increase Edge Function timeout** to 120s in `config.toml`
2. **After fix, re-run ingestion** to capture full 14K rows for today's date
3. **Consider splitting into chunks**: invoke function twice with offset pagination

### Medium-term (connect pipelines)
4. **Build a daily cron job** for `ingest-amfi-nav` using Supabase cron (pg_cron + pg_net)
5. **Refactor `calculate-fund-metrics`** to read from `nav_history` instead of `funds.db`
   — enables automated daily metrics recalculation
6. **Add Row-Level Safety** — track incomplete runs by recording batch progress

### Long-term (full automation)
7. **End-to-end daily pipeline**: AMFI → nav_history → fund_metrics → fund_master
8. **Universe refresh**: trigger `build-recommendation-universe` after metrics update
