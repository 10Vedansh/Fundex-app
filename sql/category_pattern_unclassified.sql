-- Keyword patterns for Other - Unclassified
WITH patterns AS (
  SELECT
    CASE
      WHEN UPPER(scheme_name) LIKE '%FMP%' OR UPPER(scheme_name) LIKE '%FIXED MATURITY%' THEN 'FMP / FIXED MATURITY'
      WHEN UPPER(scheme_name) LIKE '%FIXED HORIZON%' THEN 'FIXED HORIZON'
      WHEN UPPER(scheme_name) LIKE '%LIQUID%' THEN 'LIQUID'
      WHEN UPPER(scheme_name) LIKE '%OVERNIGHT%' THEN 'OVERNIGHT'
      WHEN UPPER(scheme_name) LIKE '%GILT%' THEN 'GILT / GOVT'
      WHEN UPPER(scheme_name) LIKE '%SHORT DURATION%' OR UPPER(scheme_name) LIKE '%SHORT TERM%' THEN 'SHORT DURATION'
      WHEN UPPER(scheme_name) LIKE '%ULTRA SHORT%' THEN 'ULTRA SHORT'
      WHEN UPPER(scheme_name) LIKE '%INCOME%' THEN 'INCOME'
      WHEN UPPER(scheme_name) LIKE '%ARBITRAGE%' THEN 'ARBITRAGE'
      WHEN UPPER(scheme_name) LIKE '%BALANCED%' THEN 'BALANCED / HYBRID'
      WHEN UPPER(scheme_name) LIKE '%LARGE CAP%' THEN 'LARGE CAP'
      WHEN UPPER(scheme_name) LIKE '%MID CAP%' THEN 'MID CAP'
      WHEN UPPER(scheme_name) LIKE '%SMALL CAP%' THEN 'SMALL CAP'
      WHEN UPPER(scheme_name) LIKE '%MULTI CAP%' OR UPPER(scheme_name) LIKE '%MULTICAP%' THEN 'MULTI CAP'
      WHEN UPPER(scheme_name) LIKE '%FLEXI CAP%' THEN 'FLEXI CAP'
      WHEN UPPER(scheme_name) LIKE '%ELSS%' OR UPPER(scheme_name) LIKE '%TAX%' THEN 'ELSS'
      WHEN UPPER(scheme_name) LIKE '%BANKING%' OR UPPER(scheme_name) LIKE '%FINANCIAL%' THEN 'SECTORAL - BANKING'
      WHEN UPPER(scheme_name) LIKE '%INFRA%' THEN 'SECTORAL - INFRA'
      WHEN UPPER(scheme_name) LIKE '%PHARMA%' OR UPPER(scheme_name) LIKE '%HEALTHCARE%' THEN 'SECTORAL - PHARMA'
      WHEN UPPER(scheme_name) LIKE '%TECHNOLOGY%' THEN 'SECTORAL - TECHNOLOGY'
      WHEN UPPER(scheme_name) LIKE '%CONSUMPTION%' OR UPPER(scheme_name) LIKE '%CONSUMER%' THEN 'SECTORAL - CONSUMPTION'
      WHEN UPPER(scheme_name) LIKE '%INTERNATIONAL%' OR UPPER(scheme_name) LIKE '%GLOBAL%' OR UPPER(scheme_name) LIKE '%OVERSEAS%' THEN 'INTERNATIONAL'
      WHEN UPPER(scheme_name) LIKE '%GOLD%' OR UPPER(scheme_name) LIKE '%SILVER%' THEN 'COMMODITY'
      WHEN UPPER(scheme_name) LIKE '%RETIREMENT%' OR UPPER(scheme_name) LIKE '%PENSION%' THEN 'RETIREMENT'
      WHEN UPPER(scheme_name) LIKE '%CAPITAL PROTECTION%' THEN 'CAPITAL PROTECTION'
      WHEN UPPER(scheme_name) LIKE '%INTERVAL%' THEN 'INTERVAL FUND'
      WHEN UPPER(scheme_name) LIKE '%MIP%' THEN 'MONTHLY INCOME'
      WHEN UPPER(scheme_name) LIKE '%SERIES%' THEN 'SERIES / CLOSED'
      WHEN UPPER(scheme_name) LIKE '%FOF%' OR UPPER(scheme_name) LIKE '%FUND OF FUND%' THEN 'FUND OF FUNDS'
      WHEN UPPER(scheme_name) LIKE '%REDEEMED%' OR UPPER(scheme_name) LIKE '%Z-REDEEMED%' THEN 'REDEEMED / CLOSED'
      ELSE 'NO MATCH'
    END AS keyword
  FROM fund_master_enriched
  WHERE category = 'Other - Unclassified'
    AND scheme_name IS NOT NULL AND scheme_name != ''
)
SELECT keyword, COUNT(*) AS cnt
FROM patterns
GROUP BY keyword
ORDER BY cnt DESC;
