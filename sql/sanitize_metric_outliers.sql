-- ============================================================================
-- SANITIZE METRIC OUTLIERS IN fund_metrics
-- ============================================================================
-- Root cause analysis:
--
-- 3 classes of impossible metrics were identified:
--
-- CLASS 1: Segregated Portfolios (CAGR 300-400%)
--   Funds like "Nippon India Credit Risk Fund - Segregated Portfolio 1"
--   had NAV near zero after credit event, then partially recovered.
--   CAGR formula: (latest_nav / past_nav)^(1/years) - 1 = 340%.
--   Economically meaningless — the fund went from near-zero to slightly less zero.
--   Bounds: CAGR > 1.0 (100%) is impossible for any debt fund.
--
-- CLASS 2: Liquid Fund Bonus Plans (Sharpe > 100-265)
--   Funds like "DHFL Pramerica Liquid Fund - Bonus Option"
--   have CAGR ~9% (normal) but volatility ~0.0001 (near-zero).
--   Sharpe = (0.09-0.065)/0.0001 = 250. Mathematically correct but meaningless.
--   The recommendation_score clamps Sharpe >5 to 100, giving them perfect score.
--   Bounds: Sharpe > 10 is unreasonable for any fund category.
--
-- CLASS 3: Orphan Sharpe/Sortino from old CAGR (Sortino 4M+)
--   Funds like "Essel Ultra Short Term Fund"
--   had CAGR sanitized to NULL in a later code update, but Sharpe and Sortino
--   were computed BEFORE sanitization and never cleaned up.
--   Bounds: Sortino > 20 is impossible; Sharpe > 10 is impossible.
--
-- Fix: NULL out impossible values, then recalculate recommendation_score.
-- ============================================================================

-- STEP 1: Audit report — count outliers before cleanup
SELECT 'BEFORE SANITIZATION' as phase;

SELECT
  COUNT(*) FILTER (WHERE cagr_1y > 1 OR cagr_1y < -1) AS cagr_1y_outliers,
  COUNT(*) FILTER (WHERE cagr_3y > 1 OR cagr_3y < -1) AS cagr_3y_outliers,
  COUNT(*) FILTER (WHERE cagr_5y > 1 OR cagr_5y < -1) AS cagr_5y_outliers,
  COUNT(*) FILTER (WHERE sharpe_ratio_1y > 10 OR sharpe_ratio_1y < -10) AS sharpe_1y_outliers,
  COUNT(*) FILTER (WHERE sharpe_ratio_3y > 10 OR sharpe_ratio_3y < -10) AS sharpe_3y_outliers,
  COUNT(*) FILTER (WHERE sharpe_ratio_5y > 10 OR sharpe_ratio_5y < -10) AS sharpe_5y_outliers,
  COUNT(*) FILTER (WHERE sortino_ratio_1y > 20 OR sortino_ratio_1y < -20) AS sortino_1y_outliers,
  COUNT(*) FILTER (WHERE sortino_ratio_3y > 20 OR sortino_ratio_3y < -20) AS sortino_3y_outliers,
  COUNT(*) FILTER (WHERE sortino_ratio_5y > 20 OR sortino_ratio_5y < -20) AS sortino_5y_outliers,
  COUNT(*) AS total_funds
FROM fund_metrics;

-- STEP 2: Sample the worst offenders
SELECT scheme_code, scheme_name,
  CASE
    WHEN cagr_1y > 1 OR cagr_1y < -1 THEN 'CAGR-1Y'
    WHEN sharpe_ratio_1y > 10 OR sharpe_ratio_1y < -10 THEN 'SHARPE-1Y'
    WHEN sortino_ratio_1y > 20 OR sortino_ratio_1y < -20 THEN 'SORTINO-1Y'
  END AS outlier_type,
  cagr_1y, cagr_3y, cagr_5y,
  sharpe_ratio_1y, sortino_ratio_1y, volatility_1y,
  consistency_score, confidence_score
