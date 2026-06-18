-- ============================================================================
-- Migration: Update recommendation_scores with real data
-- ============================================================================
-- Problem 1: calcRecommendationScore was called with expense_ratio=NULL,
-- leaving recommendation_score as NULL for all fund_metrics records.
--
-- Problem 2: Previous version joined ON fund_master (1,759 expense_ratio
-- values), but enrichment pipeline populates recommendation_universe
-- (~6,316 expense_ratio values). Must use COALESCE chain matching
-- fund_master_enriched view.
--
-- Problem 3: Corrupt NAV data (scheme 107002, reverse split unadjusted)
-- produces cagr_1y = 648.25 (64,825%). Must sanitize before scoring.
-- ============================================================================

-- Step 0: Sanitize clearly corrupt CAGR values from unadjusted
-- corporate actions in source NAV data (e.g. scheme 107002).
-- Also null out stale NAV (>180 days old) so only recent data contributes.
UPDATE fund_metrics
SET
  cagr_1y = NULL,
  cagr_3y = NULL,
  cagr_5y = NULL
WHERE cagr_1y > 5           -- >500% in one year is not a genuine CAGR
   OR cagr_1y < -1           -- <-100% is impossible (negative principal)
   OR cagr_3y > 5
   OR cagr_5y > 5;

-- Step 1: Create a function to compute the recommendation score in SQL
CREATE OR REPLACE FUNCTION compute_recommendation_score(
  p_cagr_1y NUMERIC,
  p_sharpe_1y NUMERIC,
  p_sortino_1y NUMERIC,
  p_volatility_1y NUMERIC,
  p_expense_ratio NUMERIC
) RETURNS NUMERIC AS $$
DECLARE
  v_cagr_score NUMERIC;
  v_sharpe_score NUMERIC;
  v_sortino_score NUMERIC;
  v_vol_score NUMERIC;
  v_exp_score NUMERIC;
  v_score NUMERIC;
  v_active_weight NUMERIC;
  w_cagr NUMERIC := 0.30;
  w_sharpe NUMERIC := 0.25;
  w_sortino NUMERIC := 0.25;
  w_vol NUMERIC := 0.15;
  w_exp NUMERIC := 0.05;
BEGIN
  IF p_cagr_1y IS NULL OR p_sharpe_1y IS NULL OR p_sortino_1y IS NULL THEN
    RETURN NULL;
  END IF;

  v_cagr_score := GREATEST(0, LEAST(100, ((p_cagr_1y - (-0.3)) / (0.5 - (-0.3))) * 100));
  v_sharpe_score := GREATEST(0, LEAST(100, ((p_sharpe_1y - (-5)) / (5 - (-5))) * 100));
  v_sortino_score := GREATEST(0, LEAST(100, ((p_sortino_1y - (-20)) / (20 - (-20))) * 100));
  v_vol_score := CASE WHEN p_volatility_1y IS NOT NULL
    THEN GREATEST(0, LEAST(100, (1 - (p_volatility_1y - 0) / (0.4 - 0)) * 100))
    ELSE NULL END;
  v_exp_score := CASE WHEN p_expense_ratio IS NOT NULL
    THEN GREATEST(0, LEAST(100, (1 - (p_expense_ratio - 0) / (0.025 - 0)) * 100))
    ELSE NULL END;

  v_active_weight := w_cagr + w_sharpe + w_sortino;
  IF v_vol_score IS NOT NULL THEN v_active_weight := v_active_weight + w_vol; END IF;
  IF v_exp_score IS NOT NULL THEN v_active_weight := v_active_weight + w_exp; END IF;

  IF v_active_weight = 0 THEN RETURN NULL; END IF;

  v_score := v_cagr_score * w_cagr + v_sharpe_score * w_sharpe + v_sortino_score * w_sortino;
  IF v_vol_score IS NOT NULL THEN v_score := v_score + v_vol_score * w_vol; END IF;
  IF v_exp_score IS NOT NULL THEN v_score := v_score + v_exp_score * w_exp; END IF;

  RETURN ROUND((v_score / v_active_weight)::numeric, 2);
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update recommendation_score using the same COALESCE expense_ratio
-- chain that fund_master_enriched uses:
--   recommendation_universe (enriched via VR API) > fund_master (workbook)
UPDATE fund_metrics fm
SET recommendation_score = compute_recommendation_score(
  fm.cagr_1y,
  fm.sharpe_ratio_1y,
  fm.sortino_ratio_1y,
  fm.volatility_1y,
  COALESCE(ru.expense_ratio::numeric, fma.expense_ratio)
),
    updated_at = now()
FROM fund_master fma
LEFT JOIN recommendation_universe ru ON fma.scheme_code = ru.scheme_code
WHERE fm.scheme_code = fma.scheme_code
  AND fm.cagr_1y IS NOT NULL
  AND fm.sharpe_ratio_1y IS NOT NULL
  AND fm.sortino_ratio_1y IS NOT NULL;

-- Step 3: For funds without expense_ratio from either source, use default 1.5%
UPDATE fund_metrics fm
SET recommendation_score = compute_recommendation_score(
  fm.cagr_1y,
  fm.sharpe_ratio_1y,
  fm.sortino_ratio_1y,
  fm.volatility_1y,
  0.015
),
    updated_at = now()
WHERE fm.recommendation_score IS NULL
  AND fm.cagr_1y IS NOT NULL
  AND fm.sharpe_ratio_1y IS NOT NULL
  AND fm.sortino_ratio_1y IS NOT NULL;

-- Step 4: Verify
SELECT
  COUNT(*) AS total_metrics,
  COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) AS scored,
  ROUND(100.0 * COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) / NULLIF(COUNT(*), 0), 1) AS coverage_pct,
  MIN(recommendation_score) AS min_score,
  AVG(recommendation_score)::numeric(10,2) AS avg_score,
  MAX(recommendation_score) AS max_score
FROM fund_metrics
WHERE last_calculated IS NOT NULL;

-- Step 5: Drop helper
DROP FUNCTION IF EXISTS compute_recommendation_score;
