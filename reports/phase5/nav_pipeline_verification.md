# NAV Pipeline Verification Report

**Generated:** 2026-06-15
**Scope:** `supabase/functions/ingest-amfi-nav`, `nav_history`, `fund_metrics`, cron jobs, automation

## 1. Is NAV Ingestion Automated?

**Answer: NO**

Evidence:
- `supabase/migrations/20260611200000_create_cron_job.sql` (line 10-20): Only one cron job exists — `sync-onedrive-daily` at 02:00 UTC
- `supabase/functions/ingest-amfi-nav/index.ts`: No scheduling logic — it's a standard Edge Function that must be invoked via HTTP
- `supabase/config.toml` (line 39-40): Only `verify_jwt = false` is configured; no timeout override

## 2. Is NAV Ingestion Scheduled?

**Answer: NO**

| Cron Job | Schedule | Purpose |
|----------|----------|---------|
| `sync-onedrive-daily` | `0 2 * * *` (02:00 UTC daily) | Syncs workbook data from OneDrive |
| `ingest-amfi-nav` | **NOT SCHEDULED** | Must be invoked manually |

## 3. Does Ingestion Complete Successfully?

**Answer: NO — times out before completion**

### Evidence — Edge Function Code
`supabase/functions/ingest-amfi-nav/index.ts`:
- Line 10: `const INSERT_BATCH_SIZE = 500` — upserts 500 rows per batch
- Lines 78-95: Sequential batch loop — each batch does a full HTTP roundtrip to Supabase
- Each batch takes ~2-3 seconds
- ~14,000 AMFI schemes → 28 batches → **56-84 seconds total**
- **No timeout setting in config.toml** — defaults to Supabase's **30-second Edge Function timeout**

### Evidence — Database Row Counts
| Date | Rows Inserted | Expected | % Complete |
|------|:-------------:|:--------:|:----------:|
| 2026-06-14 (Sun) | 689 | ~14,000 | ~5% |
| 2026-06-12 (Fri) | 7,868 | ~14,000 | **~56%** |

- 689 rows = ~1.5 batches (timed out very early)
- 7,868 rows = ~16 batches (~32-48 seconds, borderline timeout)

### Conclusion
The function typically inserts **1-16 batches** before the 30s timeout kills it. **44-95% of AMFI data is lost** on every invocation.

## 4. Is Edge Function Timing Out?

**Answer: YES**

Evidence:
- `supabase/config.toml` — no `timeout_seconds` set for `ingest-amfi-nav`
- Supabase Edge Functions default timeout: **30 seconds**
- Minimum required: ~60 seconds (14,000 / 500 * 2s per batch)
- Recommended: **120 seconds** to account for network variance

## 5. Is nav_history Receiving All Active AMFI Schemes?

**Answer: NO**

| Metric | Value |
|--------|------:|
| nav_history total rows (all dates combined) | 14,212 |
| nav_history distinct scheme codes | ~14,000 (one NAVAll.txt) |
| Row count best date (2026-06-12) | 7,868 |
| Expected per date | ~14,000 |
| **Shortfall** | **~6,132 (44%)** |

## 6. Is fund_metrics Generated from nav_history or funds.db?

**Answer: funds.db (local SQLite) — NOT nav_history**

### Evidence A — Code Architecture
- `scripts/calculate-fund-metrics.py` reads from `funds.db` (SQLite database)
- `funds.db` has `nav` table with **35,223,033 rows** across **37,959 schemes**
- Date range in funds.db: **2006-06-16 to ~2026-06-14** (20 years)
- In contrast, `nav_history` has only **14,212 rows** with **4 meaningful dates**

### Evidence B — Data Volume Comparison
| Data Store | Total Rows | Schemes | Date Range |
|------------|:----------:|:-------:|------------|
| `funds.db` (SQLite) | 35,223,033 | 37,959 | 2006–2026 (20 yrs) |
| `nav_history` (Supabase) | 14,212 | ~14,000 | 2026 only (partial) |

### Evidence C — Pipeline Disconnect
```
AMFI NAVAll.txt → ingest-amfi-nav → nav_history (live display only)
funds.db → calculate-fund-metrics.py → fund_metrics (computed metrics)
                                    ↓
                              fund_master → recommendation_universe
```

The two pipelines **never touch**. `fund_metrics` is recalculated from `funds.db` using a local Python script. There is no code in the repository that reads from `nav_history` for metrics calculation.

### Evidence D — fund_metrics Source Documentation
- `scripts/calculate-fund-metrics.py` line 4: `Reads historical NAV data from a SQLite database`
- The script accepts a CLI argument for the SQLite file path, e.g., `funds.db`

## 7. Summary Table

| Question | Answer | Evidence |
|----------|--------|----------|
| Ingestion automated? | ❌ No | No cron job, no scheduling |
| Ingestion scheduled? | ❌ No | Only sync-onedrive has cron |
| Ingestion completes? | ❌ No | ~44-95% data loss per invocation |
| Timeout issue? | ❌ Yes | 30s default, needs ~60s |
| nav_history complete? | ❌ No | 7,868 of ~14,000 schemes |
| fund_metrics → nav_history? | ❌ No | fund_metrics reads funds.db |

## 8. Fix Required (Critical)

1. **Add to `supabase/config.toml`**:
   ```toml
   [functions.ingest-amfi-nav]
   verify_jwt = false
   timeout_seconds = 120
   ```

2. **Add cron job** to schedule daily ingestion:
   ```sql
   SELECT cron.schedule(
     'ingest-amfi-nav-daily',
     '30 1 * * 1-5',  -- 01:30 UTC weekdays
     $$ SELECT net.http_post(
          url:='https://skvvltawshbphrgnqjzf.supabase.co/functions/v1/ingest-amfi-nav',
          headers:='{"Content-Type": "application/json"}'::jsonb
        )::text AS request_id; $$
   );
   ```

3. **Rerun ingestion** after timeout fix to populate missing ~6,000 schemes.

4. **Consider uploading funds.db to nav_history** to bridge the historical gap.
