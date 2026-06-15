-- Fund Master Enriched View
-- Joins fund_master + fund_metrics into a single denormalized view
-- for the recommendation engine and API layer.
-- This view is the PRIMARY data source for all CIFRAA systems going forward.

CREATE OR REPLACE VIEW fund_master_enriched AS
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

  -- Metrics from fund_master (workbook-enriched, preferred source)
  fm.expense_ratio,
  fm.aum,
  fm.fund_manager,
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

  -- Additional fund_metrics fields (from 20260615000001 migration)
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
WHERE fm.match_method IS DISTINCT FROM 'unmatched';
-- Exclude workbook-only entries that couldn't be mapped to any scheme_code

COMMENT ON VIEW fund_master_enriched IS 'Primary data source for CIFRAA recommendation engine. Joins fund_master + fund_metrics.';
