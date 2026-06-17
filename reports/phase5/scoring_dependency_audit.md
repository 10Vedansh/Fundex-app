# Scoring Dependency Audit — Phase 5.4B

## Bug: Adapter null→0 Conversion

### Root Cause

`src/utils/fundMasterAdapter.ts:70` (and `:71-77`) used `?? 0` to convert null DB values to 0:

```typescript
expenseRatio: row.expense_ratio ?? 0,   // was: null → 0
aum: row.aum ?? row.net_assets ?? 0,     // was: null → 0
cagr1Y: row.cagr1y ?? 0,
cagr3Y: row.cagr3y ?? 0,
cagr5Y: row.cagr5y ?? 0,
volatility: row.volatility ?? 0,
sharpeRatio: row.sharpe_ratio ?? 0,
beta: row.beta ?? 0,
alpha: row.alpha ?? 0,
```

### Impact Analysis

#### 1. expense_ratio null → 0 (CRITICAL — 83.6% of funds)

- **6,769 / 8,095** funds have `expense_ratio IS NULL` in recommendation_universe
- Adapter mapped null → 0
- `safeNum(0)` returned `0` (valid number)
- Scoring engine: `expenseRaw = 0`, normalized to `expenseN = 1.0` (perfect score)
- **Penalty**: Funds with unknown expenses were scored as if they had 0% expense ratio — the best possible score
- Scoring formula in `scoringEngineV3.ts`:
  ```typescript
  const exp = safeNum(f.expenseRatio) ?? 0.5;  // neutral fallback never reached because 0 is truthy
  ```

#### 2. aum null → 0 (HIGH — 83.6% of funds)

- **6,768 / 8,095** funds have `aum IS NULL`
- `safeNum(0)` returned `0`
- Scoring: `aumRaw = 0`, normalized to `aumN ≈ 0` (worst score)
- **Filter** in `src/utils/recommendation/intersectionEngine.ts:229`:
  ```typescript
  const aum = safeNum(f.aum);  // returned 0 instead of null
  if (aum !== null && aum < c.minAum) return false;  // 0 < 200 → filtered out!
  ```
- Funds with unknown AUM were **incorrectly excluded** by minAum filters (e.g., SIP ≥₹500 filters require AUM ≥200Cr)

#### 3. CAGR/volatility/sharpe/beta/alpha null → 0 (LOW)

- `safeNum(0)` returns `0` for CAGR fields → scoring treats 0% CAGR as valid but poor
- Volatility: 0% volatility → perfect `volN = 1.0` (makes fund look extremely stable)
- Sharpe: 0 → worst normalized score
- Beta: 0 → may pass/fail beta filters incorrectly

### Downstream Fixes Required

| File | Lines | Issue | Status |
|------|-------|-------|--------|
| `src/utils/fundMasterAdapter.ts` | 69-77 | `?? 0` → `?? null` | ✅ Fixed |
| `src/types/mutualFund.ts` | 14-22 | `number` → `number \| null` | ✅ Fixed |
| `src/utils/investmentGuidance.ts` | 18-117 | Direct field comparisons without null guards | ✅ Fixed |
| `src/pages/Index.tsx` | 430-454 | `.toFixed()` on nullable fields | ✅ Fixed |
| `src/components/dashboard/PortfolioFundModal.tsx` | 118-137 | `.toFixed()` on nullable fields | ✅ Fixed |
| `src/components/dashboard/RecommendationCard.tsx` | 71-110 | `.toFixed()` and `.toLocaleString()` | ✅ Fixed |
| `src/components/dashboard/RiskReturnChart.tsx` | 45-53 | `.toFixed()` on nullable fields | ✅ Fixed |

### Already Null-Safe (No Changes Needed)

| File | Notes |
|------|-------|
| `src/utils/recommendationEngine.ts` | Uses `safeNumber()` which accepts `number \| null` |
| `src/utils/recommendation/scoringEngineV3.ts` | Uses `safeNum()` with `?? 0.5` fallback |
| `src/utils/recommendation/intersectionEngine.ts` | Checks `aum !== null` before filtering |
| `src/utils/recommendation/explainabilityEngine.ts` | Guards with `!== null && typeof === 'number'` |
| `src/utils/displayUtils.ts` | `fmtOrNA`/`fmtCrOrNA` accept `number \| null \| undefined` |
| `src/audit/scoringBreakdown.ts` | Uses `safeNum()`, no direct `.toFixed()` |
| `src/audit/run.ts` | Uses `== null` checks, `?? ''` for export |
| `src/audit/confidenceAudit.ts` | Uses `== null` checks |
| `src/components/dashboard/FundCard.tsx` | Uses `fmtVal()` which returns 'NA' for null |
| `src/components/dashboard/FundDetailModal.tsx` | Uses `fmtOrNA()` |
| `src/pages/Search.tsx` | Already had `!= null` guards |
| `src/components/dashboard/SIPCalculator.tsx` | Already had `?? 0` and `!= null` guards |
| `src/components/dashboard/ReturnAnalysisChart.tsx` | `volatility \|\| 15` handles null |

### Before/After Scoring Comparison

| Metric | Before (null→0) | After (null preserved) | Impact |
|--------|-----------------|----------------------|--------|
| expenseN | `1.0` (perfect) | `0.5` (neutral) | ⚠️ Major — 6,769 funds drop from top tier |
| aumN | `~0` (worst) | `0.5` (neutral) | ⚠️ Major — funds no longer incorrectly filtered |
| cagr1Y/3Y/5Y N | `0` with penalty | `0.5` (neutral) | ⚡ Some rank shifts |
| volN | `1.0` (perfect) | `0.5` (neutral) | ⚡ Some rank shifts |
| sharpeN | `~0` (worst) | `0.5` (neutral) | ⚡ Some rank shifts |
| Composite | Artificially inflated/ deflated | Neutral for unknowns | ✅ Correct |

### Verification Queries (Post-Fix)

```sql
-- Confirm adapter no longer converts null to 0
SELECT id, scheme_code, expense_ratio, aum, cagr1y, cagr3y
FROM recommendation_universe
WHERE expense_ratio = 0 AND aum = 0
LIMIT 10;  -- Should return NO results for correctly ingested data
```

### Git Diff Summary

```
src/utils/fundMasterAdapter.ts     |  9 changes (?? 0 → ?? null)
src/types/mutualFund.ts            |  9 changes (number → number | null)
src/utils/investmentGuidance.ts    | 17 changes (null guard additions)
src/pages/Index.tsx                | 20 changes (null-safe conditions)
src/components/dashboard/PortfolioFundModal.tsx | 8 changes (null-guarded displays)
src/components/dashboard/RecommendationCard.tsx | 8 changes (null-guarded displays)
src/components/dashboard/RiskReturnChart.tsx    | 3 changes (null-guarded displays)
```
