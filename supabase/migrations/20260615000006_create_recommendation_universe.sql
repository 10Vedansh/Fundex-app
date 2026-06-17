-- Create recommendation_universe table
-- Phase 5.4A: Clean investable recommendation universe

CREATE TABLE IF NOT EXISTS recommendation_universe (
    scheme_code          TEXT PRIMARY KEY,
    scheme_name          TEXT NOT NULL,
    category             TEXT NOT NULL DEFAULT '',
    amc                  TEXT NOT NULL DEFAULT '',
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    source_scheme_count  INTEGER NOT NULL DEFAULT 1,
    canonical_fund_key  TEXT NOT NULL DEFAULT '',
    total_data_points    INTEGER,
    last_nav_date        TEXT,
    cagr_3y              DOUBLE PRECISION,
    sharpe_ratio_3y      DOUBLE PRECISION,
    sortino_ratio_3y     DOUBLE PRECISION,
    volatility_3y        DOUBLE PRECISION,
    expense_ratio        DOUBLE PRECISION,
    aum                  DOUBLE PRECISION,
    fund_manager         TEXT DEFAULT '',
    match_method         TEXT DEFAULT '',
    has_workbook_enrich  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup by canonical_fund_key
CREATE INDEX IF NOT EXISTS idx_recommendation_universe_key
    ON recommendation_universe (canonical_fund_key);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_recommendation_universe_category
    ON recommendation_universe (category);

-- Index for AMC filtering
CREATE INDEX IF NOT EXISTS idx_recommendation_universe_amc
    ON recommendation_universe (amc);

-- Enable RLS
ALTER TABLE recommendation_universe ENABLE ROW LEVEL SECURITY;

-- Allow public read access (same as fund_master)
CREATE POLICY recommendation_universe_select ON recommendation_universe
    FOR SELECT USING (TRUE);

-- Service role can manage
CREATE POLICY recommendation_universe_insert ON recommendation_universe
    FOR INSERT WITH CHECK (true);

CREATE POLICY recommendation_universe_update ON recommendation_universe
    FOR UPDATE USING (true);

CREATE POLICY recommendation_universe_delete ON recommendation_universe
    FOR DELETE USING (true);
