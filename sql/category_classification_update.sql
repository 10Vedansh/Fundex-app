-- ============================================================================
-- CATEGORY CLASSIFICATION UPDATE
-- Maps uncategorized funds (Unknown, Other - Unclassified) to proper categories
-- based on scheme name pattern analysis.
-- ============================================================================

-- STEP 0: Audit — current state
SELECT 'BEFORE' AS phase,
  COUNT(*) FILTER (WHERE category = 'Unknown') AS unknown,
  COUNT(*) FILTER (WHERE category = 'Other - Unclassified') AS unclassified,
  COUNT(*) FILTER (WHERE category NOT IN ('Unknown', 'Other - Unclassified') AND category IS NOT NULL) AS classified,
  COUNT(*) AS total
FROM fund_master;

-- STEP 1: HIGH CONFIDENCE MAPPINGS (90%+)
-- These naming patterns unambiguously identify the fund category.

-- 1a: FMP / Fixed Maturity Plan / Fixed Maturity → Debt - Income
-- These are closed-ended debt funds that invest in fixed-income securities matching the maturity.
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FMP%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FIXED MATURITY%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FIXED MAT PLAN%');

-- 1b: Fixed Horizon → Debt - Income
-- Similar to FMPs — closed-ended debt funds with fixed horizon.
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FIXED HORIZON%';

-- 1c: Income → Debt - Income
-- Income funds are debt funds that invest in a mix of bonds and money market instruments.
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% INCOME%' OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE 'INCOME%')
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%CREDIT RISK%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%MONTHLY INCOME%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%MIP%';

-- 1d: Capital Protection → Hybrid - Conservative
-- Capital protection funds allocate to debt + equity to guarantee capital at maturity.
UPDATE fund_master
SET category = 'Hybrid - Conservative'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CAPITAL PROTECTION%';

-- 1e: Interval Fund → Debt - Income
-- Interval funds are open-ended but allow redemption only at specific intervals.
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%INTERVAL%';

-- 1f: Liquid → Debt - Liquid
UPDATE fund_master
SET category = 'Debt - Liquid'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% LIQUID%' OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE 'LIQUID%');

-- 1g: Overnight → Debt - Overnight
UPDATE fund_master
SET category = 'Debt - Overnight'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%OVERNIGHT%';

-- 1h: Short Duration / Short Term → Debt - Short Duration
UPDATE fund_master
SET category = 'Debt - Short Duration'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SHORT DURATION%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SHORT TERM%');

-- 1i: Ultra Short Duration → Debt - Ultra Short Duration
UPDATE fund_master
SET category = 'Debt - Ultra Short Duration'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ULTRA SHORT%';

-- 1j: Low Duration → Debt - Low Duration
UPDATE fund_master
SET category = 'Debt - Low Duration'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%LOW DURATION%';

-- 1k: Medium Duration / Medium Term → Debt - Medium Duration
UPDATE fund_master
SET category = 'Debt - Medium Duration'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MEDIUM DURATION%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MEDIUM TERM%');

-- 1l: Long Duration → Debt - Long Duration
UPDATE fund_master
SET category = 'Debt - Long Duration'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%LONG DURATION%';

-- 1m: Money Market → Debt - Money Market
UPDATE fund_master
SET category = 'Debt - Money Market'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MONEY MARKET%';

-- 1n: Dynamic Bond → Debt - Dynamic Bond
UPDATE fund_master
SET category = 'Debt - Dynamic Bond'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%DYNAMIC BOND%';

-- 1o: Banking & PSU → Debt - Banking and PSU
UPDATE fund_master
SET category = 'Debt - Banking and PSU'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BANKING AND PSU%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BANKING & PSU%');

-- 1p: Floater / Floating Rate → Debt - Floater
UPDATE fund_master
SET category = 'Debt - Floater'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% FLOATER%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FLOATING RATE%');

-- 1q: Corporate Bond → Debt - Corporate Bond
UPDATE fund_master
SET category = 'Debt - Corporate Bond'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CORPORATE BOND%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CORP BOND%');

-- 1r: Credit Risk → Debt - Credit Risk
UPDATE fund_master
SET category = 'Debt - Credit Risk'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CREDIT RISK%';

-- 1s: Large Cap → Equity - Large Cap
UPDATE fund_master
SET category = 'Equity - Large Cap'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%LARGE CAP%';

