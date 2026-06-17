# CIFRAA Production-Readiness Audit

**Date:** 2026-06-17  
**Auditor:** Automated codebase + database analysis  
**Branch:** Development branch (unmerged)  
**Production URL:** https://cifraa.in  
**Supabase Project:** skvvltawshbphrgnqjzf  

---

## PART 1 — SITE-WIDE DATA SOURCE AUDIT

### Page Dependency Map

```
Pages                Components               Data Source (Hook)          Edge Function / SQL       DB Table/View             Row Count
──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/ (Landing)          Landing components       None (static)               None                       None                      —
/auth                AuthBackground, etc.     useAuth                      auth.signInWithPassword()  auth.users, profiles      1 profile
/reset-password      (form)                   useAuth                      auth.resetPasswordFor()    auth.users                —
/onboarding          Questionnaire forms      useAuth (profiles.update)   None                       profiles                  —
/dashboard           Index.tsx                useFundCache()               fetch-fund-data?source=    fund_master_enriched      33,978 view
                                              useFundMetrics()             master&per_page=4000       fund_metrics              (4,000 returned)
                                                                           supabase.from("fund_       fund_metrics              33,969 rows
                                                                           metrics").select("*")
                                              useWatchlist()              supabase.from("watchlist") watchlist                  0 rows
                                              usePortfolio()              supabase.from("portfolio") portfolio                  0 rows
                                              useCamsHoldings()           supabase.from("portfolio_   portfolio_holdings         1 row
                                                                           holdings")
                                              RecommendationEngine         recommendFundsV2(funds)     (in-memory, funds from    4,000 funds in
                                                                           → scoringEngineV3           fund_master_enriched)      memory
/search              Search.tsx               useFundCache()               Same as dashboard          fund_master_enriched      4,000 returned
/sectors             (sectorDataGenerator)    getCachedSectorData()       Local file / hardcoded      None                      Static
/watchlist           (watchlist in Index)     useWatchlist()              supabase.from("watchlist") watchlist                  0 rows
/portfolio           PortfolioAnalytics, etc. usePortfolio()               supabase.from("portfolio") portfolio                  0 rows
/build               BuildPortfolio           (portfolio hooks)           Same as portfolio           portfolio                 —
/ai                  AIChat                   supabase.functions.invoke   generate-insights           None (AI API)             —
                                              (internally uses funds)     (uses funds from            fund_master_enriched      —
                                                                           useFundCache internally)
/news                News.tsx                 supabase.functions.invoke   fetch-news (GNews API)      None (external API)       —
/founders            Founders.tsx             None (static)               None                        None                      —
/legal/*             Legal modal components   None (static)               None                        None                      —
```

### Critical Finding: Dual Data Sources

The application has TWO separate fund datasets with NO synchronization:

| Dataset | Rows | expense_ratio | aum | fund_manager | Used By |
|---------|------|---------------|-----|--------------|---------|
| `fund_master_enriched` (→ frontend) | 33,978 (4,000 returned) | 1,759 (5.2%) | 1,767 (5.2%) | 1,805 (5.3%) | Dashboard, All Funds, Search, Recommendation Engine |
| `fund_metrics` (→ direct query) | 33,969 | 0 (0%) | 0 (0%) | N/A | useFundMetrics hook (top performers, stats) |
| `recommendation_universe` (→ VR enriched) | 8,095 | 5,883 (72.7%) | 5,941 (73.4%) | 8,095 (100%) | **NOT used by frontend** |

---

## PART 2 — ENRICHMENT VERIFICATION

### Where Enriched Values Are Displayed

