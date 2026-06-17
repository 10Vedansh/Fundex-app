# Category Normalization Report

**Generated:** 2026-06-15
**Script:** `scripts/normalize-categories.py`
**Migration:** `supabase/migrations/20260615000005_add_original_category.sql`

## Summary

| Metric | Before | After |
|--------|:------:|:-----:|
| Distinct categories | 157 (+1 empty) | **49** |
| Funds in canonical categories | 26,761 | **26,761** |
| Funds in Unknown/Unclassified | 7,208 | **7,208** |
| Active funds with known category | 78.8% | **78.8%** |
| Spurious/garbage categories | 32+ | **0** |

## Original Category Count: 158 (157 + empty string)

## Canonical Category Count: 49

## Mapping Table (158 → 49)

### Empty → Unknown (5,807 funds)
| Original | Canonical | Funds |
|----------|-----------|:-----:|
| `` (empty) | `Unknown` | 5,807 |

### Equity (20 variants → 15 canonical)
| Original | Canonical | Funds |
|----------|-----------|:-----:|
| `EQ-LC`, `Equity Scheme - Large Cap Fund` | `Equity - Large Cap` | 510 |
| `EQ-MC`, `Equity Scheme - Mid Cap Fund` | `Equity - Mid Cap` | 370 |
| `EQ-SC`, `Equity Scheme - Small Cap Fund` | `Equity - Small Cap` | 215 |
| `EQ-L&MC`, `Equity Scheme - Large & Mid Cap Fund` | `Equity - Large & Mid Cap` | 99 |
| `EQ-MLC`, `Equity Scheme - Multi Cap Fund` | `Equity - Multi Cap` | 70 |
| `EQ-FLX` | `Equity - Flexi Cap` | 373 |
| `EQ-VAL` | `Equity - Value` | 202 |
| `EQ-DIV Y`, `Equity Scheme - Dividend Yield Fund`, `Equity - Dividend Yield` | `Equity - Dividend Yield` | 57 |
| `EQ-ELSS`, `ELSS` | `Equity - ELSS` | 233 |
| Various (`Index`, `Other Scheme - Index Funds`, `Other Scheme - Index`, `Equity Scheme - Index Fund`) | `Equity - Index` | 735 |
| `EQ-THEMATIC`, `EQ-T-ESG`, `EQ-TBC`, `EQ-SA&T`, `EQ-Innovation`, `EQ-Quant`, `Equity Scheme - Sectoral/ Thematic`, `Equity - Sectoral` | `Equity - Thematic` | 182 |
| `EQ-BANK` | `Equity - Sectoral - Banking` | 378 |
| `EQ-IT` | `Equity - Sectoral - Technology` | 72 |
| `EQ-Pharma` | `Equity - Sectoral - Pharma` | 104 |
| `EQ-Consumption` | `Equity - Sectoral - Consumption` | 154 |
| `EQ-INFRA` | `Equity - Sectoral - Infrastructure` | 96 |
| `EQ-PSU` | `Equity - Sectoral - PSU` | 72 |
| `EQ-Manufacturing` | `Equity - Sectoral - Manufacturing` | 66 |
| `EQ-Contra`, `Equity - Contra` | collapsed → `Equity - Value` | 9 |
| `EQ-Sectoral - FMCG`, `Equity - Sectoral - FMCG` | collapsed → `Equity - Thematic` | 3 |
| `EQ-Sectoral - Real Estate`, `Equity - Sectoral - Real Estate` | collapsed → `Equity - Thematic` | 3 |
| `EQ-MNC`, `Equity - Sectoral - MNC` | collapsed → `Equity - Thematic` | 30 |
| `EQ-Energy`, `Equity - Sectoral - Energy` | collapsed → `Equity - Thematic` | 38 |

### Hybrid (7 variants → 7 canonical)
| Original | Canonical | Funds |
|----------|-----------|:-----:|
| `HY-AH` | `Hybrid - Aggressive` | 326 |
| `HY-CH` | `Hybrid - Conservative` | 161 |
| `HY-BH`, `Balanced` | `Hybrid - Balanced` | 47 |
| `HY-EQ S` | `Hybrid - Equity Savings` | 281 |
| `HY-AR` | `Hybrid - Arbitrage` | 325 |
| `HY-MAA`, `HY-IPA` | `Hybrid - Multi Asset Allocation` | 253 |
| `HY-DAA`, `Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage` | `Hybrid - Dynamic Asset Allocation` | 68 |

