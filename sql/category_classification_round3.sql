-- ============================================================================
-- CATEGORY CLASSIFICATION — ROUND 3
-- Remaining edge cases from the final ~259 named uncategorized funds.
-- ============================================================================

-- 3a: Government Securities → Debt - Gilt (including misspelled "Govenment")
UPDATE fund_master
SET category = 'Debt - Gilt'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%GOVERNMENT SECURIT%';

-- 3b: Short Maturity → Debt - Short Duration
UPDATE fund_master
SET category = 'Debt - Short Duration'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SHORT MATURITY%';

-- 3c: Close Ended / Close-Ended → check category context. Default to Equity - Thematic for equity funds.
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CLOSE ENDED%';

-- 3d: Asian Equity / ASEAN → Other - International
UPDATE fund_master
SET category = 'Other - International'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ASIAN EQUITY%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ASEAN%');

-- 3e: Recently Listed IPO / IPO Fund → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%IPO%';

-- 3f: Build India → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BUILD INDIA%';

-- 3g: Best-in-Class Strategy → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BEST-IN-CLASS%';

-- 3h: T.I.G.E.R. Fund → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%T.I.G.E.R.%';

-- 3i: Flexi-Debt → Debt - Dynamic Bond (flexible debt allocation)
UPDATE fund_master
SET category = 'Debt - Dynamic Bond'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FLEXI-DEBT%';

-- 3j: Bond Regular Plan / Bond-Deposit → Debt - Income (generic bond funds)
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BOND REGULAR%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BOND-DEPOSIT%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE 'BOND PLAN%');

-- 3k: Bond Fund (generic, not otherwise classified) → Debt - Income
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BOND FUND%';

-- 3l: Fixed Matuirty (misspelling of Fixed Maturity) → Debt - Income
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FIXED MATUIRTY%';

-- 3m: Master Equity Plan → Equity - Flexi Cap (UTI's diversified equity fund)
UPDATE fund_master
SET category = 'Equity - Flexi Cap'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MASTER EQUITY%';

-- 3n: Savings Fund (not Regular Savings) → Hybrid - Conservative
UPDATE fund_master
SET category = 'Hybrid - Conservative'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SAVINGS FUND%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%REGULAR SAVINGS%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%EQUITY SAVINGS%';

-- Final audit
SELECT 'ROUND3' AS phase,
  COUNT(*) FILTER (WHERE category = 'Unknown') AS unknown,
  COUNT(*) FILTER (WHERE category = 'Other - Unclassified') AS unclassified,
  COUNT(*) FILTER (WHERE category NOT IN ('Unknown', 'Other - Unclassified') AND category IS NOT NULL) AS classified,
  COUNT(*) AS total
FROM fund_master;
