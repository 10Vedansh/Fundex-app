# Fund Metrics Cutover Report — Final Validation

**Generated:** 2026-06-15T12:35

## 1. Is Value Research still required?

**YES**, for the following critical data:

| Field | Why Required | Alternative |
|---|---|---|
| Fund category (EQ-LC, DT-LIQ, etc.) | Engine filtering, allocation models | Not yet available in fund_metrics |
| AMC name | AMC caps, diversification rules | Not yet available in fund_metrics |
| Expense ratio | Scoring component, amount filters | Not yet available in fund_metrics |
| AUM / Net assets | Scoring component, stability metric | Not yet available in fund_metrics |
| Fund manager | Display only (non-critical) | Could be omitted |
| Beta, Alpha, Turnover | Display only (non-critical) | Could be omitted |

**Verdict**: Value Research cannot be retired until category, AMC, expense ratio,
and AUM are available from an alternative source (AMFI or directly populated).

## 2. Is recommendation engine fully using fund_metrics?

**NO** — the engine still uses workbook-derived `MutualFund` objects as its
primary input. While fund_metrics is now populated with 33,969 schemes and
active fund views are in place, the engine code has NOT been switched to
read from fund_metrics because:

- **No cross-reference key** between workbook IDs and fund_metrics scheme_codes
- **Fund_metrics lacks category/AMC** fields needed for engine filtering
- **Engine code (`intersectionEngine.ts`, `scoringEngineV3.ts`)** still expects
  the `MutualFund` interface from workbook data

## 3. How many active investable funds are available?

| Category | Count |
|---|---|
| Total fund_metrics rows | 33,969 |
| Active (NAV within 730 days) | 8,910 |
| Active + investable (>=60 data pts) | 8,910 |
| Workbook funds (with full metadata) | 2,011 |
| Workbook funds matched to active fund_metrics | 0 (no matching key) |

## 4. Any blockers remaining?

| Blocker | Severity | Resolution |
|---|---|---|
| No scheme_code mapping | **HIGH** | Need AMFI scheme_detail API or manual mapping |
| Empty fund_metrics scheme_name | **HIGH** | NAV database had no names |
| fund_metrics.category/amc NULL | **HIGH** | Cannot populate without mapping |
| 25K inactive schemes in fund_metrics | LOW | Filtered by active_funds view |
| Edge Function 546 error | MEDIUM | Timeout on large datasets |

## 5. Production readiness score

**6/10**

### Score Breakdown

| Category | Score | Reason |
|---|---|---|
| Infrastructure | 9/10 | Schema, migrations, indexes, RLS |
| Data Pipeline | 9/10 | 35M NAV → fund_metrics CSV → Supabase |
| Active Fund Layer | 8/10 | View + analysis, but NULL enrichment fields |
| Engine Migration | 3/10 | Engine still uses workbook entirely |
| Dashboard Readiness | 6/10 | Hook created but not wired into UI |
| Scoring Quality | 7/10 | Good formula, missing fund_metrics overlay |
| Performance | 8/10 | Good indexes, room for composite optimizations |
| Documentation | 9/10 | All 25 reports in reports/ tree |
| **Overall** | **6/10** | |

## Immediate Action Items

1. [ ] Build scheme_code ↔ workbook ID mapping table from AMFI NAVAll.txt
2. [ ] Populate fund_metrics.category and amc from workbook via mapping
3. [ ] Update fetch-fund-data to return merged fund_metrics + workbook data
4. [ ] Wire useFundMetrics hook into Index.tsx dashboard
5. [ ] Remove completeness penalty for benchmark/fundManager (non-critical)
6. [ ] Add fund_metrics.confidence_score to scoring formula
