# Expense Ratio & AUM Source Audit

**Generated:** 2026-06-15
**Scope:** Available data sources for enriching `expense_ratio`, `aum`, `fund_manager` in `recommendation_universe`

## 1. Current Coverage

| Field | `fund_master` (33,978 rows) | `recommendation_universe` (8,095 rows) |
|-------|:-------------------------:|:-----------------------------------:|
| expense_ratio | 1,759 (5.2%) | 1,326 (16.4%) |
| aum | 1,767 (5.2%) | 1,327 (16.4%) |
| fund_manager | 1,805 (5.3%) | 1,352 (16.7%) |

## 2. Data Sources

### Source A: Workbook (already exhausted)
- **Rows covered:** ~1,805
- **Fields:** expense_ratio, aum, fund_manager, beta, alpha, std_dev
- **Method:** `fund_master` matching matched 1,805 workbook funds
- **Status:** EXHAUSTED — no more workbook data available

### Source B: mfapi.in (existing Edge Function)
- **Available fields:** scheme_name, fund_house (AMC), scheme_category
- **NOT available:** expense_ratio, AUM
- **Status:** mfapi.in API does NOT provide expense ratio or AUM data
- **Already used:** 19,696 funds backfilled from mfapi.in in Phase 5.2

### Source C: Value Research Online
- **URL:** `https://www.valueresearchonline.com`
- **Available:** expense_ratio, AUM for most open-ended mutual funds
- **Method:** Web scraping (1–2 requests per fund)
- **Existing reference:** `fetch-news` Edge Function already references valueresearchonline.com
- **Risk:** Subject to rate limiting, IP blocking, HTML structure changes
- **Estimated coverage:** 80-90% of active Indian funds

### Source D: Morningstar India (API)
- **Available:** Comprehensive fund data including expense_ratio, AUM
- **Access:** Requires API subscription (paid)
- **Method:** API calls with authentication
- **Estimated coverage:** 95%+
- **Risk:** Cost factor — ~$500-2,000/month for API access

### Source E: BSE / NSE MF Portal
- **Available:** Expense ratios, AUM (text-based, less structured)
- **Method:** Web scraping
- **Risk:** Data quality varies, format changes frequently

### Source F: AMFI website (direct)
- **Available:** Scheme-wise AUM data published monthly
- **URL:** `https://www.amfiindia.com/research-information/other-data/aum-data`
- **Method:** Web scraping monthly reports
- **Risk:** Published monthly (not real-time), requires parsing PDFs/HTML tables

## 3. Existing Code in Repository

| File | Relevance |
|------|-----------|
| `supabase/functions/mfapi/index.ts` | Fetches from api.mfapi.in — no expense/AUM |
| `supabase/functions/fetch-news/index.ts` | References valueresearchonline.com |
| `supabase/functions/generate-insights/index.ts` | Reads AUM from fund_master (already present) |
| `supabase/functions/process-workbook/index.ts` | Reads AUM from workbook (line 162) |
| `scripts/backfill-metadata.py` | Existing backfill pattern (can be adapted) |
| `scripts/batch-fetch-mfapi.py` | Concurrent HTTP fetcher pattern (can be reused) |

## 4. Recommended Approach

### Primary: Value Research Online scraping
- **Effort:** 2-3 days
- **Cost:** Free (requires polite scraping)
- **Coverage:** ~80-90% of 8,095 universe funds
- **Tools:** Python `httpx` + `beautifulsoup4` or `playwright`
- **Pattern:** Reuse `batch-fetch-mfapi.py` concurrency pattern (8 workers)

### Fallback: AMFI AUM monthly data
- **Effort:** 1-2 days
- **Coverage:** ~60-70% (monthly data)
- **Good for:** AUM specifically

### Not recommended at this time:
- Morningstar API (paid subscription)
- BSE/NSE portals (low data quality)

## 5. Enrichment Strategy

```
Phase 5.4B.1 — expense_ratio
  Source: Value Research
  Batch size: 5 concurrent workers, rate limited
  Target: 6,769 funds
  Est. time: 30-45 min (at 3s/fund, 5 workers)

Phase 5.4B.2 — aum
  Source: Value Research (same scrape)
  Target: 6,768 funds
  Est. time: Same batch (same page)

Phase 5.4B.3 — fund_manager
  Source: Value Research (already have 1,352 from AMFI/mfapi names)
  Target: 6,743 funds
  Est. time: Same batch (same page)
```

All three fields can be scraped from a single Value Research fund page per fund, making combined enrichment efficient (~30-45 min total).

## 6. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| IP blocking by Value Research | Rotate User-Agent; add delays; use session; cap at 10 req/s |
| HTML structure changes | Validate parsed fields; log failures; alert on structure shift |
| Missing data for some funds | Log unfetchable scheme_codes; retry with different strategy |
| Stale expense ratio (not current) | Accept 3-month old data; document staleness |

## 7. Conclusion

**Value Research Online** is the most practical source for Phase 5.4B enrichment:
- Free (no API subscription)
- Covers 80-90% of Indian mutual funds
- Provides all three needed fields (expense_ratio, AUM, fund_manager)
- Existing codebase patterns can be reused
- Estimated 30-45 min for complete universe enrichment
