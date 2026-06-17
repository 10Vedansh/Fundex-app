-- Add recommendation_universe fallback to fund_master_enriched
-- Purpose: Bridge the enrichment gap so VR-enriched metadata reaches the frontend
-- 
-- Before: fm.expense_ratio → 1,759 non-null (5.2%)
--          fm.aum → 1,767 non-null (5.2%)
--          fm.fund_manager → 1,805 non-null (5.3%)
-- After:  COALESCE(ru.xxx, fm.xxx) →
--          expense_ratio → ~5,883 non-null (72.7%)
--          aum → ~5,941 non-null (73.4%)
--          fund_manager → ~8,095 non-null (100%)
--
-- AMC handling is UNCHANGED — keeps fm.amc as the source.

-- Must DROP first because COALESCE(ru.double precision, fm.numeric) changes column type
-- and CREATE OR REPLACE VIEW does not allow changing existing column types.
DROP VIEW IF EXISTS fund_master_enriched CASCADE;

CREATE VIEW fund_master_enriched AS
SELECT
  -- Primary identifier
  fm.scheme_code,

  -- Names
  COALESCE(fm.workbook_name, fm.scheme_name, f.scheme_name) AS scheme_name,
  fm.workbook_name,
  fm.amc,
  fm.category,

  -- Workbook cross-reference
  fm.workbook_id,
  fm.match_confidence,
  fm.match_method,

  -- Enriched metadata: prefer recommendation_universe, fall back to fund_master
  COALESCE(ru.expense_ratio::numeric, fm.expense_ratio) AS expense_ratio,
  COALESCE(ru.aum::numeric, fm.aum) AS aum,
  COALESCE(ru.fund_manager, fm.fund_manager) AS fund_manager,
  fm.beta,
  fm.alpha,
  fm.std_dev,
  fm.is_active,
  fm.launch_date,
  fm.last_nav_date,
  fm.first_nav_date,
  fm.total_data_points,

  -- Returns from fund_metrics (calculated from NAV data)
  f.return_1m,
  f.return_3m,
  f.return_6m,
  f.cagr_1y,
  f.cagr_3y,
  f.cagr_5y,

  -- Risk from fund_metrics
  f.volatility_1y,
  f.volatility_3y,
  f.volatility_5y,
  f.max_drawdown,

  -- Risk-adjusted from fund_metrics
  f.sharpe_ratio_1y,
  f.sharpe_ratio_3y,
  f.sharpe_ratio_5y,
  f.sortino_ratio_1y,
  f.sortino_ratio_3y,
  f.sortino_ratio_5y,

  -- Quality from fund_metrics
  f.consistency_score,
  f.confidence_score,
  f.recommendation_score,

  -- Additional fund_metrics fields
  f.net_assets,
  f.turnover,
  f.min_investment,
  f.exit_load,
  f.benchmark,
  f.avg_credit_quality,
  f.avg_maturity,
  f.ytm,
  f.ret_1w,
  f.ret_1y_overall,
  f.ret_3y_overall,
  f.ret_5y_overall,
  f.ret_10y_overall,

  -- Audit
  fm.matched_at,
  fm.updated_at AS fund_master_updated_at,
  f.last_calculated AS metrics_last_calculated

FROM fund_master fm
LEFT JOIN fund_metrics f ON fm.scheme_code = f.scheme_code
LEFT JOIN recommendation_universe ru ON fm.scheme_code = ru.scheme_code
WHERE fm.match_method IS DISTINCT FROM 'unmatched';

COMMENT ON VIEW fund_master_enriched IS 'Primary data source for CIFRAA. Joins fund_master + fund_metrics + recommendation_universe for VR-enriched metadata.';
