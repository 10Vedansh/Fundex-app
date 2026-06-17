# Expense Ratio & AUM Lineage Audit

**Generated:** 2026-06-16T11:45:00Z  
**Scope:** Full repository audit for `expense_ratio` and `aum` field lineage

---

## 1. Current Coverage

| Table | Total Rows | expense_ratio | aum | Both |
|-------|-----------|:------------:|:---:|:----:|
| `fund_master` | 33,978 | **1,759** (5.2%) | **1,767** (5.2%) | 1,759 (5.2%) |
| `recommendation_universe` | 8,095 | **1,326** (16.4%) | **1,327** (16.4%) | 1,326 (16.4%) |
| `fund_metrics` | 33,969 | **0** (0.0%) | **0** (0.0%) | 0 (0.0%) |

### Gap

- **6,769** funds in `recommendation_universe` need both expense_ratio and AUM (>70% target: ~5,667 enriched funds)

---

## 2. Data Source Inventory

### Source A: Value Research Workbook (Data.xlsx) — EXHAUSTED

| Property | Detail |
|----------|--------|
| **File** | `public/data/Data.xlsx` (also in `CIFRAA-app/public/data/Data.xlsx`) |
| **Parsed into** | `src/audit/funds_data.json` (2,011 entries) |
| **Rows with expenseRatio** | **1,960** (97.5%) |
| **Rows with AUM** | **2,011** (100%) |
| **Pipeline path** | `process-workbook/index.ts` or `sync-onedrive/index.ts` → `fund_cache` → `build-fund-master.py` 4-tier name matching → `fund_master` → `build-recommendation-universe.py` |
| **Match rate** | ~1,805 matched / 2,011 workbook entries (89.7%) → filtered down to ~1,326 in `recommendation_universe` |
| **Status** | **EXHAUSTED** — all workbook data already processed through pipeline. Remaining ~206 unmatched entries cannot be matched to AMFI scheme codes due to name differences. |
| **Accessible?** | Yes — stored in Supabase Storage `data-files` bucket + locally at `src/audit/funds_data.json`. No new data can be extracted. |

<details>
<summary>Pipeline detail: how workbook data flows</summary>

```
Data.xlsx (2,011 funds, 40 fields each)
  → Edge Functions: process-workbook/index.ts / sync-onedrive/index.ts
    → fund_cache (cache_key=workbook_data, 2011 entries)
  → build-fund-master.py (line 247-248):
      expense_ratio = fund.get("expenseRatio") or fm.get("expense_ratio")
      aum = fund.get("netAssets") or fund.get("aum") or fm.get("net_assets")
    → fund_master (1,759 with expense_ratio, 1,767 with aum)
  → build-recommendation-universe.py
    → recommendation_universe (1,326 with expense_ratio, 1,327 with aum)
```

The ~2,011 workbook funds are matched against ~37,978 AMFI scheme codes using a 4-tier name matching strategy (exact → normalized → fuzzy → AMC+fuzzy). ~1,805 succeed. The remaining ~206 fail because their names differ too much from AMFI scheme names. No re-running with different thresholds would recover more than a few additional matches.
</details>

---

### Source B: Value Research JSON API — VIABLE (Free, Best Option)

| Property | Detail |
|----------|--------|
| **Discovery path** | `scripts/test_vr9.py` → `test_vr10.py` → `scripts/pilot-enrichment-vr-api.py` |
| **Endpoints** | `GET /api/funds/{id}/` → returns JSON with both fields |
| **expense_ratio path** | `data.more_details_data.data[].Base Expense Ratio` |
| **AUM path** | `data.more_details_data.data[].Assets` (in Cr) |
| **fund_manager path** | `data.fund_manager_data.managers[].person_name` |
| **AMC listing** | `GET /api/funds/` → returns 404 body with `amc-list` (50 AMCs) |
| **Fund ID discovery** | `GET /funds/selector-data/fund-house/{amc_id}/{slug}/` → HTML table with all fund IDs per AMC |
| **Estimated coverage** | ~80-90% of 6,769 remaining funds |
| **Auth** | None — fully open |
| **Rate limit** | Cloudflare WAF blocks after ~5-10 rapid requests. Need **2.5-3.5s delays** |
| **Througput** | ~20 requests/minute → ~1,200/hour → ~5.6 hours for 6,700 funds |
| **Feasibility** | **HIGH** — pilot proven, API stable, both fields in single request |
| **Risk** | Cloudflare may tighten rate limits; need robust retry/backoff |

