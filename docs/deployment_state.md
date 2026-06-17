# Deployment State — 2026-06-17

## ✅ Done
1. **Edge function `calculate-fund-metrics`**: Deployed (v1, ACTIVE)
2. **Cron migrations**: Applied via `supabase db push`
   - `20260617000001`: schedules `ingest-amfi-nav` at 06:00 UTC
   - `20260617000002`: schedules `calculate-fund-metrics` at 07:00 UTC
3. **config.toml**: `timeout_seconds` removed (CLI v2.106.0 doesn't support it)

## ❗ Known Issues

### 1. Edge function timeout too short
Both functions need manual timeout increase in the Supabase Dashboard:
- **`calculate-fund-metrics`**: takes ~60s (exceeds Free plan 30s limit; close to Pro 60s)
- **`ingest-amfi-nav`**: ~8s (fine for now, but may grow)

**Fix**: Go to https://supabase.com/dashboard/project/skvvltawshbphrgnqjzf/functions → click each function → Settings → set timeout to 120s for both.

### 2. No scheme has ≥3 data points yet
`calculate-fund-metrics` processed 14,214 schemes but all were skipped — every scheme has only 1 NAV row in `nav_history`. The `ingest-amfi-nav` function loads only the current day's NAV from AMFI. Previous cron didn't exist, so no daily data accumulated.

**Fix**: The cron will add 1 row per scheme per day. After 3 days (~June 20), some schemes will have 3+ data points and metrics will start populating. After ~60 days, full metrics become available.

### 3. `recommendation_score` still NULL
Score stays NULL until `calculate-fund-metrics` succeeds. Even after first success, the score will be based only on volatility_3y (very noisy with few data points). It will improve as data accumulates over several months.

### 4. Supabase CLI v2.106.0 blocked
`supabase db diff` and `supabase db pull` fail because Docker Desktop is not running. Cannot verify migration state or diff local vs remote schema. Upgrade CLI to v2.116.0+ for `timeout_seconds` support.

## 📋 Remaining Manual Steps
1. Set function timeouts in Dashboard (120s for both)
2. Verify cron jobs in Dashboard → Database → Cron
3. Wait 3+ days for NAV data to accumulate
4. Invoke calculate-fund-metrics manually after data accumulation to test
5. Verify recommendation_score is populated in fund_metrics table
