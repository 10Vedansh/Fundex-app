-- ============================================================================
-- Category Classification Audit
-- Phase 1: Name status distribution
-- ============================================================================
SELECT 'PHASE 1' AS phase;

SELECT
  CASE WHEN fme.scheme_name IS NULL OR fme.scheme_name = '' THEN 'EMPTY_NAME' ELSE 'HAS_NAME' END AS name_status,
  fme.category,
  COUNT(*) AS cnt
FROM fund_master_enriched fme
WHERE fme.category IN ('Unknown', 'Other - Unclassified')
GROUP BY name_status, fme.category
ORDER BY fme.category, name_status;

-- Phase 2: Keyword pattern analysis
SELECT 'PHASE 2: KEYWORD PATTERNS - UNKNOWN' AS phase;

WITH patterns AS (
  SELECT fme.category AS cat, fme.scheme_name,
    CASE
      WHEN UPPER(fme.scheme_name) LIKE '%FMP%' OR UPPER(fme.scheme_name) LIKE '%FIXED MATURITY%' OR UPPER(fme.scheme_name) LIKE '%FIXED MAT PLAN%' THEN 'FMP / FIXED MATURITY'
      WHEN UPPER(fme.scheme_name) LIKE '%LIQUID%' AND UPPER(fme.scheme_name) NOT LIKE '%LIQUID%FUND%' THEN 'LIQUID'
      WHEN UPPER(fme.scheme_name) LIKE '%OVERNIGHT%' THEN 'OVERNIGHT'
      WHEN UPPER(fme.scheme_name) LIKE '%GILT%' OR UPPER(fme.scheme_name) LIKE '%GOVT SEC%' OR UPPER(fme.scheme_name) LIKE '%G SEC%' THEN 'GILT / GOVT SECURITIES'
      WHEN UPPER(fme.scheme_name) LIKE '%CORPORATE BOND%' OR UPPER(fme.scheme_name) LIKE '%CORP BOND%' THEN 'CORPORATE BOND'
      WHEN UPPER(fme.scheme_name) LIKE '%CREDIT RISK%' THEN 'CREDIT RISK'
      WHEN UPPER(fme.scheme_name) LIKE '%SHORT DURATION%' OR UPPER(fme.scheme_name) LIKE '%SHORT TERM%' THEN 'SHORT DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%ULTRA SHORT DURATION%' OR UPPER(fme.scheme_name) LIKE '%ULTRA SHORT%' THEN 'ULTRA SHORT DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%LOW DURATION%' THEN 'LOW DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%MEDIUM DURATION%' OR UPPER(fme.scheme_name) LIKE '%MEDIUM TERM%' THEN 'MEDIUM DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%LONG DURATION%' THEN 'LONG DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%MONEY MARKET%' THEN 'MONEY MARKET'
      WHEN UPPER(fme.scheme_name) LIKE '%DYNAMIC BOND%' THEN 'DYNAMIC BOND'
      WHEN UPPER(fme.scheme_name) LIKE '%BANKING AND PSU%' OR UPPER(fme.scheme_name) LIKE '%BANKING & PSU%' THEN 'BANKING & PSU'
      WHEN UPPER(fme.scheme_name) LIKE '%FLOATER%' OR UPPER(fme.scheme_name) LIKE '%FLOATING RATE%' THEN 'FLOATER'
      WHEN UPPER(fme.scheme_name) LIKE '%INCOME%' AND UPPER(fme.scheme_name) NOT LIKE '%CREDIT RISK%' THEN 'INCOME'
      WHEN UPPER(fme.scheme_name) LIKE '%ARBITRAGE%' THEN 'ARBITRAGE'
      WHEN UPPER(fme.scheme_name) LIKE '%BALANCED ADVANTAGE%' THEN 'BALANCED ADVANTAGE'
      WHEN UPPER(fme.scheme_name) LIKE '%BALANCED%' THEN 'BALANCED'
      WHEN UPPER(fme.scheme_name) LIKE '%AGGRESSIVE%' THEN 'AGGRESSIVE HYBRID'
      WHEN UPPER(fme.scheme_name) LIKE '%CONSERVATIVE%' THEN 'CONSERVATIVE HYBRID'
      WHEN UPPER(fme.scheme_name) LIKE '%EQUITY SAVINGS%' OR UPPER(fme.scheme_name) LIKE '%EQUITY SAVER%' THEN 'EQUITY SAVINGS'
      WHEN UPPER(fme.scheme_name) LIKE '%DYNAMIC ASSET ALLOCATION%' OR UPPER(fme.scheme_name) LIKE '%DYNAMIC ALLOCATION%' THEN 'DYNAMIC ASSET ALLOCATION'
      WHEN UPPER(fme.scheme_name) LIKE '%MULTI ASSET%' THEN 'MULTI ASSET ALLOCATION'
      WHEN UPPER(fme.scheme_name) LIKE '%LARGE CAP%' THEN 'LARGE CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%MID CAP%' THEN 'MID CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%SMALL CAP%' THEN 'SMALL CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%LARGE & MID CAP%' OR UPPER(fme.scheme_name) LIKE '%LARGE AND MID CAP%' THEN 'LARGE & MID CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%MULTI CAP%' OR UPPER(fme.scheme_name) LIKE '%MULTICAP%' THEN 'MULTI CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%FLEXI CAP%' OR UPPER(fme.scheme_name) LIKE '%FLEXICAP%' THEN 'FLEXI CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%VALUE%' AND UPPER(fme.scheme_name) NOT LIKE '%DIVIDEND%' THEN 'VALUE'
      WHEN UPPER(fme.scheme_name) LIKE '%DIVIDEND YIELD%' THEN 'DIVIDEND YIELD'
      WHEN UPPER(fme.scheme_name) LIKE '%FOCUSED%' THEN 'FOCUSED'
      WHEN UPPER(fme.scheme_name) LIKE '%ELSS%' OR UPPER(fme.scheme_name) LIKE '%TAX SAVER%' OR UPPER(fme.scheme_name) LIKE '%TAX PLAN%' THEN 'ELSS'
      WHEN UPPER(fme.scheme_name) LIKE '%ETF%' THEN 'ETF'
      WHEN UPPER(fme.scheme_name) LIKE '%BANKING%' OR UPPER(fme.scheme_name) LIKE '%FINANCIAL%' OR UPPER(fme.scheme_name) LIKE '%BANK FUND%' THEN 'SECTORAL - BANKING'
      WHEN UPPER(fme.scheme_name) LIKE '%INFRASTRUCTURE%' OR UPPER(fme.scheme_name) LIKE '%INFRA FUND%' THEN 'SECTORAL - INFRASTRUCTURE'
      WHEN UPPER(fme.scheme_name) LIKE '%PHARMA%' OR UPPER(fme.scheme_name) LIKE '%HEALTHCARE%' OR UPPER(fme.scheme_name) LIKE '%HEALTH CARE%' THEN 'SECTORAL - PHARMA & HEALTHCARE'
      WHEN UPPER(fme.scheme_name) LIKE '%TECHNOLOGY%' OR UPPER(fme.scheme_name) LIKE '%IT FUND%' THEN 'SECTORAL - TECHNOLOGY'
      WHEN UPPER(fme.scheme_name) LIKE '%CONSUMPTION%' OR UPPER(fme.scheme_name) LIKE '%CONSUMER%' THEN 'SECTORAL - CONSUMPTION'
      WHEN UPPER(fme.scheme_name) LIKE '%PSU%' THEN 'SECTORAL - PSU'
      WHEN UPPER(fme.scheme_name) LIKE '%MANUFACTURING%' THEN 'SECTORAL - MANUFACTURING'
      WHEN UPPER(fme.scheme_name) LIKE '%ESG%' THEN 'THEMATIC - ESG'
      WHEN UPPER(fme.scheme_name) LIKE '%BUSINESS CYCLE%' THEN 'THEMATIC - BUSINESS CYCLE'
      WHEN UPPER(fme.scheme_name) LIKE '%INTERNATIONAL%' OR UPPER(fme.scheme_name) LIKE '%GLOBAL%' OR UPPER(fme.scheme_name) LIKE '%OVERSEAS%' OR UPPER(fme.scheme_name) LIKE '%US STOCK%' OR UPPER(fme.scheme_name) LIKE '%NASDAQ%' OR UPPER(fme.scheme_name) LIKE '%S&P%' OR UPPER(fme.scheme_name) LIKE '%FOREIGN%' OR UPPER(fme.scheme_name) LIKE '%EMERGING MARKETS%' OR UPPER(fme.scheme_name) LIKE '%WORLD%' THEN 'INTERNATIONAL'
      WHEN UPPER(fme.scheme_name) LIKE '%GOLD%' OR UPPER(fme.scheme_name) LIKE '%SILVER%' THEN 'COMMODITY - GOLD/SILVER'
      WHEN UPPER(fme.scheme_name) LIKE '%CHILDREN%' OR UPPER(fme.scheme_name) LIKE '%CHILD%' OR UPPER(fme.scheme_name) LIKE '%BAL VIKAS%' THEN 'CHILDREN FUND'
      WHEN UPPER(fme.scheme_name) LIKE '%RETIREMENT%' OR UPPER(fme.scheme_name) LIKE '%PENSION%' THEN 'RETIREMENT'
      WHEN UPPER(fme.scheme_name) LIKE '%CAPITAL PROTECTION%' THEN 'CAPITAL PROTECTION'
      WHEN UPPER(fme.scheme_name) LIKE '%INTERVAL%' THEN 'INTERVAL FUND'
      WHEN UPPER(fme.scheme_name) LIKE '%MONTHLY INCOME%' OR UPPER(fme.scheme_name) LIKE '%MIP%' THEN 'MONTHLY INCOME PLAN'
      WHEN UPPER(fme.scheme_name) LIKE '%FIXED HORIZON%' THEN 'FIXED HORIZON'
      WHEN UPPER(fme.scheme_name) LIKE '%SOVEREIGN%' THEN 'SOVEREIGN'
      WHEN UPPER(fme.scheme_name) LIKE '%SERIES %' OR UPPER(fme.scheme_name) LIKE '%SERIES-' THEN 'CLOSED ENDED SERIES'
      WHEN UPPER(fme.scheme_name) LIKE '%FOF%' OR UPPER(fme.scheme_name) LIKE '%FUND OF FUND%' THEN 'FUND OF FUNDS'
      ELSE 'UNRECOGNIZED'
    END AS keyword
  FROM fund_master_enriched fme
  WHERE fme.category = 'Unknown'
    AND fme.scheme_name IS NOT NULL AND fme.scheme_name != ''
)
SELECT keyword, COUNT(*) AS cnt
FROM patterns
GROUP BY keyword
ORDER BY cnt DESC;

