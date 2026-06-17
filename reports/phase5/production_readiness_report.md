# Production Readiness Report

**Generated:** 2026-06-15
**Scope:** End-to-end CIFRAA Phase 5 readiness assessment

## 1. Readiness Score Summary

| Dimension | Current | After Enrichment | Target | Gap |
|-----------|:-------:|:----------------:|:------:|:---:|
| Recommendation engine | 7/10 | 7/10 | 9/10 | Adapter bug (null→0) |
| recommendation_universe | 8/10 | 9/10 | 10/10 | Coverage gaps |
| Metadata quality | 4/10 | 7/10 | 9/10 | expense_ratio 16% → ~75% |
| NAV freshness | 3/10 | 3/10 | 8/10 | Pipeline disconnected; timeout |
| Automation | 0/10 | 0/10 | 8/10 | Zero automated steps |
| Scoring completeness | 5/10 | 7/10 | 9/10 | 83.6% funds have fake expense=0 |
| Monitoring | 0/10 | 0/10 | 7/10 | No alerts |
| Schema stability | 8/10 | 8/10 | 9/10 | Stable |
| **Composite** | **4.4/10** | **5.1/10** | **8.6/10** | |

## 2. Dimension Breakdown

### 2.1 Recommendation Engine (7/10)

| Criterion | Status | Notes |
|-----------|:------:|-------|
| Uses recommendation_universe | ✅ | V3 engine reads from fund_master_enriched |
| Scoring formulas correct | ⚠️ | V3 engine with profile weights, CAGR, Sortino, Sharpe, expense, AUM |
| Null handling bug | ❌ | `fundMasterAdapter.ts:70` — `expenseRatio: row.expense_ratio ?? 0` converts null→0 → false perfect score |
| AUM null→0 bug | ❌ | `fundMasterAdapter.ts:69` — `aum: row.aum ?? row.net_assets ?? 0` converts null→0 → false worst score |
| fund_manager null handled | ✅ | Correctly propagates null → -5% completeness penalty |
| Hard filters work | ⚠️ | `intersectionEngine.ts:229-230` — aum=0 (from null) passes `aum !== null` check → may incorrectly filter |

**Fix priority: HIGHEST** — adapter bug inflates expense scores for 83.6% of funds

### 2.2 recommendation_universe (8/10)

| Criterion | Status | Notes |
|-----------|:------:|-------|
| Total rows | ✅ 8,095 | Appropriate size for recommendation |
| Dedup quality | ✅ | Canonical fund key; Direct > Regular > Growth > IDCW |
| Category coverage | ✅ 100% | All 49 canonical categories represented |
| AMC coverage | ✅ 98.5% | 8,024/8,095 have AMC |
| scheme_name coverage | ✅ 100% | All 8,095 have names |
| expense_ratio coverage | ❌ 16.4% | 1,326/8,095 → **needs enrichment** |
| AUM coverage | ❌ 16.4% | 1,327/8,095 → **needs enrichment** |
| fund_manager coverage | ⚠️ 16.7% | 1,352/8,095 → mfapi.in can raise to ~99% |

### 2.3 NAV Freshness (3/10)

| Criterion | Status | Notes |
|-----------|:------:|-------|
| nav_history today | ❌ 0 rows | No ingestion run today (June 15) |
| nav_history complete | ❌ 56% | Only 7,868 of ~14K schemes ingested |
| fund_metrics fresh | ✅ 2026-06-15 | Last calculated today |
| fund_metrics connected to nav_history | ❌ funds.db | Two separate pipelines, no overlap |
| Historical NAV in Supabase | ❌ None | Only 4 dates in nav_history |

### 2.4 Automation (0/10)

| Component | Automated? | Scheduled? |
|-----------|:----------:|:----------:|
| AMFI→nav_history | ❌ | ❌ |
| nav_history→fund_metrics | ❌ (disconnected) | ❌ |
| fund_metrics→fund_master | ❌ | ❌ |
| fund_master→recommendation_universe | ❌ | ❌ |
| Universe refresh | ❌ | ❌ |
| Only cron job | sync-onedrive-daily | 02:00 UTC |

### 2.5 Scoring Completeness (5/10)