| Component/Screen | Field | Source Table | Coverage | Actually Uses Enriched Values? |
|---|---|---|---|---|
| FundCard (dashboard) | expenseRatio | fund_master_enriched (`fm.expense_ratio`) | 5.2% | **NO** — reads fund_master, not recommendation_universe |
| FundCard (dashboard) | aum | fund_master_enriched (`fm.aum`) | 5.2% | **NO** |
| FundCard (dashboard) | fundManager | fund_master_enriched (`fm.fund_manager`) | 5.3% | **NO** |
| FundCard (dashboard) | nav | fund_master_enriched → fund_metrics OR AMFI lookup | varies | Partial |
| AllFundsTab → Fees section | expenseRatio | fund_master_enriched | 5.2% | **NO** |
| AllFundsTab → Fees section | fundManager | fund_master_enriched | 5.3% | **NO** |
| AllFundsTab → Overview section | aum | fund_master_enriched | 5.2% | **NO** |
| FundDetailModal | All metrics | fund_master_enriched | mixed | Partial |
| Search.tsx | expenseRatio | fund_master_enriched | 5.2% | **NO** |

### Where Enrichment Is NOT Visible (CRITICAL)

1. **Dashboard FundCards** — shows "NA" for expense ratio and AUM on 95% of funds
2. **All Funds table** — "Expense" and "AUM" columns show "NA" for 95% of funds
3. **Fund Detail** — expense ratio and AUM missing for 95% of funds
4. **Recommendation scoring** — expense weight (5-10%) uses neutral 0.5 for 95% of funds
5. **Fund Manager field** — not displayed in FundCard; hidden column in AllFunds Fees tab
6. **Search results** — expense ratio shown but "NA" for 95%

The VR enrichment pipeline successfully enriched `recommendation_universe` (72.7% ER/AUM, 100% FM) but this data is **completely invisible to the frontend** because it reads from `fund_master_enriched` (which joins `fund_master` + `fund_metrics`, where only ~5% have these fields populated).

---

## PART 3 — ALL FUNDS PAGE AUDIT

### Findings

| Question | Answer |
|----------|--------|
| Is the page intentionally limited? | **Yes, by accident.** The `useFundCache()` hook calls `fetchFundMasterFunds({perPage: 4000})`. |
| Is there a SQL LIMIT? | **Yes** — `perPage: 4000` → Edge Function uses `range(0, 3999)` on `fund_master_enriched` (33,978 rows). Only 4,000 of 33,978 funds are returned. |
| Is there pagination? | **Not real pagination.** The AllFundsTab does client-side pagination: starts at 15, loads 20 more per click. But all data is pre-loaded into an array. |
| Is there frontend filtering? | Yes — by asset class, sub-category, search text, and sort. |
| Is it reading an older dataset? | **Yes** — it reads `fund_master_enriched` (workbook data) instead of `recommendation_universe` (VR-enriched). |
| Can it access all 8,095 funds? | No — limited to 4,000 from the `perPage` param. |

### Exact Query Chain

```
AllFundsTab(funds)  ←  Index.tsx funds  ←  useFundCache()  ←  fetchFundMasterFunds({perPage: 4000})
    ↓
Edge Function: supabase/functions/fetch-fund-data/index.ts
    ↓
supabase.from("fund_master_enriched").select("*", { count: "exact" })
    .range(0, 3999)
    ↓
fund_master fm LEFT JOIN fund_metrics f ON fm.scheme_code = f.scheme_code
    WHERE fm.match_method IS DISTINCT FROM 'unmatched'
```

### Why Users See ~1,000 Funds

`fund_master_enriched` returns 33,978 rows total. With `perPage=4000`, it returns the first 4,000 sorted by `scheme_code` (default sort). After frontend filtering by categories, asset classes, and sub-categories, users typically see ~800-1,200 visible funds.

---

## PART 4 — RECOMMENDATION ENGINE AUDIT

### Data Lineage