-- Phase 2b: Keyword patterns for Other - Unclassified
SELECT 'PHASE 2B: KEYWORD PATTERNS - UNCLASSIFIED' AS phase;

WITH patterns AS (
  SELECT fme.category AS cat, fme.scheme_name,
    CASE
      WHEN UPPER(fme.scheme_name) LIKE '%FMP%' OR UPPER(fme.scheme_name) LIKE '%FIXED MATURITY%' THEN 'FMP / FIXED MATURITY'
      WHEN UPPER(fme.scheme_name) LIKE '%LIQUID%' THEN 'LIQUID'
      WHEN UPPER(fme.scheme_name) LIKE '%OVERNIGHT%' THEN 'OVERNIGHT'
      WHEN UPPER(fme.scheme_name) LIKE '%GILT%' OR UPPER(fme.scheme_name) LIKE '%GOVT SEC%' THEN 'GILT / GOVT SECURITIES'
      WHEN UPPER(fme.scheme_name) LIKE '%CORPORATE BOND%' THEN 'CORPORATE BOND'
      WHEN UPPER(fme.scheme_name) LIKE '%CREDIT RISK%' THEN 'CREDIT RISK'
      WHEN UPPER(fme.scheme_name) LIKE '%SHORT DURATION%' OR UPPER(fme.scheme_name) LIKE '%SHORT TERM%' THEN 'SHORT DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%ULTRA SHORT%' THEN 'ULTRA SHORT DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%LOW DURATION%' THEN 'LOW DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%MEDIUM DURATION%' OR UPPER(fme.scheme_name) LIKE '%MEDIUM TERM%' THEN 'MEDIUM DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%LONG DURATION%' THEN 'LONG DURATION'
      WHEN UPPER(fme.scheme_name) LIKE '%MONEY MARKET%' THEN 'MONEY MARKET'
      WHEN UPPER(fme.scheme_name) LIKE '%DYNAMIC BOND%' THEN 'DYNAMIC BOND'
      WHEN UPPER(fme.scheme_name) LIKE '%BANKING AND PSU%' OR UPPER(fme.scheme_name) LIKE '%BANKING & PSU%' THEN 'BANKING & PSU'
      WHEN UPPER(fme.scheme_name) LIKE '%FLOATER%' OR UPPER(fme.scheme_name) LIKE '%FLOATING RATE%' THEN 'FLOATER'
      WHEN UPPER(fme.scheme_name) LIKE '%INCOME%' THEN 'INCOME'
      WHEN UPPER(fme.scheme_name) LIKE '%ARBITRAGE%' THEN 'ARBITRAGE'
      WHEN UPPER(fme.scheme_name) LIKE '%BALANCED%' THEN 'BALANCED'
      WHEN UPPER(fme.scheme_name) LIKE '%AGGRESSIVE%' THEN 'AGGRESSIVE HYBRID'
      WHEN UPPER(fme.scheme_name) LIKE '%CONSERVATIVE%' THEN 'CONSERVATIVE HYBRID'
      WHEN UPPER(fme.scheme_name) LIKE '%EQUITY SAVINGS%' THEN 'EQUITY SAVINGS'
      WHEN UPPER(fme.scheme_name) LIKE '%DYNAMIC ASSET%' THEN 'DYNAMIC ASSET ALLOCATION'
      WHEN UPPER(fme.scheme_name) LIKE '%MULTI ASSET%' THEN 'MULTI ASSET ALLOCATION'
      WHEN UPPER(fme.scheme_name) LIKE '%LARGE CAP%' THEN 'LARGE CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%MID CAP%' THEN 'MID CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%SMALL CAP%' THEN 'SMALL CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%MULTI CAP%' OR UPPER(fme.scheme_name) LIKE '%MULTICAP%' THEN 'MULTI CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%FLEXI CAP%' OR UPPER(fme.scheme_name) LIKE '%FLEXICAP%' THEN 'FLEXI CAP'
      WHEN UPPER(fme.scheme_name) LIKE '%VALUE%' THEN 'VALUE'
      WHEN UPPER(fme.scheme_name) LIKE '%FOCUSED%' THEN 'FOCUSED'
      WHEN UPPER(fme.scheme_name) LIKE '%ELSS%' OR UPPER(fme.scheme_name) LIKE '%TAX SAVER%' THEN 'ELSS'
      WHEN UPPER(fme.scheme_name) LIKE '%ETF%' THEN 'ETF'
      WHEN UPPER(fme.scheme_name) LIKE '%BANKING%' OR UPPER(fme.scheme_name) LIKE '%FINANCIAL%' THEN 'SECTORAL - BANKING'
      WHEN UPPER(fme.scheme_name) LIKE '%INFRASTRUCTURE%' OR UPPER(fme.scheme_name) LIKE '%INFRA%' THEN 'SECTORAL - INFRASTRUCTURE'
      WHEN UPPER(fme.scheme_name) LIKE '%PHARMA%' OR UPPER(fme.scheme_name) LIKE '%HEALTHCARE%' THEN 'SECTORAL - PHARMA & HEALTHCARE'
      WHEN UPPER(fme.scheme_name) LIKE '%TECHNOLOGY%' OR UPPER(fme.scheme_name) LIKE '%IT %' THEN 'SECTORAL - TECHNOLOGY'
      WHEN UPPER(fme.scheme_name) LIKE '%CONSUMPTION%' OR UPPER(fme.scheme_name) LIKE '%CONSUMER%' THEN 'SECTORAL - CONSUMPTION'
      WHEN UPPER(fme.scheme_name) LIKE '%PSU%' THEN 'SECTORAL - PSU'
      WHEN UPPER(fme.scheme_name) LIKE '%MANUFACTURING%' THEN 'SECTORAL - MANUFACTURING'
      WHEN UPPER(fme.scheme_name) LIKE '%ESG%' THEN 'THEMATIC - ESG'
      WHEN UPPER(fme.scheme_name) LIKE '%BUSINESS CYCLE%' THEN 'THEMATIC - BUSINESS CYCLE'
      WHEN UPPER(fme.scheme_name) LIKE '%INTERNATIONAL%' OR UPPER(fme.scheme_name) LIKE '%GLOBAL%' OR UPPER(fme.scheme_name) LIKE '%OVERSEAS%' OR UPPER(fme.scheme_name) LIKE '%FOREIGN%' OR UPPER(fme.scheme_name) LIKE '%EMERGING MARKETS%' THEN 'INTERNATIONAL'
      WHEN UPPER(fme.scheme_name) LIKE '%GOLD%' OR UPPER(fme.scheme_name) LIKE '%SILVER%' THEN 'COMMODITY - GOLD/SILVER'
      WHEN UPPER(fme.scheme_name) LIKE '%CHILDREN%' OR UPPER(fme.scheme_name) LIKE '%CHILD%' THEN 'CHILDREN FUND'
      WHEN UPPER(fme.scheme_name) LIKE '%RETIREMENT%' OR UPPER(fme.scheme_name) LIKE '%PENSION%' THEN 'RETIREMENT'
      WHEN UPPER(fme.scheme_name) LIKE '%CAPITAL PROTECTION%' THEN 'CAPITAL PROTECTION'
      WHEN UPPER(fme.scheme_name) LIKE '%INTERVAL%' THEN 'INTERVAL FUND'
      WHEN UPPER(fme.scheme_name) LIKE '%MIP%' THEN 'MONTHLY INCOME PLAN'
      WHEN UPPER(fme.scheme_name) LIKE '%FIXED HORIZON%' THEN 'FIXED HORIZON'
      WHEN UPPER(fme.scheme_name) LIKE '%SERIES %' OR UPPER(fme.scheme_name) LIKE '%SERIES-' THEN 'CLOSED ENDED SERIES'
      WHEN UPPER(fme.scheme_name) LIKE '%FOF%' OR UPPER(fme.scheme_name) LIKE '%FUND OF FUND%' THEN 'FUND OF FUNDS'
      ELSE 'UNRECOGNIZED'
    END AS keyword
  FROM fund_master_enriched fme
  WHERE fme.category = 'Other - Unclassified'
    AND fme.scheme_name IS NOT NULL AND fme.scheme_name != ''
)
SELECT keyword, COUNT(*) AS cnt
FROM patterns
GROUP BY keyword
ORDER BY cnt DESC;