### Debt (32 variants → 16 canonical)
| Original | Canonical | Funds |
|----------|-----------|:-----:|
| `DT-LIQ`, `Debt Scheme - Liquid Fund`, `Liquid` | `Debt - Liquid` | 586 |
| `DT-MM`, `Debt Scheme - Money Market Fund`, `Money Market` | `Debt - Money Market` | 253 |
| `DT-OVERNHT`, `Debt Scheme - Overnight Fund` | `Debt - Overnight` | 332 |
| `DT-USD`, `Debt Scheme - Ultra Short Duration Fund` | `Debt - Ultra Short Duration` | 102 |
| `DT-LD`, `Debt Scheme - Low Duration Fund` | `Debt - Low Duration` | 350 |
| `DT-SD`, `Debt Scheme - Short Duration Fund` | `Debt - Short Duration` | 560 |
| `DT-MD`, `Debt Scheme - Medium Duration Fund` | `Debt - Medium Duration` | 157 |
| `DT-LONG D`, `Debt Scheme - Long Duration Fund` | `Debt - Long Duration` | 182 |
| `DT-DB`, `Debt Scheme - Dynamic Bond Fund` | `Debt - Dynamic Bond` | 352 |
| `DT-CB`, `Debt Scheme - Corporate Bond Fund` | `Debt - Corporate Bond` | 256 |
| `DT-BK & PSU`, `Debt Scheme - Banking and PSU Fund` | `Debt - Banking and PSU` | 75 |
| `DT-GL`, `Debt Scheme - Gilt Fund`, `Gilt` | `Debt - Gilt` | 260 |
| `DT-CR`, `Debt Scheme - Credit Risk Fund` | `Debt - Credit Risk` | 189 |
| `DT-Floater`, `Debt Scheme - Floater Fund` | `Debt - Floater` | 122 |
| `DT-TM`, `DT-OTH`, `Debt Scheme - Income Fund`, `Income`, `Debt - Income` | `Debt - Income` | 14,982 |
| `IDF` | `Debt - IDF` | 1,965 |
| `DT-M to LD`, `Debt Scheme - Medium to Long Duration Fund`, `Debt - Medium to Long Duration` | collapsed → `Debt - Medium Duration` | 18 |
| `DT-Gilt 10Y CD`, `Debt Scheme - Gilt Fund with 10 year constant duration`, `Debt - Gilt with 10yr Constant Maturity`, `Debt - 10 Year Constant Maturity` | collapsed → `Debt - Gilt` | 11 |

### Commodity (3 variants → 1 canonical)
| Original | Canonical | Funds |
|----------|-----------|:-----:|
| `Gold-Funds`, `Other Scheme - Gold ETF`, `Commodity - Gold` | `Commodity - Gold` | 77 |
| `Silver-Funds`, `Commodity - Silver` | collapsed → `Commodity - Gold` | 21 |

### Other (7 variants → 4 canonical)
| Original | Canonical | Funds |
|----------|-----------|:-----:|
| `Other Scheme - FoF Domestic`, `Other - Fund of Funds` | `Other - Fund of Funds` | 156 |
| `EQ-INTL`, `Other Scheme - FoF Overseas`, `Other - International` | `Other - International` | 109 |
| `Other Scheme - Other ETFs`, `ETF`, `Other - ETF` | `Other - ETF` | 9 |
| `Solution Oriented Scheme - Retirement Fund`, `Other - Retirement Fund` | collapsed → `Other - Solution Oriented` | 7 |

### Garbage → Other - Unclassified (32 variants, 1,401 funds)
All plan types, durations, dividend options, and other non-category values:

`1099 Days` (419), `1100 days` (31), `1100 Days` (3), `1100 DAYS` (2),
`1102 Days` (4), `1111 DAYS` (11), `1116 Days` (12), `1124 Days` (8),
`1141 Days` (12), `1150 DAYS` (56), `1194 DAYS` (8), `1305 Days` (2),
`19 months Plan` (114), `466 DAYS` (1), `5 Year Plan` (58), `91 Days` (3),
`1` (29), `Analyst's Conviction Equalized` (21), `Compulsory Reinvestment` (2),
`Daily` (3), `Direct` (79), `DIRECT` (19), `erstwhile Cash Option` (4),
`Formerly Known as IIFL Mutual Fund` (30), `Formerly Super Institutional Plan` (5),
`FV Rs 32.161` (2), `G` (1), `Half Yearly Dividend` (18),
`Merger of Capex & Energy Opportunities` (4), `Payout` (88), `54EB Growth` (7),
`Equity - Growth` (345), `Growth` (some of the 345)

## Funds Affected

- **11,792 fund_master rows** had their category updated (34.7% of total)
- **11,783 fund_metrics rows** had their category updated
- Of these, **140 rows** were further consolidated in the second pass (49-category target)
- **0** error during upsert

## Unmapped Categories: 0

All 158 original variants (including empty) were mapped to a canonical category.
32 garbage variants mapped to `Other - Unclassified`.
Empty string mapped to `Unknown`.

## Remaining Work

- **7,208 active funds (21.2%)** still have `Unknown` (5,807) or `Other - Unclassified` (1,401)
- These need backfill from external data sources (mfapi.in retry, Value Research)
- The `original_category` column exists (migration 20260615000005) but contains canonical values for existing data since normalization ran before the column was added
- Going forward: set `original_category = category` before running normalization