```
recommendFundsV2(funds, prefs)
    │
    ├── Input: `funds: MutualFund[]` (from useFundCache → fund_master_enriched)
    │
    ├── Eligibility Engine (intersectionEngine.ts)
    │   applyRiskConstraints()    → uses: fund.category, fund.volatility
    │   applyGoalEligibility()    → uses: fund.category, fund.sharpeRatio, fund.ret3Y
    │   applyHorizonRules()       → uses: fund.category
    │   applyExperienceFilter()   → uses: fund.category
    │   applyAmountConstraints()  → uses: fund.aum, fund.expenseRatio
    │
    ├── Scoring Engine V3 (scoringEngineV3.ts)
    │   sortinoScore       (weight 15-40%)  → fund.sortinoRatio (or approximated from sharpe)
    │   cagrRelative       (weight 10-30%)  → fund.ret3Y / fund.cagr3Y
    │   consistency        (weight 15-20%)  → multi-period returns
    │   sharpe             (weight 10-15%)  → fund.sharpeRatio
    │   volatility         (weight 5-15%)   → fund.volatility / fund.stdDev
    │   expense            (weight 5-10%)   → fund.expenseRatio  ← 95% NULL → neutral 0.5
    │   aum                (weight 0-5%)    → fund.aum            ← 95% NULL → neutral 0.5
    │   diversification    (weight 0-5%)    → category code
    │
    ├── Diversification Engine
    │   → allocation model based on risk tolerance + goal
    │   → max 2 funds per AMC, max 3 ETFs, bucket limits
    │
    └── Output: ScoredFund[] with compositeScore, reasons, confidence
```

### Impact of Missing Enriched Fields

| Factor | Current Impact | With VR Enrichment Propagated |
|--------|---------------|------------------------------|
| expense weight (5-10%) | Neutral 0.5 for 95% → no differentiation | Real expense comparison → 0.05-0.10 boost for low-ER funds |
| aum weight (0-5%) | Neutral 0.5 for 95% → no differentiation | Real AUM comparison → bonus for large funds |
| Completeness penalty | -5% for missing expense → *applied to 95%* | Reduced to only truly missing cases |
| "Low expense" reason | Never generated | Generated for 72.7% of funds |
| "Large fund" reason | Generated for ~5% with AUM | Generated for 73.4% |
| Overall ranking | 95% of funds scored with incomplete data | 72.7% scored with complete data |

### Scores NOT Affected (Already Working)

- Sortino, Sharpe, CAGR, volatility — all from `fund_metrics` via `fund_master_enriched`, already populated for matched funds
- These components dominate the score (65-80% combined weight)

---

## PART 5 — DATA FRESHNESS AUDIT

| Dataset | Latest Update | NAV Date | Days Stale | Source | Staleness Risk |
|---------|--------------|----------|------------|--------|---------------|
| `nav_history` | 2026-06-17 | 2026-06-16 | 1 day | AMFI NAVAll.txt | **LOW** — daily cycle |
| `fund_metrics` | 2026-06-15 11:41 UTC | N/A (calculated) | 2 days | Calculated from nav_history | **LOW** |
| `fund_master` | 2026-06-15 11:30 UTC | N/A | 2 days | Workbook import | **LOW** |
| `fund_master_enriched` | 2026-06-15 11:41 UTC | N/A | 2 days | View (fund_master + fund_metrics) | **LOW** |
| `recommendation_universe` | 2026-06-15 (est.) | N/A | 2 days | VR + fund_metrics + fund_master | **LOW** |

### Value Research Data Freshness

Per the Phase 5 freshness report:
- AUM & expense_ratio: as of **31 May 2026** (17 days stale — normal monthly cycle)
- Consistency scores: as of **15-16 June 2026** (0-1 day stale)
- Portfolio data: as of **31 May 2026** (17 days stale)

**Verdict:** Acceptable. VR is updated once per month. The 17-day lag is within the normal AMFI/VR data cycle.

---

## PART 6 — NAV PIPELINE AUDIT

### Current State

