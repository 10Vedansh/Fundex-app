-- ============================================================================
-- CATEGORY CLASSIFICATION — ROUND 2
-- Additional patterns discovered from remaining 1003 named-but-uncategorized funds.
-- ============================================================================

-- 2a: Fixed Term Plan / Fixed Term → Debt - Income (same as FMPs)
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FIXED TERM%';

-- 2b: Fixed Tenure / Fixed Duration → Debt - Income
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FIXED TENURE%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FIXED DURATION%');

-- 2c: Dual Advantage (hybrid with fixed tenure) → Hybrid - Conservative
UPDATE fund_master
SET category = 'Hybrid - Conservative'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%DUAL ADVANTAGE%';

-- 2d: SDFS (SBI Fixed Term deposits) → Debt - Income
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SDFS%';

-- 2e: FIIF (Fixed Income Investment Fund) → Debt - Income
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FIIF%';

-- 2f: Money Fund / Money Manager / MMF → Debt - Money Market
UPDATE fund_master
SET category = 'Debt - Money Market'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MONEY FUND%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MONEY MANAGER%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MMF%');

-- 2g: Insta Cash / Cash Fund → Debt - Liquid
UPDATE fund_master
SET category = 'Debt - Liquid'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%INSTA CASH%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% CASH FUND%');

-- 2h: Floating Interest → Debt - Floater
UPDATE fund_master
SET category = 'Debt - Floater'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FLOATING INTEREST%';

-- 2i: Treasury → Debt - Money Market
UPDATE fund_master
SET category = 'Debt - Money Market'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%TREASURY%';

-- 2j: G-Sec → Debt - Gilt
UPDATE fund_master
SET category = 'Debt - Gilt'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%G-SEC%';

-- 2k: Regular Savings Fund → Hybrid - Conservative
UPDATE fund_master
SET category = 'Hybrid - Conservative'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%REGULAR SAVINGS%';

-- 2l: Quant → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%QUANT%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%QUANTUM%';

-- 2m: Active Momentum / Momentum → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% MOMENTUM%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE 'MOMENTUM%');

-- 2n: Innovation / Innovative → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%INNOVATION%';

-- 2o: Ethical / ESG → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ETHICAL%';

-- 2p: Opportunities (funds with "Opportunities" in name) → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%OPPORTUNITIES%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%HOUSING%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%RURAL%';

-- 2q: Quality (funds with "Quality" in name) → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%QUALITY%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FACTOR%')
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%CREDIT%';

-- 2r: Exchange Traded (full name) → Other - ETF
UPDATE fund_master
SET category = 'Other - ETF'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%EXCHANGE TRADED%';

-- 2s: Rajiv Gandhi Equity Saving Scheme (RGESS) → Equity - ELSS
UPDATE fund_master
SET category = 'Equity - ELSS'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%RAJIV GANDHI%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%RGESS%');

-- 2t: Bal Bhavishya (Hindi for "Child Future") → Other - Solution Oriented
UPDATE fund_master
SET category = 'Other - Solution Oriented'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BAL BHAVISHYA%';

-- 2u: BFSI (Banking, Financial Services, Insurance) → Equity - Sectoral - Banking
UPDATE fund_master
SET category = 'Equity - Sectoral - Banking'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BFSI%';

-- 2v: Teck (Technology, Entertainment, Communication) → Equity - Sectoral - Technology
UPDATE fund_master
SET category = 'Equity - Sectoral - Technology'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%TECK%';

-- 2w: Energy → Equity - Sectoral - (no exact match, use Thematic)
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ENERGY%';

-- 2x: Commodities → Equity - Thematic (or Commodity - Gold but not specific to gold)
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%COMMODIT%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%GOLD%';

-- 2y: Housing → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%HOUSING%';

-- 2z: Rural → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%RURAL%';

-- 2aa: Transportation / Logistics → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%TRANSPORTATION%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%LOGISTICS%');

-- 2ab: Services Fund → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SERVICES FUND%';

-- 2ac: Conglomerate → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CONGLOMERATE%';

-- 2ad: Special Opportunities → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SPECIAL OPPORTUNITIES%';

-- 2ae: Multi Sector / Multi Factor → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MULTI SECTOR%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MULTI-FACTOR%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MULTI FACTOR%');

-- Final audit
SELECT 'ROUND2' AS phase,
  COUNT(*) FILTER (WHERE category = 'Unknown') AS unknown,
  COUNT(*) FILTER (WHERE category = 'Other - Unclassified') AS unclassified,
  COUNT(*) FILTER (WHERE category NOT IN ('Unknown', 'Other - Unclassified') AND category IS NOT NULL) AS classified,
  COUNT(*) AS total
FROM fund_master;
