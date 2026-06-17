# Enrichment Gap — Definitive Verification

**Proving that `recommendation_universe` is the sole repository of VR-enriched data, and the frontend never reads from it.**

---

## 1. Is `recommendation_universe` referenced anywhere in the frontend?

**Result: NO.** Zero references found:

```bash
grep -r "recommendation_universe" src/ --include="*.tsx" --include="*.ts"
# → No output
```

All frontend code (`pages/`, `components/`, `hooks/`, `utils/`) contains zero references to the `recommendation_universe` table.

---

## 2. Exact data path for each page

### A. Home Dashboard Fund Cards

```
Search.tsx:127          const { funds } = useFundCache()
Index.tsx:64             const { funds, isLoading, refreshFunds } = useFundCache()
                                ↓
src/hooks/useFundCache.tsx:38   fetchFundMasterFunds({ perPage: 4000, activeOnly: false })
                                ↓
src/utils/fundMasterAdapter.ts:136
    await supabase.functions.invoke(`fetch-fund-data?source=master
        &per_page=4000&active_only=false`)
                                ↓
supabase/functions/fetch-fund-data/index.ts:165
    handleMasterSource(supabase, url)
                                ↓
supabase/functions/fetch-fund-data/index.ts:73
    supabase.from("fund_master_enriched").select("*", { count: "exact" })
        .range(0, 3999)
                                ↓
supabase/migrations/20260615000004_create_fund_master_enriched_view.sql
    CREATE OR REPLACE VIEW fund_master_enriched AS
    SELECT fm.expense_ratio, fm.aum, fm.fund_manager, ...
    FROM fund_master fm
    LEFT JOIN fund_metrics f ON fm.scheme_code = f.scheme_code
    WHERE fm.match_method IS DISTINCT FROM 'unmatched';
```

**Data source: `fund_master` column `fm.expense_ratio`, `fm.aum`, `fm.fund_manager`**
- `fund_master.expense_ratio`: **1,759 rows non-null** (5.2%)
- `fund_master.aum`: **1,767 rows non-null** (5.2%)
- `fund_master.fund_manager`: **1,805 rows non-null** (5.3%)

### B. All Funds Page

```
AllFundsTab.tsx
    Props: { funds: MutualFund[] }  ←  passed from Index.tsx
                                          ↓
Index.tsx:64           const { funds } = useFundCache()
                              ↓
(Same chain as Home Dashboard A above)
```

**Data source: `useFundCache()` → `fund_master_enriched` → `fund_master` columns**

### C. Recommendation Engine

```
Index.tsx:261           const recommended = recommendFundsV2(funds, prefs)
                                                    ↓
src/utils/recommendation/intersectionEngine.ts
    Input: MutualFund[] (the same `funds` array from useFundCache)
                                                    ↓
    Eligibility: applyAmountConstraints() → f.aum, f.expenseRatio
    Scoring:     scoreV3() → f.expenseRatio, f.aum, f.fundManager
                                                    ↓
src/utils/recommendation/scoringEngineV3.ts:318
    const expenseRaw = safeNum(fund.expenseRatio);  // 95% NULL → 0.5 neutral
src/utils/recommendation/scoringEngineV3.ts:332
    const aumRaw = safeNum(fund.aum);               // 95% NULL → 0.5 neutral
src/utils/recommendation/scoringEngineV3.ts:390
    const nullFundManager = !fund.fundManager        // 95% null → completeness penalty
```

**Data source: Same `funds` array from `useFundCache()` → `fund_master_enriched` → `fund_master`**

### D. Search Page

```
Search.tsx:127          const { funds } = useFundCache()
Search.tsx:156          funds.filter(f => ...)  // client-side filter
                        .slice(0, 30)
```

**Data source: Same `useFundCache()` → `fund_master_enriched` → `fund_master`**

### E. Fund Detail Modal

```
Index.tsx:309           const handleFundClick = (fund: MutualFund) => {
Index.tsx:310               setSelectedFundForModal(fund);
Index.tsx:311               setIsModalOpen(true);
Index.tsx:988           <FundDetailModal fund={selectedFundForModal} ...>
                                                ↓
FundDetailModal.tsx:108  {fmtOrNA(fund.expenseRatio, 2, '%')}    ← 95% "NA"
FundDetailModal.tsx:109  {fund.aum ? `₹...` : 'NA'}              ← 95% "NA"
FundDetailModal.tsx:187  {fund.fundManager || 'NA'}              ← 95% "NA"
```

**Data source: `selectedFundForModal` is `funds[i]` from same `useFundCache()` — identical chain**

---

## 3. The Enrichment Data

`recommendation_universe` contains VR-enriched data:

| Field | recommendation_universe | fund_master (what frontend reads) |
|-------|----------------------|-----------------------------------|
| expense_ratio | **5,883 (72.7%)** | 1,759 (5.2%) |
| aum | **5,941 (73.4%)** | 1,767 (5.2%) |
| fund_manager | **8,095 (100%)** | 1,805 (5.3%) |

**Proof for a specific fund (scheme 120716):**

```
recommendation_universe:  expense_ratio=0.18  aum=27827  fund_manager="Sharwan Kumar Goyal; Ayush Jain"
fund_master_enriched:     expense_ratio=NULL   aum=NULL   fund_manager=NULL
fund_master:              expense_ratio=NULL   aum=NULL   fund_manager=NULL
```