```
AMFI NAVAll.txt (https://www.amfiindia.com/spages/NAVAll.txt)
    │
    │  Edge Function: ingest-amfi-nav (HTTP invoke, no cron)
    │  Batch upsert, 500 per batch, ignoreDuplicates
    │
    ▼
nav_history (22,813 rows, latest: 2026-06-16)
    │
    │  fund_metrics calculation script (calculate-fund-metrics.py)
    │  Run manually on 2026-06-15
    │
    ▼
fund_metrics (33,969 rows, last_calculated: 2026-06-15)
    │
    │  fund_master_enriched VIEW (joins fund_master + fund_metrics)
    │  Automatically up-to-date via view
    │
    ▼
fund_master_enriched (33,978 rows, always live)
    │
    │  fetch-fund-data Edge Function (source=master)
    │  Called by useFundCache hook
    │
    ▼
Dashboard, All Funds, Search, Recommendation Engine
```

### Gaps

1. **Today's NAV (2026-06-17) NOT ingested** — no cron job; manual invocation via the session's Python script only
2. **fund_metrics NOT recalculated** — last calculated 2026-06-15; needs recalculation after each NAV run
3. **recommendation_universe NOT refreshed from NAV pipeline** — statically enriched; no automated refresh
4. **fund_master NOT updated from recommendation_universe** — enrichment gap; VR data lives in recommendation_universe but frontend reads fund_master

### Recommended Pipeline

```
AMFI NAVAll.txt
    │
    │  [AUTOMATED] Cron job → ingest-amfi-nav Edge Function (daily at 06:00 UTC)
    │
    ▼
nav_history
    │
    │  [AUTOMATED] SQL function or cron → recalculate fund_metrics (daily at 07:00 UTC)
    │
    ▼
fund_metrics
    │
    │  [SEMI-AUTOMATED] fund_master_enriched view → always current
    │
    ▼
fund_master_enriched
    │
    │  [AUTOMATED] Frontend reads via Edge Function (paginated, filtered)
    │
    ▼
Users
```

---

## PART 7 — AUTOMATION AUDIT

| Process | Current Status | Trigger | Schedule | Runtime | Failure Handling |
|---------|---------------|---------|----------|---------|-----------------|
| **A. Daily NAV ingestion** | **MANUAL** | None | None | ~10s | None |
| **B. fund_metrics recalculation** | **MANUAL** | None | None | Unknown | None |
| **C. recommendation_universe refresh** | **MANUAL** | None | Once (static) | ~30s | None |
| **D. Enrichment refresh (VR)** | **MANUAL** | Python script | Once (static) | Hours | Checkpointing |
| **E. Cache refresh (workbook)** | **AUTOMATED** | pg_cron daily 02:00 UTC | Daily | Unknown | None |

### Automation Design Needed

**A. Daily NAV Ingestion Automation:**
```sql
-- Add pg_cron job for ingest-amfi-nav
SELECT cron.schedule(
  'ingest-amfi-nav-daily',
  '0 6 * * *',  -- Daily at 06:00 UTC (11:30 IST)
  $$
  SELECT net.http_post(
    url:='https://skvvltawshbphrgnqjzf.supabase.co/functions/v1/ingest-amfi-nav',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <service-role-key>"}'::jsonb
  ) AS request_id;
  $$
);
```
This uses pg_cron (already enabled) + pg_net (already enabled). The service role key needs to be passed as a secret or via a function that reads it internally (the Edge Function already reads it from env).

**B. fund_metrics Recalculation Automation:**
```sql
SELECT cron.schedule(
  'recalculate-fund-metrics',
  '0 7 * * *',  -- Daily at 07:00 UTC, after NAV ingestion
  $$
  SELECT net.http_post(
    url:='https://skvvltawshbphrgnqjzf.supabase.co/rest/v1/rpc/calculate_fund_metrics',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <service-role-key>"}'::jsonb
  ) AS request_id;
  $$
);
```
Requires creating an RPC `calculate_fund_metrics` that runs the metric calculation logic.