**Pilot results** (from `scripts/pilot-enrichment-vr-api.py`):
- 50 AMC pages → all fund IDs extractable
- Individual `/api/funds/{id}/` calls return complete expense_ratio + AUM + fund_manager
- ~80-90% of funds expected to have both fields
- Need AMC name mapping (50 AMCs) + fund name matching, both already implemented

---

### Source C: mfapi.in — FUND_MANAGER ONLY

| Property | Detail |
|----------|--------|
| **Endpoint** | `GET https://api.mfapi.in/mf/{scheme_code}` |
| **Available fields** | `fund_house` (AMC name), `scheme_name`, `scheme_category` |
| **expense_ratio?** | **NO** — not available at any mfapi.in endpoint |
| **AUM?** | **NO** — not available at any mfapi.in endpoint |
| **Status** | Used for **fund_manager** enrichment only (Phase 1 of enrichment pipeline). 493/500 success in pilot. |
| **Accessible?** | Yes — free, no auth, 99.9% uptime |

---

### Source D: AMFI NAVAll.txt — NAV ONLY

| Property | Detail |
|----------|--------|
| **URL** | `https://www.amfiindia.com/spages/NAVAll.txt` |
| **Available fields** | `scheme_code`, `scheme_name`, `nav`, `nav_date`, `isin` |
| **expense_ratio?** | **NO** — not in this file |
| **AUM?** | **NO** — not in this file |
| **Coverage** | ~45,000 schemes |
| **Status** | Already used for NAV ingestion (`ingest-amfi-nav/index.ts`) and name backfill (`backfill-metadata.py`) |

---

### Source E: AMFI Monthly AUM Data — UNCERTAIN ACCESS

| Property | Detail |
|----------|--------|
| **Theoretical URL** | `https://www.amfiindia.com/research-information/other-data/aum-data` |
| **Status** | **404** — URL no longer accessible (tested 2026-06-16) |
| **Alternative URLs** | All return 404 (`/aum-data`, `/expense-ratio`, `portal.amfiindia.com/MFDataDownload/AUMDataDownload.aspx`) |
| **Available fields** | AUM only (not expense_ratio) |
| **Frequency** | Monthly |
| **Feasibility** | **LOW** — URLs are broken, AMFI may have restructured their site. Would need to find working URL or contact AMFI. |

---

### Source F: Morningstar API (Paid)

| Property | Detail |
|----------|--------|
| **Available fields** | Full fund data including expense_ratio, AUM, fund_manager |
| **Coverage** | ~95%+ |
| **Cost** | ~$500-2,000/month |
| **Status** | **Not recommended** at this stage. Revisit if VR fails or budget becomes available. |

---

### Source G: NSE India / BSE MF Portals — NON-FUNCTIONAL

| Property | Detail |
|----------|--------|
| **NSE API** | All tested endpoints return 404 (`/api/mf-data`, `/api/mf-details`, `/api/mf-list`) |
| **Moneycontrol API** | All tested endpoints return 404 |
| **Groww API** | Returns 404 |
| **ET Money API** | Connection refused |
| **Status** | **NON-FUNCTIONAL** — no accessible API found from these sources |

---

## 3. Ranked Source Recommendations

| Rank | Source | Fields | Est. Coverage | Ease | Cost | Time for 6,700 funds | Best For |
|:----:|--------|:------:|:-------------:|:----:|:----:|:--------------------:|:--------:|
| **1** | **Value Research JSON API** | expense_ratio ✅, AUM ✅, fund_manager ✅ | **80-90%** | Medium | **Free** | **~5.6 hours** | **PRIMARY (both fields)** |
| 2 | mfapi.in | fund_manager only | 99% (fund_manager) | Easy | Free | ~5 min | Backfill fund_manager (already done) |
| 3 | Morningstar API | expense_ratio ✅, AUM ✅ | 95%+ | Easy | ~$500-2K/mo | ~5 min | Fallback if VR fails |
| 4 | AMFI Monthly AUM | AUM only | ~60-70% | Hard (broken URL) | Free | N/A | AUM-only fallback |
| 5 | Workbook (Data.xlsx) | expense_ratio, AUM | 5.2% | — | Free | — | **EXHAUSTED** |

