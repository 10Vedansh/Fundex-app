# Production Deployment Checklist — CIFRAA Recommendation Engine Fixes

**Target Date**: TBD  
**Deployment Scope**: SQL migration + edge function + CAGR sanitization  

---

## Pre-Deployment

### 1. Environment Verification

- [ ] Verify `recommendation_universe` has enriched data
  ```sql
  SELECT COUNT(*) FILTER (WHERE expense_ratio IS NOT NULL) AS enriched_count
  FROM recommendation_universe;
  ```
  Expected: ~6,316

- [ ] Verify `fund_master_enriched` view uses COALESCE chain
  ```sql
  SELECT view_definition FROM information_schema.views
  WHERE table_name = 'fund_master_enriched';
  ```
  Must contain: `COALESCE(ru.expense_ratio::numeric, fm.expense_ratio)`

- [ ] Verify current `recommendation_score` state
  ```sql
  SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) AS scored
  FROM fund_metrics WHERE last_calculated IS NOT NULL;
  ```
  Expected: scored = 0 (all NULL)

### 2. Code Review

- [ ] Migration file reviewed: `supabase/migrations/20260618000000_update_recommendation_scores.sql`
- [ ] Edge function reviewed: `supabase/functions/calculate-fund-metrics/index.ts`
- [ ] Python script reviewed: `scripts/calculate-fund-metrics.py`
- [ ] Test suite reviewed and passing: 11/11 tests

---

## Deployment Steps

### Step 1: Apply SQL Migration

Run in Supabase SQL Editor or via CLI:

```bash
supabase db push
```

**Expected output**: 3 UPDATE statements executed successfully, 1 verification query returning score coverage.

**Migration content** (4 operations):
1. `UPDATE fund_metrics SET cagr_* = NULL WHERE cagr > 5 OR cagr < -1` — sanitize CAGR outliers
2. `CREATE FUNCTION compute_recommendation_score(...)` — temporary scoring function
3. `UPDATE ... FROM fund_master LEFT JOIN recommendation_universe ... COALESCE(...)` — score with real data (Step 2)
4. `UPDATE ... WHERE recommendation_score IS NULL ... 0.015 default` — score remaining (Step 3)
5. `DROP FUNCTION compute_recommendation_score` — cleanup

### Step 2: Deploy Edge Function

```bash
supabase functions deploy calculate-fund-metrics --no-verify-jwt
```

Verify function responds:
```bash
curl -X POST https://<project>.supabase.co/functions/v1/calculate-fund-metrics \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Test full rebuild mode:
```bash
curl -X POST https://<project>.supabase.co/functions/v1/calculate-fund-metrics \
  -H "Authorization: Bearer <anon-key>" \
  -H "Content-Type: application/json" \
  -d '{"full_rebuild": true}'
