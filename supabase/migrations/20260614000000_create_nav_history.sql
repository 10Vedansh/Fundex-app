CREATE TABLE IF NOT EXISTS nav_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  nav NUMERIC,
  nav_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE nav_history ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_nav_history_scheme_code_date ON nav_history(scheme_code, nav_date);

CREATE INDEX IF NOT EXISTS idx_nav_history_nav_date ON nav_history(nav_date);
CREATE INDEX IF NOT EXISTS idx_nav_history_scheme_code ON nav_history(scheme_code);