**C & D.** These are run-once per data refresh cycle. No daily automation needed.

---

## PART 8 — PRODUCTION VS BRANCH AUDIT

### Git State

Git not available in the environment. Based on file exploration:

| Feature | Live in Production? | On Dev Branch? | Database Changes Live? |
|---------|-------------------|----------------|----------------------|
| fund_master table | **YES** | **YES** | YES (migration deployed) |
| fund_metrics table | **YES** | **YES** | YES (migration deployed) |
| fund_master_enriched view | **YES** | **YES** | YES (migration deployed) |
| nav_history table | **YES** | **YES** | YES (migration deployed) |
| recommendation_universe table | **YES** | **YES** | YES (migration deployed) |
| VR enrichment data (in recommendation_universe) | **YES** | **YES** | YES (data written to DB) |
| AMC corruption workaround (derive_clean_amc) | **NO** | **YES** | PARTIAL (fund_master amc still corrupt) |
| AMFI ingest function (updated) | **YES** | **YES** | YES (same version) |
| Recommendation engine V3 | **YES** | **YES** | YES (client-side code) |
| Auth config (broken) | **YES** | **YES** | YES (pushed to production) |

### What Users Currently See on cifraa.in

Users accessing cifraa.in see:
- Dashboard with fund cards showing expense ratio and AUM as "NA" for 95% of funds
- All Funds page with ~4,000 funds (filtered to ~1,000 usable)
- Recommendation engine scoring with neutral expense/AUM scores
- Enriched VR data NOT visible (sits in recommendation_universe table)

### What Is Branch-Only (Not in Production)

- The AMC corruption workaround in the enrichment scripts (`derive_clean_amc`)
- Updated enrichment pipeline scripts
- All reports in `reports/` directory

---

## PART 9 — AUTH CONFIG AUDIT

### Current Auth Configuration (as pushed to production)

| Setting | Current Value | Expected Value | Issue |
|---------|--------------|---------------|-------|
| Site URL | `http://127.0.0.1:3000` | `https://cifraa.in` | **CRITICAL** — points to localhost |
| Additional redirect URLs | `["https://127.0.0.1:3000"]` | `["https://cifraa.in"]` | **CRITICAL** |
| MFA enrollment | **DISABLED** | Should be enabled | **HIGH** |
| MFA verification | **DISABLED** | Should be enabled | **HIGH** |
| Email confirmations | **DISABLED** | Should be enabled | **HIGH** |
| OTP length | 6 digits | Should be 8 digits | **MEDIUM** |
| Rate limit (OTP) | 1s | Should be 1m0s | **MEDIUM** |
| Refresh token rotation | Disabled | Should be enabled | **HIGH** |
| JWT expiry | 3600s (1 hr) | OK | OK |

### Auth Config Root Cause

The `supabase config push` command applied local development `config.toml` settings to production, overriding:
- `site_url` from `http://localhost:3000` → `http://127.0.0.1:3000` (from local default)
- MFA settings from enabled → disabled
- Email confirmation from enabled → disabled
- Rate limiting from 1m0s → 1s
- OTP length from 8 → 6

### Fix Required

Go to Supabase Dashboard → Authentication → Settings and restore:
1. Site URL: `https://cifraa.in`
2. Additional redirect URLs: `["https://cifraa.in"]`
3. Enable MFA (TOTP)
4. Enable email confirmations
5. Set OTP length to 8
6. Set rate limit back to 1m0s

---

## PART 10 — FINAL READINESS REPORT

### What Is Working

