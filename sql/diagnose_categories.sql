-- Diagnostic: Check what categories the "problem" funds belong to
-- Run in Supabase SQL Editor

-- 1. Categories for funds with international/NASDAQ/US/Global/Silver keywords
SELECT category, COUNT(*) as cnt,
       STRING_AGG(scheme_name, '; ' ORDER BY scheme_name) AS examples
FROM fund_master_enriched
WHERE (
  LOWER(scheme_name) LIKE '%nasdaq%' OR
  LOWER(scheme_name) LIKE '%s&p 500%' OR
  LOWER(scheme_name) LIKE '%us equity%' OR
  LOWER(scheme_name) LIKE '%silver%' OR
  LOWER(scheme_name) LIKE '%world%' OR
  LOWER(scheme_name) LIKE '%international%' OR
  LOWER(scheme_name) LIKE '%global%' OR
  LOWER(scheme_name) LIKE '%s&p500%'
)
GROUP BY category
ORDER BY cnt DESC;

-- 2. Category distribution in production
SELECT category, COUNT(*) as cnt
FROM fund_master_enriched
WHERE category IS NOT NULL AND category != ''
GROUP BY category
ORDER BY cnt DESC;

-- 3. CAGR range for debt funds (DT-* categories)
SELECT category,
       COUNT(*) as cnt,
       ROUND(MIN(cagr_3y)::numeric, 6) as min_cagr_3y,
       ROUND(AVG(cagr_3y)::numeric, 6) as avg_cagr_3y,
       ROUND(MAX(cagr_3y)::numeric, 6) as max_cagr_3y,
       ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY cagr_3y)::numeric, 6) as p25_cagr_3y,
       ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY cagr_3y)::numeric, 6) as median_cagr_3y,
       ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY cagr_3y)::numeric, 6) as p75_cagr_3y
FROM fund_master_enriched
WHERE category LIKE 'DT-%' AND cagr_3y IS NOT NULL AND cagr_3y > 0
GROUP BY category
ORDER BY category;

-- 4. Funds with very low CAGR (< 0.005 = 0.5%)
SELECT scheme_code, scheme_name, category, cagr_3y
FROM fund_master_enriched
WHERE cagr_3y IS NOT NULL AND cagr_3y < 0.005 AND cagr_3y > 0
ORDER BY cagr_3y
LIMIT 20;

-- 5. CAGR distribution (buckets)
SELECT
  CASE
    WHEN cagr_3y IS NULL THEN 'NULL'
    WHEN cagr_3y < 0 THEN 'negative'
    WHEN cagr_3y < 0.03 THEN '0-3%'
    WHEN cagr_3y < 0.06 THEN '3-6%'
    WHEN cagr_3y < 0.10 THEN '6-10%'
    WHEN cagr_3y < 0.15 THEN '10-15%'
    WHEN cagr_3y < 0.25 THEN '15-25%'
    WHEN cagr_3y < 0.50 THEN '25-50%'
    ELSE '50%+'
  END AS cagr_bucket,
  COUNT(*) as cnt
FROM fund_master_enriched
GROUP BY cagr_bucket
ORDER BY cagr_bucket;