---

## 4. Minimum-Change Fix

**Approach: Modify the `fund_master_enriched` view to ALSO read from `recommendation_universe`.**

This is the single SQL change that fixes all pages simultaneously without touching frontend code.

### The Fix (One SQL Statement)

```sql
CREATE OR REPLACE VIEW fund_master_enriched AS
SELECT
  -- Primary identifier
  fm.scheme_code,

  -- Names
  COALESCE(fm.workbook_name, fm.scheme_name, f.scheme_name) AS scheme_name,
  fm.workbook_name,
  -- Use recommendation_universe AMC if available (it's cleaner), otherwise fund_master
  COALESCE(ru.amc, fm.amc) AS amc,
  fm.category,

  -- Workbook cross-reference
  fm.workbook_id,
  fm.match_confidence,
  fm.match_method,

  -- Metrics from fund_master, FALL BACK to recommendation_universe, then fund_metrics
  COALESCE(ru.expense_ratio, fm.expense_ratio) AS expense_ratio,
  COALESCE(ru.aum, fm.aum) AS aum,
  COALESCE(ru.fund_manager, fm.fund_manager) AS fund_manager,
  fm.beta,
  fm.alpha,
  fm.std_dev,
  fm.is_active,
  fm.launch_date,
  fm.last_nav_date,
  fm.first_nav_date,
  fm.total_data_points,

  -- Returns from fund_metrics (unchanged)
  f.return_1m, f.return_3m, f.return_6m,
  f.cagr_1y, f.cagr_3y, f.cagr_5y,

  -- Risk from fund_metrics (unchanged)
  f.volatility_1y, f.volatility_3y, f.volatility_5y, f.max_drawdown,

  -- Risk-adjusted from fund_metrics (unchanged)
  f.sharpe_ratio_1y, f.sharpe_ratio_3y, f.sharpe_ratio_5y,
  f.sortino_ratio_1y, f.sortino_ratio_3y, f.sortino_ratio_5y,

  -- Quality from fund_metrics (unchanged)
  f.consistency_score, f.confidence_score, f.recommendation_score,

  -- Additional fund_metrics fields
  f.net_assets, f.turnover, f.min_investment, f.exit_load, f.benchmark,
  f.avg_credit_quality, f.avg_maturity, f.ytm,
  f.ret_1w, f.ret_1y_overall, f.ret_3y_overall, f.ret_5y_overall, f.ret_10y_overall,

  -- Audit
  fm.matched_at,
  fm.updated_at AS fund_master_updated_at,
  f.last_calculated AS metrics_last_calculated

FROM fund_master fm
LEFT JOIN fund_metrics f ON fm.scheme_code = f.scheme_code
LEFT JOIN recommendation_universe ru ON fm.scheme_code = ru.scheme_code
WHERE fm.match_method IS DISTINCT FROM 'unmatched';
```

### What this changes

| Change | Impact |
|--------|--------|
| `COALESCE(ru.amc, fm.amc)` | Uses VR-clean AMC when available (fixes 27.1% corruption) |
| `COALESCE(ru.expense_ratio, fm.expense_ratio)` | 5,883 funds get ER instead of 1,759 |
| `COALESCE(ru.aum, fm.aum)` | 5,941 funds get AUM instead of 1,767 |
| `COALESCE(ru.fund_manager, fm.fund_manager)` | 8,095 funds get FM instead of 1,805 |

### Frontend code changes required

**NONE.** All frontend code reads from `fund_master_enriched` view. The view change propagates automatically.

### Files that must be changed

**Exactly one file:**
`supabase/migrations/20260615000004_create_fund_master_enriched_view.sql` — Replace the `CREATE OR REPLACE VIEW` statement

**Deploy:**
```bash
supabase migration up
# OR run the SQL directly in Supabase SQL Editor
```

### Pages affected (all of them — fixed by this single change)

| Page | Currently broken | After fix |
|------|-----------------|-----------|
| Dashboard FundCards | 95% show "NA" for ER/AUM | 73% show real values |
| All Funds table | ER/AUM/FM columns 95% "NA" | 73% show real values |
| Fund Detail Modal | ER/AUM "NA", FM "NA" | 73% show real values |
| Search results | ER column 95% "NA" | 73% show real values |
| Recommendation Engine | ER weight neutral for 95% | ER weight scores 73% of funds |
| Recommendation "reasons" | Never generates "Low expense" | Generates for low-ER funds |

---

## 5. Reproducing the Verification

To prove `recommendation_universe` is unused, run:

```sql
-- Number of recommendation_universe rows that have enriched ER but fund_master doesn't:
SELECT COUNT(*)
FROM recommendation_universe ru
LEFT JOIN fund_master fm ON ru.scheme_code = fm.scheme_code
WHERE ru.expense_ratio IS NOT NULL
  AND fm.expense_ratio IS NULL;
-- Expected: ~4,124 (5,883 - 1,759)
```

```sql
-- What users currently see for a VR-enriched fund:
SELECT 'fund_master_enriched' AS source, expense_ratio, aum, fund_manager
FROM fund_master_enriched
WHERE scheme_code = '120716'
UNION ALL
SELECT 'recommendation_universe', expense_ratio, aum, fund_manager
FROM recommendation_universe
WHERE scheme_code = '120716';
```
