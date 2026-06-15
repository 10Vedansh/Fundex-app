-- Create portfolio_holdings table for persistent CAMS portfolio storage
CREATE TABLE IF NOT EXISTS portfolio_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fund_name TEXT NOT NULL,
  amc TEXT,
  folio_number TEXT,
  units NUMERIC,
  nav NUMERIC,
  current_value NUMERIC,
  cost_value NUMERIC,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE portfolio_holdings ENABLE ROW LEVEL SECURITY;

-- Users can only view their own holdings
DROP POLICY IF EXISTS "Users can view their own portfolio holdings" ON portfolio_holdings;
CREATE POLICY "Users can view their own portfolio holdings"
  ON portfolio_holdings FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own holdings
DROP POLICY IF EXISTS "Users can insert their own portfolio holdings" ON portfolio_holdings;
CREATE POLICY "Users can insert their own portfolio holdings"
  ON portfolio_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own holdings
DROP POLICY IF EXISTS "Users can update their own portfolio holdings" ON portfolio_holdings;
CREATE POLICY "Users can update their own portfolio holdings"
  ON portfolio_holdings FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own holdings
DROP POLICY IF EXISTS "Users can delete their own portfolio holdings" ON portfolio_holdings;
CREATE POLICY "Users can delete their own portfolio holdings"
  ON portfolio_holdings FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_id ON portfolio_holdings(user_id);