| Component | Status | Details |
|-----------|--------|---------|
| User authentication (login/signup) | ✅ | Email + OTP + PIN |
| User profiles & onboarding | ✅ | Questionnaire, risk profiling |
| Dashboard rendering | ✅ | Fund cards, watches, portfolio |
| Fund search | ✅ | Text + category + AMC filtering |
| NAV history ingestion | ✅ | ~10s runtime, ignoreDuplicates |
| fund_metrics (returns, risk, Sharpe) | ✅ | 33,969 funds calculated |
| Recommendation engine V3 | ✅ | Multi-factor scoring, diversification |
| News feed | ✅ | GNews API with fallback |
| AI chat | ✅ | Gemini 3 Flash via Lovable |
| CAMS portfolio upload | ✅ | Statement parsing |
| Watchlist & Portfolio CRUD | ✅ | RLS protected |

### What Is Partially Working

| Component | Status | Details |
|-----------|--------|---------|
| AUM display | ⚠️ 5.2% populated | fund_master has only 1,767 of 33,978 rows with AUM |
| Expense ratio display | ⚠️ 5.2% populated | fund_master has only 1,759 of 33,978 rows with ER |
| Fund manager display | ⚠️ 5.3% populated | fund_master has only 1,805 of 33,978 rows with FM |
| All Funds page | ⚠️ Limited to 4,000 | perPage=4000 truncates fund_master_enriched (33,978 rows) |
| Recommendation scoring | ⚠️ Incomplete data | expense_ratio null for 95% → neutral score component |
| fund_metrics (expense_ratio, net_assets) | ⚠️ 0 populated | Calculated columns but never filled |

### What Is Broken

| Component | Status | Details |
|-----------|--------|---------|
| Auth configuration | **🔴 BROKEN** | Site URL points to localhost; MFA, email confirmation, rate limiting all wrong |
| VR enrichment → frontend gap | **🔴 BROKEN** | 72.7% ER/AUM enrichment in recommendation_universe is invisible to frontend |
| AMC data in fund_master | **🔴 PARTIALLY CORRUPT** | 27.1% of recommendation_universe AMCs corrupted; fund_master AMC quality unknown |
| No daily NAV cron | **🔴 MISSING** | NAV ingestion only works when manually invoked |

### What Is Manual

- NAV ingestion (no cron)
- fund_metrics recalculation (no cron)
- VR enrichment (one-time script)
- Workbook data sync (has cron but one-time-per-day)

### What Is Automated

- Workbook sync-from-storage: Daily 02:00 UTC via `sync-onedrive` Edge Function
- Auth (signup, login, password reset)
- Profile creation on signup (trigger function)

### What Is Branch-Only (Not Merged)

- AMC corruption workaround scripts
- Enriched data in `recommendation_universe` (data is in DB but not usable by frontend)
- Reports (amc_corruption_root_cause.md, vr_data_freshness_report.md)

### What Is Production-Ready

- Core auth flow
- Fund metrics (returns, risk, Sharpe)
- NAV engine (with manual invocation)
- Watchlist & Portfolio
- CAMS upload
- News feed
- AI chat
- UI/UX

### Scores

| Metric | Score | Explanation |
|--------|-------|-------------|
| **Data Freshness Score** | **75/100** | NAV 1-day stale (normal), metrics 2-day stale, VR 17-day stale (normal monthly) |
| **Recommendation Engine Score** | **65/100** | Core logic sound but hampered by 95% missing ER/AUM from frontend data source |
| **Database Quality Score** | **50/100** | Three unsynchronized datasets (fund_master, fund_metrics, recommendation_universe); no single source of truth; AMC corruption |
| **Automation Score** | **25/100** | NAV and metrics recalculation fully manual; only workbook sync automated |
| **Production Readiness Score** | **45/100** | Core functionality works but critical auth config broken; enrichment invisible; data fragmentation |

---

## PRIORITY ACTION PLAN

### PRIORITY 1 — Must Fix Before Production (Fix Within 24 Hours)

**P1a. Fix Auth Configuration**
- Go to Supabase Dashboard → Authentication → Settings
- Set Site URL to `https://cifraa.in`
- Add `https://cifraa.in` to redirect URLs
- Enable email confirmations
- Enable MFA (TOTP)
- Set OTP length to 8
- Set rate limit to 1m
- **Impact:** Prevents auth redirect loops and account security issues

