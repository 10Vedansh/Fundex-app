# nav_history Audit Log

## Last Ingestion Run
- **Date:** _Pending first run_
- **Duration:** _N/A_

## Summary
- **Total funds imported:** _N/A_
- **Date range in nav_history:** _N/A_
- **Rows inserted:** _N/A_
- **Rows skipped (duplicates):** _N/A_

## Sample Records

| scheme_code | scheme_name | nav | nav_date | created_at |
|-------------|-------------|-----|----------|------------|
| _N/A_ | _N/A_ | _N/A_ | _N/A_ | _N/A_ |

## Schema

```sql
CREATE TABLE nav_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_code TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  nav NUMERIC,
  nav_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: one NAV per scheme per day
CREATE UNIQUE INDEX idx_nav_history_scheme_code_date ON nav_history(scheme_code, nav_date);
CREATE INDEX idx_nav_history_nav_date ON nav_history(nav_date);
CREATE INDEX idx_nav_history_scheme_code ON nav_history(scheme_code);
```
