-- ============================================================================
-- Pipeline Validation Queries
-- Run these in Supabase SQL Editor after the pipeline runs.
-- ============================================================================

-- 1. NAV rows updated today
SELECT
  COUNT(*) AS nav_rows_today,
  COUNT(DISTINCT scheme_code) AS distinct_schemes_today,
  MIN(nav_date) AS earliest_nav_date,
  MAX(nav_date) AS latest_nav_date
FROM nav_history
WHERE nav_date = CURRENT_DATE;

-- 2. fund_metrics updated today
SELECT
  COUNT(*) AS metrics_updated_today,
  COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) AS with_recommendation_score,
  MIN(last_calculated) AS earliest_calc,
  MAX(last_calculated) AS latest_calc
FROM fund_metrics
WHERE last_calculated::date = CURRENT_DATE;

-- 3. recommendation scores coverage
SELECT
  COUNT(*) AS total_funds,
  COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) AS scored,
  ROUND(100.0 * COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS coverage_pct,
  MIN(recommendation_score) AS min_score,
  AVG(recommendation_score)::numeric(10,2) AS avg_score,
  MAX(recommendation_score) AS max_score
FROM fund_metrics
WHERE last_calculated::date = CURRENT_DATE;

-- 4. Sample fund: full pipeline trace (nav_history → metrics → recommendation_score)
WITH sample AS (
  SELECT scheme_code
  FROM nav_history
  WHERE nav_date = CURRENT_DATE
  GROUP BY scheme_code
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
SELECT
  fm.scheme_code,
  fm.scheme_name,
  nh.nav_count,
  nh.first_nav,
  nh.last_nav,
  f.cagr_1y,
  f.cagr_3y,
  f.sharpe_ratio_1y,
  f.sharpe_ratio_3y,
  f.sortino_ratio_1y,
  f.sortino_ratio_3y,
  f.volatility_1y,
  f.volatility_3y,
  f.consistency_score,
  f.confidence_score,
  f.recommendation_score,
  f.last_calculated
FROM sample s
JOIN fund_metrics f ON s.scheme_code = f.scheme_code
JOIN LATERAL (
  SELECT
    COUNT(*) AS nav_count,
    MIN(nav_date)::text AS first_nav,
    MAX(nav_date)::text AS last_nav
  FROM nav_history
  WHERE scheme_code = s.scheme_code
) nh ON true
LEFT JOIN fund_master fm ON s.scheme_code = fm.scheme_code;

-- 5. Pipeline staleness check
SELECT
  'nav_history' AS source,
  COUNT(*) AS total_rows,
  MAX(nav_date)::text AS latest_data_date,
  CASE
    WHEN MAX(nav_date) >= CURRENT_DATE - INTERVAL '2 days' THEN 'fresh'
    ELSE 'stale'
  END AS status
FROM nav_history
UNION ALL
SELECT
  'fund_metrics' AS source,
  COUNT(*) AS total_rows,
  MAX(last_calculated)::text AS latest_data_date,
  CASE
    WHEN MAX(last_calculated) >= CURRENT_DATE - INTERVAL '2 days' THEN 'fresh'
    ELSE 'stale'
  END AS status
FROM fund_metrics;
