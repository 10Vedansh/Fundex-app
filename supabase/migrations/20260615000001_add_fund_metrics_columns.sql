-- Extend fund_metrics with fields needed by the recommendation engine.
-- These are populated from Value Research workbook data (fund_cache) as a one-time backfill.
-- Long-term goal: source from AMFI / free data sources.

ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS expense_ratio NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS net_assets NUMERIC;          -- AUM in crores
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS fund_manager TEXT;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS launch_date DATE;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS turnover NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS min_investment NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS exit_load TEXT;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS benchmark TEXT;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS beta NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS alpha NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS std_dev NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS avg_credit_quality TEXT;     -- Debt only
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS avg_maturity NUMERIC;       -- Debt only
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS ytm NUMERIC;               -- Debt only
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS sortino_ratio NUMERIC;      -- Overall (preferred field)
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS ret_1w NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS ret_1y_overall NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS ret_3y_overall NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS ret_5y_overall NUMERIC;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS ret_10y_overall NUMERIC;

-- Index for active fund queries
CREATE INDEX IF NOT EXISTS idx_fund_metrics_last_nav_date ON fund_metrics(last_nav_date DESC);

-- Index for expense/AUM filters used by recommendation engine
CREATE INDEX IF NOT EXISTS idx_fund_metrics_expense_ratio ON fund_metrics(expense_ratio ASC);
CREATE INDEX IF NOT EXISTS idx_fund_metrics_net_assets ON fund_metrics(net_assets DESC);

-- Composite index for diversification / AMC ranking
CREATE INDEX IF NOT EXISTS idx_fund_metrics_amc_category ON fund_metrics(amc, category);

-- Enable auto-update for updated_at
CREATE OR REPLACE FUNCTION update_fund_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fund_metrics_updated_at ON fund_metrics;
CREATE TRIGGER trigger_fund_metrics_updated_at
  BEFORE UPDATE ON fund_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_fund_metrics_updated_at();
