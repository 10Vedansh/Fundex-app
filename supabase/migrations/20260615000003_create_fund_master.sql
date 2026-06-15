-- Master Fund Registry
-- Maps workbook fund IDs ↔ AMFI scheme codes ↔ fund_metrics records
-- Provides a permanent cross-reference layer for all CIFRAA systems.

CREATE TABLE IF NOT EXISTS fund_master (
  -- Primary identifier (AMFI scheme code)
  scheme_code TEXT PRIMARY KEY,

  -- Names (from AMFI)
  scheme_name TEXT,
  normalized_scheme_name TEXT,
  amc TEXT,
  category TEXT,

  -- Workbook cross-reference
  workbook_id TEXT,
  workbook_name TEXT,
  match_confidence TEXT CHECK (match_confidence IN ('high', 'medium', 'low')),

  -- Workbook metadata (enriched)
  expense_ratio NUMERIC,
  aum NUMERIC,
  fund_manager TEXT,
  launch_date DATE,
  beta NUMERIC,
  alpha NUMERIC,
  std_dev NUMERIC,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_nav_date DATE,
  total_data_points INTEGER,
  first_nav_date DATE,

  -- Audit
  match_method TEXT,  -- 'exact', 'normalized', 'fuzzy', 'amc_fuzzy', 'manual'
  matched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fund_master_workbook_id ON fund_master(workbook_id);
CREATE INDEX IF NOT EXISTS idx_fund_master_is_active ON fund_master(is_active);
CREATE INDEX IF NOT EXISTS idx_fund_master_amc ON fund_master(amc);
CREATE INDEX IF NOT EXISTS idx_fund_master_category ON fund_master(category);
CREATE INDEX IF NOT EXISTS idx_fund_master_confidence ON fund_master(match_confidence);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_fund_master_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fund_master_updated_at ON fund_master;
CREATE TRIGGER trigger_fund_master_updated_at
  BEFORE UPDATE ON fund_master
  FOR EACH ROW
  EXECUTE FUNCTION update_fund_master_updated_at();

-- RLS: public read, service_role write
ALTER TABLE fund_master ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fund_master' AND policyname = 'fund_master_select_anon'
  ) THEN
    CREATE POLICY fund_master_select_anon ON fund_master FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'fund_master' AND policyname = 'fund_master_select_auth'
  ) THEN
    CREATE POLICY fund_master_select_auth ON fund_master FOR SELECT USING (true);
  END IF;
END
$$;
