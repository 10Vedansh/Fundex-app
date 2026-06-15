-- Active Funds View
-- A fund is considered active if it has NAV data within the last 730 days (2 years).
-- This excludes merged, closed, and legacy schemes from recommendation engine input.

CREATE OR REPLACE VIEW active_funds AS
SELECT *
FROM fund_metrics
WHERE last_nav_date >= (CURRENT_DATE - INTERVAL '730 days')
  AND total_data_points >= 60;  -- Minimum meaningful data requirement

COMMENT ON VIEW active_funds IS 'Funds with NAV data within the last 2 years and at least 60 data points. Suitable for recommendation engine input.';

-- RLS: active_funds inherits from fund_metrics (RLS still applies)
-- For service_role queries (Edge Functions), RLS is bypassed automatically.
-- For future client-side queries, add policies on fund_metrics.

-- Grant access to anon and authenticated roles for SELECT
-- (only if RLS policies are added to fund_metrics)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fund_metrics' AND policyname = 'fund_metrics_select_anon'
  ) THEN
    CREATE POLICY fund_metrics_select_anon ON fund_metrics
      FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fund_metrics' AND policyname = 'fund_metrics_select_auth'
  ) THEN
    CREATE POLICY fund_metrics_select_auth ON fund_metrics
      FOR SELECT USING (true);
  END IF;
END
$$;

-- Counts for quick reference
CREATE OR REPLACE VIEW active_fund_stats AS
SELECT
  COUNT(*)::integer AS total_schemes,
  COUNT(*) FILTER (WHERE last_nav_date >= (CURRENT_DATE - INTERVAL '730 days'))::integer AS active_schemes,
  COUNT(*) FILTER (WHERE last_nav_date < (CURRENT_DATE - INTERVAL '730 days') OR last_nav_date IS NULL)::integer AS inactive_schemes,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE last_nav_date >= (CURRENT_DATE - INTERVAL '730 days')) / NULLIF(COUNT(*), 0),
    1
  ) AS active_pct,
  COUNT(*) FILTER (WHERE last_nav_date >= (CURRENT_DATE - INTERVAL '730 days') AND total_data_points >= 60)::integer AS active_investable
FROM fund_metrics;

COMMENT ON VIEW active_fund_stats IS 'Aggregated counts for fund activity analysis.';