FROM fund_metrics
WHERE cagr_1y > 1 OR cagr_3y > 1 OR cagr_5y > 1
   OR sharpe_ratio_1y > 10 OR sharpe_ratio_3y > 10 OR sharpe_ratio_5y > 10
   OR sortino_ratio_1y > 20 OR sortino_ratio_3y > 20 OR sortino_ratio_5y > 20
ORDER BY GREATEST(
  COALESCE(cagr_1y, 0), COALESCE(cagr_3y, 0), COALESCE(cagr_5y, 0),
  COALESCE(sharpe_ratio_1y, 0), COALESCE(sortino_ratio_1y, 0)
) DESC
LIMIT 50;

-- STEP 3: Null out impossible CAGR values
UPDATE fund_metrics
SET
  cagr_1y = NULL,
  cagr_3y = NULL,
  cagr_5y = NULL
WHERE cagr_1y > 1 OR cagr_1y < -1
   OR cagr_3y > 1 OR cagr_3y < -1
   OR cagr_5y > 1 OR cagr_5y < -1;

-- STEP 4: Null out impossible Sharpe values
UPDATE fund_metrics
SET
  sharpe_ratio_1y = NULL,
  sharpe_ratio_3y = NULL,
  sharpe_ratio_5y = NULL
WHERE sharpe_ratio_1y > 10 OR sharpe_ratio_1y < -10
   OR sharpe_ratio_3y > 10 OR sharpe_ratio_3y < -10
   OR sharpe_ratio_5y > 10 OR sharpe_ratio_5y < -10;

-- STEP 5: Null out impossible Sortino values
UPDATE fund_metrics
SET
  sortino_ratio_1y = NULL,
  sortino_ratio_3y = NULL,
  sortino_ratio_5y = NULL
WHERE sortino_ratio_1y > 20 OR sortino_ratio_1y < -20
   OR sortino_ratio_3y > 20 OR sortino_ratio_3y < -20
   OR sortino_ratio_5y > 20 OR sortino_ratio_5y < -20;

-- STEP 6: Null out impossible Volatility values
UPDATE fund_metrics
SET
  volatility_1y = NULL,
  volatility_3y = NULL,
  volatility_5y = NULL
WHERE volatility_1y > 2 OR volatility_1y < 0
   OR volatility_3y > 2 OR volatility_3y < 0
   OR volatility_5y > 2 OR volatility_5y < 0;

-- STEP 6a: Null recommendation_score for funds that lost ALL main metrics
UPDATE fund_metrics
SET recommendation_score = NULL
WHERE cagr_1y IS NULL AND cagr_3y IS NULL AND cagr_5y IS NULL
  AND sharpe_ratio_1y IS NULL AND sharpe_ratio_3y IS NULL AND sharpe_ratio_5y IS NULL
  AND sortino_ratio_1y IS NULL AND sortino_ratio_3y IS NULL AND sortino_ratio_5y IS NULL
  AND recommendation_score IS NOT NULL;

-- STEP 7: Recalculate recommendation_score for remaining scored funds
-- Using the same bounds as the edge function's calcRecommendationScore:
-- CAGR: min -0.3, max 0.5
-- Sharpe: min -5, max 5
-- Sortino: min -20, max 20
-- Vol: min 0, max 0.4
-- Expense: min 0, max 0.025
-- Weights: CAGR 30%, Sharpe 25%, Sortino 25%, Vol 15%, Expense 5%
DO $$
DECLARE
  rec RECORD;
  cagr_score NUMERIC;
  sharpe_score NUMERIC;
  sortino_score NUMERIC;
  vol_score NUMERIC;
  exp_score NUMERIC;
  w_cagr NUMERIC := 0.30;
  w_sharpe NUMERIC := 0.25;
  w_sortino NUMERIC := 0.25;
  w_vol NUMERIC := 0.15;
  w_exp NUMERIC := 0.05;
  active_weight NUMERIC;
  total_score NUMERIC;