-- 1t: Mid Cap → Equity - Mid Cap
UPDATE fund_master
SET category = 'Equity - Mid Cap'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MID CAP%';

-- 1u: Small Cap → Equity - Small Cap
UPDATE fund_master
SET category = 'Equity - Small Cap'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SMALL CAP%';

-- 1v: Multi Cap → Equity - Multi Cap
UPDATE fund_master
SET category = 'Equity - Multi Cap'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MULTI CAP%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MULTICAP%');

-- 1w: Flexi Cap → Equity - Flexi Cap
UPDATE fund_master
SET category = 'Equity - Flexi Cap'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FLEXI CAP%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FLEXICAP%');

-- 1x: ELSS / Tax Saver → Equity - ELSS
UPDATE fund_master
SET category = 'Equity - ELSS'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ELSS%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%TAX SAVER%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%TAX PLAN%');

-- 1y: Focused → Equity - Focused
UPDATE fund_master
SET category = 'Equity - Focused'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FOCUSED%';

-- 1z: Value → Equity - Value
UPDATE fund_master
SET category = 'Equity - Value'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% VALUE%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%DIVIDEND%';

-- 1aa: Dividend Yield → Equity - Dividend Yield
UPDATE fund_master
SET category = 'Equity - Dividend Yield'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%DIVIDEND YIELD%';

-- 1ab: Banking / Financial → Equity - Sectoral - Banking
UPDATE fund_master
SET category = 'Equity - Sectoral - Banking'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BANKING%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FINANCIAL%')
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%BANKING AND PSU%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%BANKING & PSU%';

-- 1ac: Infrastructure → Equity - Sectoral - Infrastructure
UPDATE fund_master
SET category = 'Equity - Sectoral - Infrastructure'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%INFRASTRUCTURE%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%INFRA FUND%');

-- 1ad: Pharma / Healthcare → Equity - Sectoral - Pharma
UPDATE fund_master
SET category = 'Equity - Sectoral - Pharma'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%PHARMA%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%HEALTHCARE%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%HEALTH CARE%');

-- 1ae: Technology / IT → Equity - Sectoral - Technology
UPDATE fund_master
SET category = 'Equity - Sectoral - Technology'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%TECHNOLOGY%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% INFORMATION TECHNOLOGY%');

-- 1af: Consumption / Consumer → Equity - Sectoral - Consumption
UPDATE fund_master
SET category = 'Equity - Sectoral - Consumption'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% CONSUMPTION%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% CONSUMER%');

-- 1ag: PSU → Equity - Sectoral - PSU
UPDATE fund_master
SET category = 'Equity - Sectoral - PSU'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%PSU%';

-- 1ah: Manufacturing → Equity - Sectoral - Manufacturing
UPDATE fund_master
SET category = 'Equity - Sectoral - Manufacturing'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MANUFACTURING%';

-- 1ai: ESG → Equity - Thematic (ESG is a thematic investment strategy)
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ESG%';

-- 1aj: Business Cycle → Equity - Thematic
UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BUSINESS CYCLE%';

-- 1ak: International / Global / Overseas → Other - International
UPDATE fund_master
SET category = 'Other - International'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%INTERNATIONAL%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% GLOBAL%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%OVERSEAS%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FOREIGN%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%EMERGING MARKETS%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% WORLD%');

-- 1al: Gold / Silver → Commodity - Gold
UPDATE fund_master
SET category = 'Commodity - Gold'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% GOLD%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SILVER%');

-- 1am: Children / Child → Other - Solution Oriented
UPDATE fund_master
SET category = 'Other - Solution Oriented'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CHILDREN%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CHILD%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BAL VIKAS%');

-- 1an: Retirement / Pension → Other - Solution Oriented
UPDATE fund_master
SET category = 'Other - Solution Oriented'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%RETIREMENT%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%PENSION%');

-- 1ao: Monthly Income Plan / MIP → Hybrid - Conservative
-- MIPs typically allocate 70-85% to debt and 15-30% to equity.
UPDATE fund_master
SET category = 'Hybrid - Conservative'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MONTHLY INCOME%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MIP%');

-- 1ap: Aggressive Hybrid → Hybrid - Aggressive
UPDATE fund_master
SET category = 'Hybrid - Aggressive'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%AGGRESSIVE%';