---

## 4. Analysis: Why Only 16.4% Coverage?

The existing 1,326 records come from a **single workbook** (`Data.xlsx`) that was manually uploaded and matched against AMFI scheme codes. The workbook covers **~2,000 popular funds** — likely the Value Research "shortlist" of actively tracked funds. The remaining ~32,000 AMFI schemes have NO expense_ratio or AUM because:

1. AMFI NAVAll.txt (the official scheme listing) only contains NAV data — no expense_ratio, no AUM
2. mfapi.in (the most-used MF API) only returns scheme_name and fund_house — no expense_ratio, no AUM
3. No other free API exists for Indian MF expense ratios or AUM
4. The only comprehensive free source is Value Research, which blocks automated access

---

## 5. Fastest Path to >70%

### Recommended Strategy: Value Research JSON API

**Pre-requisites already done:**
- AMC list mapping (50 AMCs, saved at `reports/phase5/vr_amc_list.json`)
- Fund ID indexing code (`pilot-enrichment-vr-api.py` Phase 1a/1b)
- Name matching logic (`pilot-enrichment-vr-api.py` `match_fund_to_vr()`)
- VR API metadata extraction (`pilot-enrichment-vr-api.py` `get_fund_metadata()`)
- Rate limit profiling (Cloudflare blocks after ~5-10 req, need 2.5-3.5s delay)

**Steps to implement:**

1. **Build VR fund ID index** (one-time, ~3 min):
   - For each of 50 AMCs, fetch `selector-data` endpoint
   - Extract all fund IDs + names
   - Save to `vr_fund_index.json`

2. **Map scheme_code → VR fund ID** (~2 min):
   - For each of 6,700 funds, look up fund_house → VR AMC
   - Match fund name (normalized) → VR fund name
   - Create mapping table

3. **Fetch VR API for each mapped fund** (~5.6 hours):
   - 2.5s delay per request
   - 24 req/min × 60 min = 1,440/hr
   - Estimated 5.6 hours for 6,700 funds (at 80% match rate = ~5,360 successful)
   - Can parallelize with 2-3 workers with staggered start times

**Expected result after VR enrichment:**
- expense_ratio: ~5,360 / 8,095 (66.2%) — close to 70% target
- AUM: ~5,360 / 8,095 (66.2%) — close to 70% target
- fund_manager: already at >95% from mfapi.in + VR combined

**Risk:** If VR rate limiting becomes more aggressive, throughput drops and time increases. With 5s delays: ~11 hours. Consider adding proxy rotation for higher throughput.

### Alternative: Accept 16.4% and proceed with Phase 6

If the 70% target cannot be met, the scoring engine now handles null safely (post_fix fix). Funds with null expense_ratio/AUM get:
- expense_ratio null → expenseN = 0.5 (neutral, no penalty)
- AUM null → aumN = 0.5 (neutral, no penalty)

This avoids the critical bug where null→0 caused false perfect/near-perfect scores.

---

## 6. Key Files Referenced

| File | Role |
|------|------|
| `src/audit/funds_data.json` | 2,011 workbook entries (exhausted source) |
| `scripts/pilot-enrichment-vr-api.py` | Proof-of-concept VR API enrichment |
| `scripts/enrich-recommendation-universe.py` | Current enrichment pipeline (needs VR API rewrite) |
| `scripts/build-fund-master.py` | Workbook → fund_master matching (lines 247-248) |
| `scripts/build-recommendation-universe.py` | fund_master → recommendation_universe |
| `scripts/backfill-fund-metrics.py` | Was supposed to backfill → has 0 coverage |
| `supabase/functions/process-workbook/index.ts` | Workbook parser Edge Function |
| `reports/phase5/expense_aum_source_audit.md` | Prior source audit (2026-06-15) |
| `reports/phase5/metadata_enrichment_plan.md` | Current enrichment plan |