BEGIN
  FOR rec IN SELECT * FROM fund_metrics WHERE
    cagr_1y IS NOT NULL OR sharpe_ratio_1y IS NOT NULL OR sortino_ratio_1y IS NOT NULL
  LOOP
    cagr_score := GREATEST(0, LEAST(100, ((COALESCE(rec.cagr_1y, -0.3) - (-0.3)) / (0.5 - (-0.3))) * 100));
    sharpe_score := GREATEST(0, LEAST(100, ((COALESCE(rec.sharpe_ratio_1y, -5) - (-5)) / (5 - (-5))) * 100));
    sortino_score := GREATEST(0, LEAST(100, ((COALESCE(rec.sortino_ratio_1y, -20) - (-20)) / (20 - (-20))) * 100));

    IF rec.volatility_1y IS NOT NULL THEN
      vol_score := GREATEST(0, LEAST(100, (1 - (rec.volatility_1y - 0) / (0.4 - 0)) * 100));
    ELSE
      vol_score := NULL;
    END IF;

    IF rec.expense_ratio IS NOT NULL THEN
      exp_score := GREATEST(0, LEAST(100, (1 - (rec.expense_ratio - 0) / (0.025 - 0)) * 100));
    ELSE
      exp_score := NULL;
    END IF;

    active_weight := w_cagr + w_sharpe + w_sortino;
    IF vol_score IS NOT NULL THEN active_weight := active_weight + w_vol; END IF;
    IF exp_score IS NOT NULL THEN active_weight := active_weight + w_exp; END IF;

    IF active_weight > 0 THEN
      total_score := cagr_score * w_cagr + sharpe_score * w_sharpe + sortino_score * w_sortino;
      IF vol_score IS NOT NULL THEN total_score := total_score + vol_score * w_vol; END IF;
      IF exp_score IS NOT NULL THEN total_score := total_score + exp_score * w_exp; END IF;
      total_score := ROUND((total_score / active_weight)::numeric, 2);
    ELSE
      total_score := NULL;
    END IF;

    UPDATE fund_metrics SET recommendation_score = total_score
    WHERE scheme_code = rec.scheme_code;
  END LOOP;
END $$;

-- STEP 8: Audit report — confirm cleanup
SELECT 'AFTER SANITIZATION' as phase;

SELECT
  COUNT(*) FILTER (WHERE cagr_1y > 1 OR cagr_1y < -1) AS cagr_1y_outliers,
  COUNT(*) FILTER (WHERE cagr_3y > 1 OR cagr_3y < -1) AS cagr_3y_outliers,
  COUNT(*) FILTER (WHERE cagr_5y > 1 OR cagr_5y < -1) AS cagr_5y_outliers,
  COUNT(*) FILTER (WHERE sharpe_ratio_1y > 10 OR sharpe_ratio_1y < -10) AS sharpe_1y_outliers,
  COUNT(*) FILTER (WHERE sharpe_ratio_3y > 10 OR sharpe_ratio_3y < -10) AS sharpe_3y_outliers,
  COUNT(*) FILTER (WHERE sharpe_ratio_5y > 10 OR sharpe_ratio_5y < -10) AS sharpe_5y_outliers,
  COUNT(*) FILTER (WHERE sortino_ratio_1y > 20 OR sortino_ratio_1y < -20) AS sortino_1y_outliers,
  COUNT(*) FILTER (WHERE sortino_ratio_3y > 20 OR sortino_ratio_3y < -20) AS sortino_3y_outliers,
  COUNT(*) FILTER (WHERE sortino_ratio_5y > 20 OR sortino_ratio_5y < -20) AS sortino_5y_outliers,
  ROUND(AVG(recommendation_score)::numeric, 2) AS avg_rec_score,
  ROUND(MIN(recommendation_score)::numeric, 2) AS min_rec_score,
  ROUND(MAX(recommendation_score)::numeric, 2) AS max_rec_score,
  COUNT(*) FILTER (WHERE recommendation_score IS NOT NULL) AS scored_funds
FROM fund_metrics;

-- STEP 8: Top funds by recommendation_score after cleanup
SELECT f.scheme_code, f.scheme_name, f.category,
  f.cagr_1y, f.sharpe_ratio_1y, f.sortino_ratio_1y,
  f.volatility_1y, f.recommendation_score
FROM fund_metrics f
WHERE f.recommendation_score IS NOT NULL
ORDER BY f.recommendation_score DESC
LIMIT 20;