-- 1aq: Conservative Hybrid → Hybrid - Conservative
UPDATE fund_master
SET category = 'Hybrid - Conservative'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%CONSERVATIVE%';

-- 1ar: Balanced → Hybrid - Balanced
UPDATE fund_master
SET category = 'Hybrid - Balanced'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%BALANCED%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%BALANCED ADVANTAGE%';

-- 1as: Arbitrage → Hybrid - Arbitrage
UPDATE fund_master
SET category = 'Hybrid - Arbitrage'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ARBITRAGE%';

-- 1at: ETF → Other - ETF
UPDATE fund_master
SET category = 'Other - ETF'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%ETF%';

-- 1au: Fund of Funds → Other - Fund of Funds
UPDATE fund_master
SET category = 'Other - Fund of Funds'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FOF%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%FUND OF FUND%');

-- 1av: Equity Savings → Hybrid - Equity Savings
UPDATE fund_master
SET category = 'Hybrid - Equity Savings'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%EQUITY SAVINGS%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%EQUITY SAVER%');

-- 1aw: Dynamic Asset Allocation → Hybrid - Dynamic Asset Allocation
UPDATE fund_master
SET category = 'Hybrid - Dynamic Asset Allocation'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%DYNAMIC ASSET ALLOCATION%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%DYNAMIC ALLOCATION%');

-- 1ax: Multi Asset Allocation → Hybrid - Multi Asset Allocation
UPDATE fund_master
SET category = 'Hybrid - Multi Asset Allocation'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%MULTI ASSET%';

-- 1az: Debt (generic) → Debt - Income (best default for generic debt funds)
UPDATE fund_master
SET category = 'Debt - Income'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% DEBT%' OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE 'DEBT%')
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%CREDIT RISK%';

-- 1ay: Gilt / Government Securities → Debt - Gilt
UPDATE fund_master
SET category = 'Debt - Gilt'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND (UPPER(COALESCE(workbook_name, scheme_name)) LIKE '% GILT%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%GOVT%SEC%'
    OR UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%G SEC%');

-- STEP 2: MEDIUM CONFIDENCE MAPPINGS (70-90%)
-- Remaining named funds with "Series" in the name → categorized by context.
-- These are usually closed-ended funds. Most are equity-oriented but we cannot
-- determine the sub-category. We map them as Equity - Thematic (safe default
-- for closed-ended thematic/series funds).

UPDATE fund_master
SET category = 'Equity - Thematic'
WHERE (category = 'Unknown' OR category = 'Other - Unclassified')
  AND COALESCE(workbook_name, scheme_name) IS NOT NULL AND COALESCE(workbook_name, scheme_name) != ''
  AND UPPER(COALESCE(workbook_name, scheme_name)) LIKE '%SERIES%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%FMP%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%FIXED%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%DEBT%'
  AND UPPER(COALESCE(workbook_name, scheme_name)) NOT LIKE '%INCOME%';

-- STEP 3: Redeemed/Closed funds → keep as Other - Unclassified
-- These are defunct schemes. No meaningful category can be assigned.
-- (No UPDATE needed — they remain as-is.)

-- STEP 4: Empty-name funds (519) → cannot classify
-- These have no COALESCE(workbook_name, scheme_name) in fund_master. Check fund_metrics.
-- If fund_metrics also has empty name, keep as Unknown.

-- STEP 5: Remaining unpatterned → keep as-is (Unknown / Other - Unclassified)
-- These 1,000+ funds have recognizable AMC names but no product-type keyword.
-- Safe classification is not possible without additional data.

-- FINAL AUDIT
SELECT 'AFTER' AS phase,
  COUNT(*) FILTER (WHERE category = 'Unknown') AS unknown,
  COUNT(*) FILTER (WHERE category = 'Other - Unclassified') AS unclassified,
  COUNT(*) FILTER (WHERE category NOT IN ('Unknown', 'Other - Unclassified') AND category IS NOT NULL) AS classified,
  COUNT(*) AS total
FROM fund_master;

-- Category distribution of newly classified funds
SELECT category, COUNT(*) AS cnt
FROM fund_master
WHERE category NOT IN ('Unknown', 'Other - Unclassified')
  AND scheme_code IN (
    SELECT scheme_code FROM fund_master
    WHERE category IN ('Unknown', 'Other - Unclassified')
  )
GROUP BY category
ORDER BY cnt DESC;