-- Phase 3: Look at empty-name funds separately
SELECT 'PHASE 3: EMPTY NAME FUNDS' AS phase;

SELECT COUNT(*) AS cnt_empty_name FROM fund_master_enriched
WHERE category IN ('Unknown', 'Other - Unclassified')
  AND (scheme_name IS NULL OR scheme_name = '');

-- Phase 4: Sample of empty-name fund data
SELECT 'PHASE 4: SAMPLE EMPTY NAME FUNDS' AS phase;

SELECT fm.scheme_code, fm.scheme_name, fm.category, fm.amc,
  fm.original_category, fm.cagr_1y, fm.sharpe_ratio_1y
FROM fund_metrics fm
WHERE fm.scheme_code IN (
  SELECT fme.scheme_code FROM fund_master_enriched fme
  WHERE fme.category = 'Unknown' AND (fme.scheme_name IS NULL OR fme.scheme_name = '')
)
LIMIT 20;

-- Phase 5: Check what original_category says for uncategorized
SELECT 'PHASE 5: ORIGINAL_CATEGORY FOR UNCATEGORIZED' AS phase;

SELECT fm.original_category, COUNT(*) AS cnt
FROM fund_metrics fm
WHERE fm.scheme_code IN (
  SELECT fme.scheme_code FROM fund_master_enriched fme
  WHERE fme.category = 'Unknown' OR fme.category = 'Other - Unclassified'
)
GROUP BY fm.original_category
ORDER BY cnt DESC
LIMIT 30;
