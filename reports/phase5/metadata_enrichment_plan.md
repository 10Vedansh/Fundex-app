# Metadata Enrichment Plan

**Generated: 2026-06-17 11:27**
**Script:** `scripts/enrich-recommendation-universe.py`

## 1. Current Coverage

| Field | Covered | Total | % |
|-------|:-------:|:-----:|:-:|
| expense_ratio | 5883 | 8095 | 72.7%% |
| aum | 5941 | 8095 | 73.4%% |
| fund_manager | 8095 | 8095 | 100.0%% |

## 2. Enrichment Sources

| Source | Fields | Reliability | Implementation |
|--------|--------|:-----------:|:--------------:|
| Value Research JSON API | expense_ratio, AUM, fund_manager | 86.8% (proven) | VR JSON API /api/funds/{id}/ |
| mfapi.in | fund_manager (fund_house) | Very High | Concurrent HTTP fetch |

## 3. Pipeline Configuration

| Parameter | Value |
|-----------|-------|
| VR API delay | 2.5s |
| VR AMC crawl delay | 3.5s |
| Update batch size | 100 |
| Max retries per fund | 3 |
| Checkpoint frequency | every 100 funds |
| Checkpoint file | .enrich-recommendation-universe-checkpoint.json |

## 4. How to Run

```bash
# Enrich all fields
SUPABASE_SERVICE_ROLE_KEY=... python scripts/enrich-recommendation-universe.py

# Enrich specific fields only
SUPABASE_SERVICE_ROLE_KEY=... python scripts/enrich-recommendation-universe.py --fields expense_ratio,aum

# Resume from checkpoint
SUPABASE_SERVICE_ROLE_KEY=... python scripts/enrich-recommendation-universe.py --resume

# Dry run
SUPABASE_SERVICE_ROLE_KEY=... python scripts/enrich-recommendation-universe.py --dry-run

# Pilot / limit
SUPABASE_SERVICE_ROLE_KEY=... python scripts/enrich-recommendation-universe.py --limit 100
```

## 5. Coverage

| Field | Before | After |
|-------|:------:|:-----:|
| expense_ratio | 72.7%% | >86%% |
| aum | 73.4%% | >86%% |
| fund_manager | 100.0%% | >90%% |

## 6. Failure Modes

| Failure | Mitigation |
|---------|------------|
| VR 403 (Cloudflare) | 10s backoff retry (built-in: http_get_vr) |
| VR AMC page change | Selector-data fallback to HTML page (get_amc_funds) |
| VR JSON API change | Log parsing failures; check raw response |
| mfapi.in down | Retry with exponential backoff (built-in) |
| Supabase unavailable | Checkpoint preserves progress; script is idempotent |