```

### Step 3: Configure Cron Schedule

Using Supabase Dashboard → Edge Functions → Triggers:

| Schedule | Frequency | Payload | Purpose |
|---|---|---|---|
| Daily (00:00 UTC) | Every day | `{}` | Incremental: process NAV updates from last 24h |
| Weekly (Sun 02:00 UTC) | Every Sunday | `{ "full_rebuild": true }` | Full recalculation of all funds |

### Step 4: Update Python Script (if applicable)

Deploy updated `scripts/calculate-fund-metrics.py` to automation server:
```bash
scp scripts/calculate-fund-metrics.py server:/path/to/scripts/
```

---

## Post-Deployment Validation

### Query 1: Score Coverage

```sql
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) AS scored,
       ROUND(100.0 * COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS coverage_pct,
       MIN(recommendation_score) AS min_score,
       AVG(recommendation_score)::numeric(10,2) AS avg_score,
       MAX(recommendation_score) AS max_score
FROM fund_metrics
WHERE last_calculated IS NOT NULL;
```

**Expected**:
- total: ~8,093
- scored: ~7,800-7,900
- coverage: ~96-98%
- min: ~5-10
- avg: ~45-55
- max: ~80-90

### Query 2: CAGR Sanitization

```sql
SELECT COUNT(*) AS sanitized_count FROM fund_metrics
WHERE last_calculated IS NOT NULL
  AND cagr_1y IS NULL AND cagr_3y IS NULL AND cagr_5y IS NULL;
```

**Expected**: ~3-10 funds (including scheme 107002)

### Query 3: Score Distribution

```sql
SELECT CASE
         WHEN recommendation_score < 20 THEN '0-20'
         WHEN recommendation_score < 40 THEN '20-40'
         WHEN recommendation_score < 60 THEN '40-60'
         WHEN recommendation_score < 80 THEN '60-80'
         ELSE '80-100'
       END AS bucket,
       COUNT(*) AS cnt
FROM fund_metrics
WHERE recommendation_score IS NOT NULL
GROUP BY 1 ORDER BY 1;
```

**Expected distribution**:
```
0-20:     ~400   (5%)
20-40:   ~1,200 (15%)
40-60:   ~3,200 (40%)
60-80:   ~2,400 (30%)
80-100:   ~800  (10%)
```

### Query 4: Top 10 Scored Funds

```sql
SELECT scheme_code, cagr_1y, sharpe_ratio_1y, sortino_ratio_1y,
       volatility_1y, recommendation_score
FROM fund_metrics
WHERE recommendation_score IS NOT NULL
ORDER BY recommendation_score DESC
LIMIT 10;
```

**Expected**: Top funds have high CAGR, Sharpe, Sortino and low volatility.

### Query 5: Spot Check Expense Impact

```sql
SELECT COUNT(*) AS scored_with_real_expense
FROM fund_metrics fm
INNER JOIN recommendation_universe ru ON fm.scheme_code = ru.scheme_code
WHERE fm.recommendation_score IS NOT NULL AND ru.expense_ratio IS NOT NULL;
```

**Expected**: ~6,000+ funds scored with real expense data.

### Query 6: Pipeline Freshness

```sql
SELECT MAX(last_calculated) AS latest_calc FROM fund_metrics;
```

**Expected**: Within 24 hours of current time.

---

## Rollback Plan

### Rollback Migration

If score calculation is incorrect:

```sql
-- 1. Clear all recommendation scores
UPDATE fund_metrics SET recommendation_score = NULL, updated_at = now()
WHERE last_calculated IS NOT NULL;

-- 2. Verify rollback
SELECT COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) AS still_scored
FROM fund_metrics;
-- Expected: 0
```

### Rollback CAGR Sanitization

If CAGR values were incorrectly nullified:

```sql
-- Note: Original values are lost. Re-run calculate-fund-metrics edge function
-- with full_rebuild to recompute all CAGR values from raw NAV data.
```

### Rollback Edge Function

```bash
supabase functions deploy calculate-fund-metrics --no-verify-jwt
```
Deploy the previous version (keep a backup of the original file).

---

## Monitoring

### First 24 Hours

- [ ] Edge function error rate < 1%
- [ ] Edge function execution time < 60s (full rebuild) / < 10s (incremental)
- [ ] No 504 or 502 errors from edge function
- [ ] Frontend recommendation loading time unchanged

### First Week

- [ ] Verify daily cron runs successfully
- [ ] Verify Sunday full rebuild completes
- [ ] Confirm recommendation scores available in API responses
- [ ] Check no negative feedback from users on recommendation quality

---

## Expected Behavior After Deployment

### What Changes

| Aspect | Before | After |
|---|---|---|
| `recommendation_score` in DB | NULL for all funds | ~7,800 funds scored (0-100) |
| Expense ratio used | N/A (scoring was NULL) | COALESCE(ru, fma, 0.015) |
| CAGR validation | None (648.25 present) | Sanitized to NULL |
| Edge function mode | Full recalculation only | Incremental (daily) + Full (weekly cron) |
| Edge function CPU | High (process all ~8,000) | Low (process ~500-2,000 daily) |

### What Does Not Change

- All existing API endpoints
- Frontend UI components
- Fund filtering and categorization
- User profiles and questionnaires
- NAV history data

---

## Post-Deployment Summary

After deployment, confirm:

```
Recommendation Score Coverage:  ~97%  ✓
CAGR Outliers Sanitized:        ~3-10 funds  ✓
Expense Ratio Source:           recommendation_universe (COALESCE chain)  ✓
Edge Function Mode:             Incremental (daily) + Full (weekly)  ✓
Test Suite:                     11/11 passing  ✓
Build:                          TypeScript + Vite clean  ✓
```

---

*End of Deployment Checklist*
