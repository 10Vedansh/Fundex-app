# Recommendation Universe Population Audit

**Generated:** 2026-06-15
**Audit script:** `scripts/audit_universe.py`

## Current State

| Check | Result |
|-------|:------:|
| Table `recommendation_universe` exists | ✅ **YES** |
| Rows in table | **0** |
| Migration SQL valid | ✅ YES (`CREATE TABLE` present) |
| Script `build-recommendation-universe.py` ran | ✅ YES |
| Upsert attempted | ❌ **NO** |

## Root Cause

The table was created **after** the script ran, so the upsert was skipped.

### Timeline

1. **Script run** → `ensure_table_exists()` checks for the table → returns `False`
2. `TABLE_EXISTS` set to `False`
3. `upsert_universe(8095 rows)` → checks `if not TABLE_EXISTS` → **early return without writing**
4. Message printed: *"Skipping upsert: table recommendation_universe does not exist"*
5. **Later** → migration SQL was executed (manually or via `npx supabase migration up`)
6. **Now** → table exists but still has 0 rows because the script was never re-run

### Code Path

```
main()
  -> ensure_table_exists()
       -> sup.from_("recommendation_universe").select().limit(1).execute()
       -> APIError: "Could not find table 'public.recommendation_universe'"
       -> tried REST API fallback -> failed (404)
       -> returned False
  -> TABLE_EXISTS = False
  -> load_fund_master()  -> 33,978 rows loaded
  -> load_fund_metrics() -> 33,969 metrics loaded
  -> classify_rows()     -> 11,272 kept, 22,706 removed
  -> deduplicate()       -> 8,095 unique, 3,177 removed
  -> upsert_universe(8095)
       -> if not TABLE_EXISTS:  # True!
       -> print("Skipping upsert...")
       -> return  # NO DATABASE WRITES
  -> verify_universe()   -> from in-memory data (0 from DB)
  -> generate reports    -> reports use in-memory data correctly
```

## What Was Written vs What Wasn't

| Data | Written to DB? |
|------|:------------:|
| 22,706 filtered-out rows (exclusions) | No — intentionally not stored |
| 3,177 deduplicated variants | No — intentionally not stored |
| **8,095 universe rows** | **No — should have been upserted** |
| Reports on disk | ✅ YES — 3 reports generated correctly |

## Resolution

Re-run the script. The table now exists, so `ensure_table_exists()` will return `True`, and the upsert will execute:

```
SUPABASE_SERVICE_ROLE_KEY=... python scripts/build-recommendation-universe.py
```

This will:
1. Re-process all 33,978 fund_master rows (same filters, same dedup)
2. Upsert 8,095 rows into `recommendation_universe`
3. Generate updated reports

No data changes are needed — the script is idempotent and will produce the same 8,095-row universe.

## Safety

No existing data is at risk. The table is empty. Re-running the script is purely additive.
