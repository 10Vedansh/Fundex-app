# Pre-Phase 6 Readiness Audit

**Generated:** 2026-06-15
**Scope:** Readiness assessment for Phase 6 (automated daily pipeline + universe refresh)

## 1. Automated Refresh — Current State

### Can the universe refresh itself today?

| Component | Auto-refresh | Reason |
|-----------|:----------:|--------|
| nav_history | ❌ | 30s timeout truncates ingestion; no cron job |
| fund_metrics | ❌ | Reads from local funds.db (not nav_history) |
| fund_master | ❌ | Manual Python script |
| recommendation_universe | ❌ | Manual Python script |

**Answer: No.** Zero automation. Every step requires manual invocation.

### What would it take to make it auto-refresh?

| Step | Dependency | Est. Effort |
|------|-----------|:-----------:|
| Fix ingestion timeout | Increase Edge Function timeout in config.toml | 15 min |
| Schedule cron for ingestion | pg_cron + pg_net HTTP call | 30 min |
| Migrate metrics to nav_history | Rewrite calculate-fund-metrics to read from Supabase instead of funds.db | 2-3 days |
| Add AI-powered fund_master matching | Build incremental matching for new schemes | 1-2 days |
| Add universe rebuild cron | Trigger build-recommendation-universe as a Supabase Edge Function | 2-3 days |

## 2. Critical Blockers

### Blocker 1: `ingest-amfi-nav` timeout
- **Severity:** HIGH
- **Impact:** Only 56% of AMFI data ingested (7,868 of ~14,000 schemes)
- **Fix:** `supabase/config.toml` — increase Edge Function timeout from default 30s to 120s

### Blocker 2: `fund_metrics` disconnected from `nav_history`
- **Severity:** HIGH
- **Impact:** fund_metrics cannot be recalculated from Supabase data alone
- **Fix:** Rewrite calculator to source from `nav_history` or build a pipeline to upload `funds.db` to `nav_history`

### Blocker 3: No automated matching for new funds
- **Severity:** MEDIUM
- **Impact:** New AMFI schemes won't appear in fund_master
- **Fix:** Build incremental matching logic

### Blocker 4: No cron infrastructure for Python scripts
- **Severity:** MEDIUM
- **Impact:** build-fund-master.py and build-recommendation-universe.py are local scripts
- **Fix:** Port critical scripts to Edge Functions or use GitHub Actions with scheduled triggers

## 3. Recommendation Universe Health

### Current State
| Metric | Value |
|--------|------:|
| Total rows | 8,095 |
| Dedup method | Canonical fund key (scheme name suffix stripping) |
| Plan prioritization | Direct > Regular > Institutional > Others |
| Dividend variant handling | Growth > IDCW > Dividend > Payout > Bonus |

### Coverage in Universe
| Field | Coverage | Notes |
|-------|:--------:|-------|
| scheme_name | 8,095 (100%) | All universe funds have names |
| fund_manager | 1,352 (16.7%) | From AMFI names only |
| expense_ratio | 1,326 (16.4%) | From workbook match only |
| aum | 1,327 (16.4%) | From workbook match only |
| category | 8,095 (100%) | All have canonical category |
| cagr_3y | ~4,500 (56%) | Sufficient for scoring engine |
| sharpe_ratio_3y | ~4,500 (56%) | Sufficient for risk-adjusted scoring |

### What would break if we refreshed today?
- All 8,095 rows would be re-inserted (upsert by scheme_code)
- Existing expense_ratio/aum/fund_manager values from Phase 5.4B would be **preserved** (same scheme_code)
- No data loss on refresh — **safe to rebuild**

## 4. Dependency Map

```
     ┌─────────────┐
     │  AMFI India  │
     └──────┬──────┘
            │ HTTP GET
            ▼
     ┌─────────────┐     timeout → 56% ingestion
     │ nav_history │
     └──────┬──────┘
            │ (disconnected)
            ▼
     ┌─────────────┐     reads from local funds.db
     │ fund_metrics│     33,969 rows, 35.2M NAV points
     └──────┬──────┘
            │ scheme_code
            ▼
     ┌─────────────┐     4-tier matching for workbook enrichment
     │ fund_master │     33,978 rows
     └──────┬──────┘
            │
            ├──────────────────┐
            ▼                  ▼
     ┌──────────────┐  ┌──────────────────┐
     │fund_master   │  │recommendation    │
     │_enriched view│  │_universe (8,095) │
     └──────────────┘  └──────────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │Scoring Engine│
                          │(intersection │
                          │Engine.ts)    │
                          └──────────────┘
```

## 5. Phase 6 Recommendations

### Build the automated daily pipeline

```
Phase 6.1 — Fix ingestion (HIGH priority)
  - Increase Edge Function timeout → 120s
  - Add cron job for daily AMFI fetch
  - Verify full 14K row ingestion

Phase 6.2 — Connect nav_history to fund_metrics (HIGH priority)
  - Option A: Upload funds.db to Supabase (bulk historical load)
  - Option B: Rewrite calculator to query nav_history directly
  - Recommended: Option A (quick win) + Option B (long-term)

Phase 6.3 — Incremental fund_master matching (MEDIUM priority)
  - New AMFI schemes → auto-match with workbook
  - Unmatched schemes → add as metrics-only entries

Phase 6.4 — Automated universe rebuild (MEDIUM priority)
  - Schedule weekly rebuild after metrics recalculation
  - Deploy build-recommendation-universe as Edge Function
  - Or use GitHub Actions with Supabase CLI

Phase 6.5 — Monitoring & alerting (LOW priority)
  - Track ingestion completeness (% of expected rows)
  - Alert on pipeline failures
  - Dashboard for data freshness
```

## 6. Timeline Estimate for Full Automation

| Phase | Tasks | Est. Duration |
|:-----:|-------|:------------:|
| 6.1 | Fix timeout + cron | 1 day |
| 6.2 | Connect nav_history ↔ fund_metrics | 3-5 days |
| 6.3 | Incremental matching | 2-3 days |
| 6.4 | Universe rebuild automation | 2-3 days |
| 6.5 | Monitoring | 1-2 days |
| **Total** | | **9-14 days** |

## 7. Readiness Score: 4/10

| Criterion | Score (/10) | Notes |
|-----------|:-----------:|-------|
| Data completeness | 4 | nav_history ~56%, fund_metrics 100%, universe 100% |
| Automation coverage | 0 | Zero automated pipeline steps |
| Schema stability | 8 | All migrations applied, no pending schema changes |
| Refresh safety | 9 | Upsert by scheme_code — no data loss on refresh |
| Monitoring | 0 | No monitoring, no alerting |
| Documentation | 6 | Pipeline docs exist in reports but no runbooks |
| **Composite** | **4/10** | **Major automation gaps exist** |

## 8. Quick Wins (do this week)

1. **Fix timeout** (`supabase/config.toml` — set `timeout_seconds = 120`)
2. **Re-run ingestion** after timeout fix → get full 14K rows
3. **Upload funds.db to Supabase** → migrate historical NAV data to `nav_history`
4. **Add cron job** for daily AMFI ingestion (pg_cron)
5. **Run build-recommendation-universe.py** to refresh universe (already done — 8,095 rows)

Steps 1-4 would move readiness from **4/10 → 7/10**.