| Field | Weight | Current Behavior | Correct? |
|-------|:------:|-----------------|:--------:|
| CAGR_3Y | 10-30% | Null→0, scored as 0 | ✅ Acceptable (neutral) |
| Sortino | 15-40% | Null→0, scored as 0 | ✅ Acceptable |
| Sharpe | 10-15% | Null→0, scored as 0 | ✅ Acceptable |
| Volatility | 5-15% | Null→0.5 neutral | ✅ Acceptable |
| expense_ratio | 5-10% | Null→0 via adapter → 1.0 perfect score | ❌ **WRONG** |
| AUM | 0-5% | Null→0 via adapter → 0.0 worst score | ❌ **WRONG** |
| fund_manager | -5% penalty | Correct null propagation | ✅ |
| Consistency | 15-20% | Approximated from available periods | ✅ |

## 3. Risk Register

| # | Risk | Severity | Likelihood | Impact | Mitigation |
|---|------|:--------:|:----------:|:------:|------------|
| R1 | Null expense_ratio → perfect score | **CRITICAL** | Certain | 83.6% of funds falsely boosted | Fix adapter null→0 |
| R2 | Null AUM → incorrect minAum filter | **HIGH** | Certain | Funds incorrectly excluded | Fix adapter null→0 |
| R3 | ingest-amfi-nav timeout | **HIGH** | Every run | 44% data loss | Increase timeout to 120s |
| R4 | Metadata enrichment blocked | **MEDIUM** | Likely | Can't improve coverage | Use mfapi.in for fund_manager first |
| R5 | Pipeline never automated | **MEDIUM** | Certain | Manual ops forever | Build cron + Edge Functions |
| R6 | No data freshness monitoring | **LOW** | Likely | Stale data unnoticed | Add alerts after automation |

## 4. Priority Action Plan

### P0 — Fix adapter null→0 bug (HIGHEST ROI)
- **File:** `src/utils/fundMasterAdapter.ts`
- **Lines:** 69-70
- **Fix:** `row.expense_ratio ?? 0` → `row.expense_ratio ?? null`, `row.aum ?? row.net_assets ?? 0` → `row.aum ?? row.net_assets ?? null`
- **Impact:** Restores correct scoring for 83.6% of universe
- **Effort:** 15 minutes
- **Risk:** None (null propagation is already handled in the engine with fallback to 0.5 neutral)

### P1 — Run fund_manager enrichment via mfapi.in
- **Script:** `scripts/enrich-recommendation-universe.py` (already built)
- **Command:** `python scripts/enrich-recommendation-universe.py --fields fund_manager`
- **Impact:** fund_manager coverage from 16.7% → ~99% in <5 minutes
- **Effort:** 5 minutes to run; 0 dev time (script ready)

### P2 — Fix ingest-amfi-nav timeout
- **File:** `supabase/config.toml`
- **Add:** `[functions.ingest-amfi-nav]\nverify_jwt = false\ntimeout_seconds = 120`
- **Impact:** Full 14K AMFI schemes ingested per run
- **Effort:** 5 minutes

### P3 — Add cron job for daily AMFI ingestion
- **Method:** pg_cron + pg_net (pattern exists in migration 20260611200000)
- **Impact:** NAV data automatically refreshed daily
- **Effort:** 30 minutes

### P4 — Run expense_ratio + AUM enrichment
- **Script:** `scripts/enrich-recommendation-universe.py` (already built)
- **Source:** Value Research Online (best-effort)
- **Target:** expense_ratio/AUM coverage from 16.4% → ~75%
- **Effort:** Variable (30-45 min runtime, dependent on VR)

### P5 — Connect fund_metrics to nav_history
- **Method:** Upload funds.db to Supabase as historical nav_history data
- **Impact:** Enables automated daily recalc of fund_metrics
- **Effort:** 2-3 days

## 5. Coverage Targets After Phase 5.4B

| Field | Current | After P1 (mfapi.in) | After P4 (VR) | Target |
|-------|:-------:|:-------------------:|:-------------:|:------:|
| expense_ratio | 16.4% | 16.4% | ~75% | **>70%** |
| aum | 16.4% | 16.4% | ~75% | **>70%** |
| fund_manager | 16.7% | **~99%** | ~99% | **>90%** |

## 6. Conclusion

**Current readiness: 4.4/10**

The recommendation_universe is well-constructed (8,095 clean funds, 100% category coverage) but metadata is insufficient for production-quality recommendations.

**The critical path to production:**
1. ✅ Fix adapter null→0 bug (15 min, P0)
2. ✅ Run fund_manager enrichment (5 min, P1)
3. ✅ Fix ingestion timeout (5 min, P2)
4. ✅ Schedule cron job (30 min, P3)
5. ⏳ Run expense_ratio + AUM enrichment (30-45 min, P4)

**After completing P0-P4: readiness improves to ~7/10**

**Long-term (Phase 6):** Connect fund_metrics to nav_history for automated daily refresh → 9/10
