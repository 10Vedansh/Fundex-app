-- Make portfolio_holdings policies idempotent after 20260613000000
-- so the migration chain can continue.

DROP POLICY IF EXISTS "Users can view their own portfolio holdings" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can insert their own portfolio holdings" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can update their own portfolio holdings" ON portfolio_holdings;
DROP POLICY IF EXISTS "Users can delete their own portfolio holdings" ON portfolio_holdings;

CREATE POLICY "Users can view their own portfolio holdings"
  ON portfolio_holdings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own portfolio holdings"
  ON portfolio_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own portfolio holdings"
  ON portfolio_holdings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio holdings"
  ON portfolio_holdings FOR DELETE
  USING (auth.uid() = user_id);
