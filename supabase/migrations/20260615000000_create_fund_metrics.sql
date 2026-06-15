CREATE TABLE IF NOT EXISTS fund_metrics (
  -- Primary Key
  scheme_code TEXT PRIMARY KEY,

  -- Identity
  scheme_name TEXT NOT NULL,
  category TEXT,
  amc TEXT,

  -- Returns
  return_1m NUMERIC,
  return_3m NUMERIC,
  return_6m NUMERIC,
  cagr_1y NUMERIC,
  cagr_3y NUMERIC,
  cagr_5y NUMERIC,

  -- Risk
  volatility_1y NUMERIC,
  volatility_3y NUMERIC,
  volatility_5y NUMERIC,
  max_drawdown NUMERIC,

  -- Risk Adjusted
  sharpe_ratio_1y NUMERIC,
  sharpe_ratio_3y NUMERIC,
  sharpe_ratio_5y NUMERIC,
  sortino_ratio_1y NUMERIC,
  sortino_ratio_3y NUMERIC,
  sortino_ratio_5y NUMERIC,

  -- Quality
  consistency_score NUMERIC,
  confidence_score NUMERIC,
  recommendation_score NUMERIC,

  -- Metadata
  first_nav_date DATE,
  last_nav_date DATE,
  total_data_points INTEGER,
  last_calculated TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE fund_metrics ENABLE ROW LEVEL SECURITY;

-- Filters
CREATE INDEX IF NOT EXISTS idx_fund_metrics_category ON fund_metrics(category);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_amc ON fund_metrics(amc);

-- Return rankings
CREATE INDEX IF NOT EXISTS idx_fund_metrics_cagr_1y ON fund_metrics(cagr_1y DESC);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_cagr_3y ON fund_metrics(cagr_3y DESC);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_cagr_5y ON fund_metrics(cagr_5y DESC);

-- Risk-adjusted rankings
CREATE INDEX IF NOT EXISTS idx_fund_metrics_sharpe_1y ON fund_metrics(sharpe_ratio_1y DESC);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_sharpe_3y ON fund_metrics(sharpe_ratio_3y DESC);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_sharpe_5y ON fund_metrics(sharpe_ratio_5y DESC);

-- Quality score rankings
CREATE INDEX IF NOT EXISTS idx_fund_metrics_consistency ON fund_metrics(consistency_score DESC);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_confidence ON fund_metrics(confidence_score DESC);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_recommendation ON fund_metrics(recommendation_score DESC);

-- Admin / staleness check
CREATE INDEX IF NOT EXISTS idx_fund_metrics_last_calculated ON fund_metrics(last_calculated DESC);