**P1b. Bridge Enrichment Gap**
The VR-enriched data needs to reach the frontend. Choose ONE approach:

Option 1 (Recommended — SQL only):
```sql
UPDATE fund_master fm
SET
  expense_ratio = ru.expense_ratio,
  aum = ru.aum,
  fund_manager = ru.fund_manager
FROM recommendation_universe ru
WHERE fm.scheme_code = ru.scheme_code
  AND (fm.expense_ratio IS NULL OR ru.expense_ratio IS NOT NULL);
```

Option 2 (Recalculate fund_metrics columns):
Run the `calculate-fund-metrics.py` script (or equivalent SQL) to populate `fund_metrics.expense_ratio` and `fund_metrics.net_assets`.

**Impact:** 72.7% of funds would instantly display expense ratio and AUM on the dashboard

**P1c. Fix All Funds Page Limit**
In `src/hooks/useFundCache.tsx`, change:
```ts
const result = await fetchFundMasterFunds({ perPage: 4000, activeOnly: false });
```
To `perPage: 10000` or implement proper pagination.

**Impact:** Users would see all funds instead of first 4,000

### PRIORITY 2 — Important (Fix Within 1 Week)

**P2a. Automate NAV Ingestion**
Add cron job using pg_cron + pg_net:
```sql
SELECT cron.schedule('ingest-amfi-nav-daily', '0 6 * * *', $$
  SELECT net.http_post(
    url:='https://skvvltawshbphrgnqjzf.supabase.co/functions/v1/ingest-amfi-nav',
    headers:='{"Content-Type":"application/json","Authorization":"Bearer <service-role-key>"}'::jsonb
  ) AS request_id;
$$);
```

**P2b. Automate fund_metrics Recalculation**
Create an RPC function and schedule it after NAV ingestion:
```sql
CREATE OR REPLACE FUNCTION public.calculate_fund_metrics()
RETURNS void
LANGUAGE plpgsql
AS $$
  -- Metric calculation logic here (port from calculate-fund-metrics.py)
$$;
```

**P2c. Reduce AMC Corruption**
Run the AMC cleanup SQL on `fund_master`:
```sql
UPDATE fund_master fm
SET amc = ru.amc
FROM recommendation_universe ru
WHERE fm.scheme_code = ru.scheme_code;
```

**P2d. Restore fund_metrics expense_ratio and net_assets**
The `fund_metrics` table has columns `expense_ratio` and `net_assets` but they're all NULL. Populate from `recommendation_universe` or from `fund_master`.

### PRIORITY 3 — Nice to Have

**P3a. Implement true pagination for All Funds** — server-side pagination with page controls
**P3b. Create a unified view** that joins `fund_master_enriched` with `recommendation_universe` so the frontend always sees VR-enriched values
**P3c. Set up monitoring/alerting** for NAV ingestion failures
**P3d. Add stale data indicators** on the dashboard (show "as of 31 May" for VR data)
**P3e. Create a data freshness dashboard** in the admin panel
**P3f. Merge the development branch** into main once all P1/P2 items are resolved
**P3g. Clean up duplicate CIFRAA-app directory** — the `CIFRAA-app/` folder appears to be a duplicate of the main app

---

## Summary

The CIFRAA app has solid core functionality but four critical issues block production readiness:

1. **🔴 Auth config broken** — localhost redirects, disabled MFA, disabled email confirmation (created by the `config push` in this session)
2. **🔴 Enrichment data invisible** — VR enriched 72% of funds but frontend reads a different table where only 5% have data
3. **🔴 All Funds capped at 4,000** — hardcoded limit hides most funds
4. **🔴 No daily automation** — NAV and metrics require manual invocation

**The auth config fix should be done immediately. The enrichment bridge (P1b) would have the most visible user impact — changing expense ratio availability from 5% to 73%.** 
