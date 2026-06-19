# Debugging the Engine — Recommendation Trace Audit

## Three Profiles Under Analysis

This report traces `recommendFundsV2()` end-to-end for three investor profiles, showing every decision gate, filter constraint, scoring step, and portfolio construction phase.

---

## PROFILE 1 — Retirement Planner

### Raw Profile Fields (from database)

| Field | Value | Source |
|-------|-------|--------|
| `market_reaction` | `"wait"` | Questionnaire — "Wait out the downturn" |
| `investor_stage` | `"mid_career"` | Questionnaire |
| `emergency_fund` | `">6_months"` | Questionnaire |
| `existing_investments` | `"5l_25l"` | Questionnaire |
| `investment_horizon` | `"long"` | Questionnaire |
| `experience_level` | `"intermediate"` | Questionnaire |
| `primary_goal` | `"retirement"` | Questionnaire |
| `investment_amount` | `"large"` | Questionnaire |

### Step 1 — Risk Derivation (`deriveRiskFromProfile()` in `riskCapacity.ts:167`)

```
Factor                Value       Score    Weight    Contribution
──────────────────────────────────────────────────────────────────
Market reaction       wait        3        30%       0.90
Life stage            mid_career  3        20%       0.60
Emergency fund        >6_months   5        15%       0.75
Existing investments  5l_25l      3        15%       0.45
Dependents            0           5        10%       0.50
Investment horizon    long        5        10%       0.50
                                              ─────────
                                      Total   3.70

finalScore = Math.round(3.70) = 4
→ 4 > 3.5 → riskTolerance = "aggressive"
→ Reason: "Overall: Aggressive profile — pursuing maximum long-term growth"
```

**Divergence begins here.** The multi-factor model uses a linear weighted score but `deriveRiskFromProfile()` has no concept of retirement goal. A `mid_career` + `long` + `>6_months` profile scores 4/5 — labelled aggressive — even though the user's stated goal is retirement. Goal is **not** an input to risk derivation.

### Step 2 — Goal Normalization (`normalizeGoal()` in `intersectionEngine.ts:117`)

```
GOAL_NORMALIZE['retirement'] = 'retirement'
```

### Step 3 — Horizon Normalization (`normalizeHorizon()` in `intersectionEngine.ts:121`)

```
HORIZON_NORMALIZE['long'] = 'long'
```

### Step 4 — RecommendationsPreferences built (`intersectionEngine.ts:380`)

```typescript
{
  riskTolerance: "aggressive",     // from deriveRiskFromProfile
  investmentGoal: "retirement",    // from primary_goal
  investmentHorizon: "long",       // from profile
  experienceLevel: "intermediate", // from profile
  investmentAmount: "large",       // from profile
}
```

### Step 5 — Excluded Funds Removed (`isExcluded()` in `intersectionEngine.ts:145`)

- `EXCLUDED_FUND_NAMES` filters: "bharat 22 etf", "children", "child", "kids", "bal bhavishya"
- `BUSINESS_EXCLUDED_CATEGORIES` filters: 'EQ-INTL', 'EQ-T-ESG', 'EQ-FOF', 'Gold-Funds', 'Silver-Funds'
- Data-quality safety: funds with `EQ-` or `Index` category containing "nasdaq", "silver", "dow jones", "s&p 500", "us equity", "global", "international" in name

**Count before filter:** N (all funds)  
**Count after filter:** N - excluded

### Step 6 — Eligibility: Hard Constraints Applied (in order)

#### 6a. `applyRiskConstraints()` with `risk = "aggressive"` (`categoryMappings.ts:142`)

```
aggressive: { maxVolatility: null, maxDrawdown: null, blockedCategories: [] }
```

**Result:** No funds removed. Aggressive risk blocks nothing.

#### 6b. `applyGoalEligibility()` with `goal = "retirement"` (`categoryMappings.ts:169`)

```
retirement: {
  allowedCategoryPrefixes: ['EQ-', 'HY-', 'DT-', PLAIN_EQUITY, PLAIN_HYBRID, PLAIN_DEBT, PLAIN_INDEX],
  blockedCategories: [
    'EQ-SC', 'EQ-DIV Y',
    ...SECTORAL_CATEGORIES,           // → 11 sectoral categories
    'EQ-Quant', 'EQ-INTL', 'EQ-T-ESG', 'EQ-FOF',
    'HY-AH', 'DT-CR',
  ],
  maxVolatility: 8,
}
```

**Eligible prefix rule:** Category must start with `EQ-`, `HY-`, `DT-`, or equal `Equity`, `Hybrid`, `Debt`, `Index`.

**Blocked (removed):**
- `EQ-SC`, `EQ-DIV Y` — removed
- All sectoral categories: `EQ-BANK`, `EQ-IT`, `EQ-Pharma`, `EQ-INFRA`, `EQ-PSU`, `EQ-Energy`, `EQ-Consumption`, `EQ-THEMATIC`, `EQ-SA&T`, `EQ-TBC`, `EQ-Manufacturing`, `EQ-Innovation` — removed
- `EQ-Quant`, `EQ-INTL`, `EQ-T-ESG`, `EQ-FOF` — removed
- `HY-AH` (aggressive hybrid) — removed
- `DT-CR` (credit risk debt) — removed

**Volatility filter:** Any fund with `volatility > 8` removed.

**Result after goal eligibility:** Only funds in allowed prefix categories, not in blocked list, with vol ≤ 8.

| Allowed | Blocked | Net after goal |
|---------|---------|----------------|
| `EQ-LC`, `EQ-FLX`, `EQ-MLC`, `EQ-L&MC`, `EQ-MC`, `EQ-VAL`, `EQ-ELSS` | `EQ-SC`, `EQ-DIV Y`, all sectorals, `EQ-Quant` | Large, flexi, multi, mid, value, ELSS survive |
| `HY-CH`, `HY-DAA`, `HY-MAA`, `HY-BH`, `HY-EQ S`, `HY-IPA`, `HY-AR` | `HY-AH` | All hybrids except aggressive survive |
| All `DT-*` | `DT-CR` | All debt except credit risk survive |
| `Equity`, `Index`, `Debt`, `Hybrid`, `Liquid` (plain codes) | — | Plain categories survive |

#### 6c. `applyHorizonRules()` with `horizon = "long"` (`categoryMappings.ts:250`)

```
long: {
  blockedCategories: ['DT-OVERNHT', 'DT-LIQ', 'DT-MM'],
}
```

**Result:** Overnight, liquid, money market debt funds removed. No equity impact.

#### 6d. `applyExperienceFilter()` with `experience = "intermediate"` (`categoryMappings.ts:273`)

```
intermediate: { allowSectoral: true }
```

**Result:** No funds removed (sectorals already blocked by goal).

#### 6e. `applyAmountConstraints()` with `amount = "large"` (`categoryMappings.ts:305`)

```
large: { minAum: 500, maxExpense: 1, directPlanOnly: true }
```

**Result:** Only funds with `aum ≥ 500 Cr`, `expenseRatio ≤ 1%`, and direct plans survive.

### Step 7 — Fallback triggered? (`intersectionEngine.ts:410`)

Only if eligible.length === 0. For retirement + aggressive + long with typical fund data, eligible should contain funds.

### Step 8 — Profile Type Determination (`determineProfileType()` in `scoringEngineV3.ts:217`)

```typescript
determineProfileType("aggressive", "retirement", "long", "intermediate")
```

```
riskTolerance = "aggressive":
  investmentGoal = "retirement" → NOT "capital_preservation"
  investmentHorizon = "long" → NOT "short"
  → return "aggressive"
```

**profileType = "aggressive"** — full growth-weight profile (Sortino 0.15, CAGR 0.30, Consistency 0.20, Sharpe 0.15, Vol 0.05, Expense 0.05, AUM 0.05, Diversification 0.05)

### Step 9 — Category Medians (`computeCategoryMedians()` in `scoringEngineV3.ts:33`)

Groups funds by category code via `toCategoryCode(f.category || '')`. Computes median CAGR, Sharpe, Sortino, volatility, expense per category. Excludes nulls from median calculation.

### Step 10 — Norm Stats (`computeNormStats()` in `scoringEngineV3.ts:161`)

Global min/max across all eligible funds for Sortino, Sharpe, volatility, expense, AUM, CAGR. Used for min-max normalization.

### Step 11 — Per-Fund Scoring (`scoreV3()` in `scoringEngineV3.ts:274`)

For each eligible fund, computes:

| Sub-score | Aggressive weight | Description |
|-----------|-------------------|-------------|
| Sortino   | 0.15              | `normalize(sortino, minSortino, maxSortino)` |
| CAGR      | 0.30              | `normalize(cagr3Y, minCagr, maxCagr)` |
| Consistency | 0.20            | `approximateConsistency()` — fraction of periods beating 80% of category median CAGR |
| Sharpe    | 0.15              | `normalize(sharpe, minSharpe, maxSharpe)` |
| Volatility | 0.05             | `1 - normalize(vol, minVol, maxVol)` |
| Expense   | 0.05              | Category-relative: 1 - (ratio - 0.8) / 1.2, clamped [0,1] |
| AUM       | 0.05              | `normalize(aum, minAum, maxAum)` |
| Diversif. | 0.05              | `categoryBreadthScore()` — 1.0 for SC, 0.9 for MC/FLX, 0.7 for LC, etc. |

**Then applies:**
- `computeCreditPenalty()` — 0 for non-debt, up to 0.25 for debt with low credit quality
- Experience modifier: `intermediate` — if vol > 25, score *= 0.85
- Completeness penalty: 15% per missing critical field (Sharpe, Vol, CAGR), 5% per missing optional (Sortino, Consistency, Expense, Benchmark, FundManager)
- Age penalty: <1yr = 0.70, <3yr = 0.85, <5yr = 0.95

### Step 12 — Confidence (`computeConfidence()` in `intersectionEngine.ts:56`)

Based on fund age (years since launch) and number of null critical metrics (Sharpe, Vol, CAGR). Returns `high`/`medium`/`limited_history` with reason string.

### Step 13 — Explanations (`generateExplanations()` in `explainabilityEngine.ts:21`)

Generates 3-13 bullet points comparing fund metrics to category medians, including confidence, risk alignment, goal-specific messages.

### Step 14 — Sort & Construct

Scored funds sorted descending by `compositeScore`, then `constructPortfolio()` called for top candidates.

### Step 15 — Portfolio Construction (`constructPortfolio()` in `portfolioConstructor.ts:43`)

```typescript
constructPortfolio(scored, prefs, target=9, normalizedGoal="retirement")
```

#### 15a. Allocation Model (`getAllocationModel(risk="aggressive", goal="retirement")` → `categoryMappings.ts:488`)

Since risk=aggressive, g=retirement → `g === 'retirement'` in aggressive block:

```
Bucket 1: ['EQ-FLX', 'EQ-MLC']              maxFunds=2  // Flexi/Multi Cap
Bucket 2: ['EQ-LC', 'EQ-L&MC', PLAIN_INDEX]  maxFunds=1  // Large Cap
Bucket 3: ['EQ-MC']                           maxFunds=1  // Mid Cap
Bucket 4: ['HY-DAA']                          maxFunds=1  // Balanced Advantage
Bucket 5: ['HY-MAA']                          maxFunds=1  // Multi Asset Allocation
Bucket 6: ['HY-CH']                           maxFunds=1  // Conservative Hybrid
Bucket 7: ['DT-CB', 'DT-BK & PSU', 'DT-SD', PLAIN_DEBT] maxFunds=1 // Debt
Bucket 8: ['HY-AR']                           maxFunds=1  // Arbitrage
Bucket 9: ['HY-EQ S']                         maxFunds=1  // Equity Savings
```

**Total bucket capacity:** 10 funds

#### 15b. Core-Satellite Model (`getProfileTypeForCoreSatellite(risk="aggressive", goal="retirement")` → `strategyGroups.ts:142`)

```
risk === 'aggressive' → return 'aggressive'
```

**Core-Satellite Model: `aggressive`** (`strategyGroups.ts:120`):

```
coreStrategyGroups: ['large_cap_index', 'flexi_multi_cap', 'mid_cap']
satelliteStrategyGroups: ['small_cap', 'value', 'thematic_sectoral', 'quant', 'other']
```

**Key insight:** Retirement goal is IGNORED for core-satellite model selection when risk is aggressive. The user asked for retirement but gets the aggressive core-satellite model (large cap + flexi/multi + mid cap cores; small cap, value, thematic, quant satellites).

#### 15c. PHASE 1a — Core picks (up to maxPhase1Picks)

```
maxPhase1Picks = Math.min(
  3 core + 5 satellite = 8,
  Math.floor(9 * 0.6) = 5
) = 5
```

Picks 1 fund each from:
- `large_cap_index` (EQ-LC, Index, EQ-L&MC) → pick best scored
- `flexi_multi_cap` (EQ-FLX, EQ-MLC, Equity) → pick best scored
- `mid_cap` (EQ-MC) → pick best scored

**3 core picks** made, phase1Picks = 3.

#### 15d. PHASE 1b — Satellite picks (up to maxPhase1Picks)

Remaining: 5 - 3 = 2 picks. Iterates:
- `small_cap` → NOT eligible (EQ-SC blocked by retirement goal)
- `value` (EQ-VAL) → eligible
- `thematic_sectoral` → NOT eligible (all sectorals blocked by retirement goal)
- `quant` → NOT eligible (EQ-Quant blocked by retirement goal)
- `other` → depends on fund categories present

Picks up to 2 from eligible satellites.

#### 15e. PHASE 2 — Allocation Model Bucket Fill

Iterates the 9 buckets, filling each with top-scored funds not yet picked.
- Bucket 1: flexi/multi cap → likely picks 2 funds (complements Phase 1)
- Bucket 2: large cap → tries to pick 1 (Phase 1 may have already picked LC)
- Bucket 3: mid cap → tries to pick 1
- Buckets 4-9: each picks 1 (hybrids and debt)

**AMC cap = 1** enforced: no two funds from same AMC.  
**ETF cap = 3** enforced: max 3 passive funds total.

#### 15f. PHASE 3 — Fill remaining to 9

Uses remaining scored funds sorted by composite score, respecting:
- Category max from bucket config (or 1 if not in any bucket)
- AMC cap = 1
- ETF cap = 3
- Retirement arbitrage cap = 1 (`MAX_ARBITRAGE_RETIREMENT`)
- Max 60% from same asset class (6 of 9)
- Goal prefix check

#### 15g. Final 9 funds

Composition will be weighted toward equity (large, flexi, multi, mid cap) with allocations to debt, arbitrage, conservative hybrid, multi asset, and equity savings to cover the 9-bucket model.

---

## PROFILE 2 — Capital Preservation Investor

### Raw Profile Fields

| Field | Value | Source |
|-------|-------|--------|
| `market_reaction` | `"withdraw"` | "I would withdraw immediately" |
| `investor_stage` | `"retired"` | Questionnaire |
| `emergency_fund` | `"<3_months"` | Limited emergency savings |
| `existing_investments` | `"under_5l"` | Small portfolio |
| `investment_horizon` | `"short"` | Needs money soon |
| `experience_level` | `"beginner"` | New to investing |
| `primary_goal` | `"preservation"` | Capital preservation |
| `investment_amount` | `"small"` | Small amount |

### Step 1 — Risk Derivation

```
Factor                Value       Score    Weight    Contribution
──────────────────────────────────────────────────────────────────
Market reaction       withdraw    1        30%       0.30
Life stage            retired     1        20%       0.20
Emergency fund        <3_months   1        15%       0.15
Existing investments  under_5l    2        15%       0.30
Dependents            0           5        10%       0.50
Investment horizon    short       1        10%       0.10
                                              ─────────
                                      Total   1.55

finalScore = Math.round(1.55) = 2
→ 2 <= 2 → riskTolerance = "conservative"
→ Reason: "Overall: Conservative profile — prioritize capital safety"
```

### Step 2 — Goal Normalization

```
GOAL_NORMALIZE['preservation'] = 'capital_preservation'
```

### Step 3 — Horizon Normalization

```
HORIZON_NORMALIZE['short'] = 'short'
```

### Step 4 — RecommendationPreferences

```typescript
{
  riskTolerance: "conservative",
  investmentGoal: "capital_preservation",
  investmentHorizon: "short",
  experienceLevel: "beginner",
  investmentAmount: "small",
}
```

### Step 5 — Excluded Funds Removed

Same as Profile 1.

### Step 6 — Eligibility Hard Constraints

#### 6a. Risk Constraints with `risk = "conservative"` (`categoryMappings.ts:118`)

```
conservative: {
  maxVolatility: 4,
  maxDrawdown: 8,
  blockedCategories: [
    'EQ-SC', 'EQ-MC', 'EQ-L&MC', 'EQ-MLC', 'EQ-FLX', 'EQ-VAL', 'EQ-Quant', 'EQ-ELSS', 'EQ-DIV Y',
    ...SECTORAL_CATEGORIES,
    'DT-CR',
    'HY-AH', 'HY-BH', 'HY-DAA', 'HY-MAA',
  ],
}
```

**Removed:** All equity growth categories (SC, MC, L&MC, MLC, FLX, VAL, Quant, ELSS, DIV Y), all sectorals, credit risk debt, aggressive/balanced/dynamic/multi-asset hybrids.

**Survive risk constraint:** Only `EQ-LC`, `DT-` (except DT-CR), `HY-CH`, `HY-AR`, `HY-EQ S`, `HY-IPA`, `Equity` (plain), `Debt` (plain), `Liquid` (plain).

#### 6b. Goal Eligibility with `goal = "capital_preservation"` (`categoryMappings.ts:216`)

```
capital_preservation: {
  allowedCategoryPrefixes: ['DT-', 'HY-CH', 'HY-AR', 'HY-EQ S', PLAIN_DEBT, PLAIN_LIQUID],
  blockedCategories: [
    ...EQUITY_CATEGORIES,    // all equity categories
    'HY-AH', 'HY-BH', 'HY-DAA', 'HY-MAA',
    PLAIN_EQUITY, PLAIN_HYBRID, PLAIN_INDEX,
  ],
  maxVolatility: 4,
}
```

**Allowed:** Only `DT-*` (all debt), `HY-CH`, `HY-AR`, `HY-EQ S`, `Debt`, `Liquid`.

**Blocked additionally:** Every single equity category, aggressive/balanced/dynamic/multi-asset hybrids, plain Equity, plain Hybrid, plain Index.

**Combined with risk:** Risk allowed `EQ-LC` but goal blocks ALL equity. So equity is completely removed. Risk allowed `HY-DAA` but goal blocks it. Result is intersection of both:

**Surviving categories after both filters:** `DT-*` (all debt except DT-CR which risk blocks), `HY-CH`, `HY-AR`, `HY-EQ S`, `Debt` (plain), `Liquid` (plain).

**Volatility ≤ 4** applied (both risk and goal set this cap — same value).

#### 6c. Horizon Rules with `horizon = "short"` (`categoryMappings.ts:232`)

```
short: {
  blockedCategories: [
    ...EQUITY_CATEGORIES,
    'HY-AH', 'HY-BH', 'HY-DAA', 'HY-MAA',
    'DT-CR', 'DT-LONG D', 'DT-M to LD',
  ],
}
```

**Removed in addition:** `DT-LONG D` (long duration debt), `DT-M to LD` (medium to long duration).

No new equity removals (equity already removed by goal).

#### 6d. Experience Filter with `experience = "beginner"` (`categoryMappings.ts:267`)

```
beginner: { allowSectoral: false }
```

No sectorals survive anyway — no change.

#### 6e. Amount Constraints with `amount = "small"` (`categoryMappings.ts:301`)

```
small: { minAum: null, maxExpense: null, directPlanOnly: false }
```

No funds removed.

### Step 7 — Fallback triggered?

Only if eligible.length === 0. For capital_preservation + conservative + short with typical fund data, eligible likely has funds (debt funds, conservative hybrids, arbitrage).

**If eligible is empty** (possible if no debt funds survive the volatility ≤ 4 filter):

Fallback chain for non-locked goals (capital_preservation has `lockInFlag: false`):
1. Risk+Goal+Horizon → same as above → probably still empty
2. Risk+Goal+Horizon(relaxed) → same again → empty
3. Risk+Goal (no horizon) → removes `DT-LONG D`, `DT-M to LD` block → more debt funds eligible
4. Risk+Goal(noPrefix) → relaxes prefix check, still applies other goal constraints → might get funds
5. Risk+Horizon (no goal) → removes goal prefix/blocked — but may bring equity back via risk
6. Risk-only → all risk-allowed funds (EQ-LC alone, HY-CH, HY-AR, HY-EQ S, debt) → likely has funds
7. Last resort: relaxed risk+goal blocked categories check only

### Step 8 — Profile Type

```typescript
determineProfileType("conservative", "capital_preservation", "short", "beginner")
```

```
riskTolerance = "conservative" → return 'conservative' immediately (line 225)
```

**profileType = "conservative"** — safety-first weights (Sortino 0.40, CAGR 0.10, Consistency 0.20, Sharpe 0.10, Volatility 0.15, no AUM, no Diversification bonus)

### Step 9 — Category Medians

Same as Profile 1 but computed over a much smaller fund universe (only debt + conservative hybrid + arbitrage + equity savings).

### Step 10 — Norm Stats

Same — over the smaller universe.

### Step 11 — Per-Fund Scoring

Conservative weights applied:
- Sortino: **40%** weight (vs 15% for aggressive) — rewards downside protection
- CAGR: only 10% (growth is not the goal)
- Volatility: 15% (penalizes volatility)
- Consistency: 20%
- Sharpe: 10%
- Expense: 5%
- AUM: 0% (no AUM bonus)

**Experience modifier:** `beginner` — if vol > 15, score *= 0.7; if expense > 1.5, score *= 0.9

**Credit penalty:** Applied to debt funds based on credit quality.

### Step 12 — Confidence

Same logic as Profile 1.

### Step 13 — Explanations

Goal-specific: "Low-risk debt fund for capital safety" triggered for DT- funds with conservative risk.

### Step 14 — Sort & Construct

### Step 15 — Portfolio Construction

```typescript
constructPortfolio(scored, prefs, target=9, normalizedGoal="capital_preservation")
```

#### 15a. Allocation Model (`getAllocationModel(risk="conservative", goal="capital_preservation")`)

risk=conservative, g=preservation → `g === 'preservation'` → `categoryMappings.ts:421`:

```
Bucket 1: ['DT-CB', 'DT-BK & PSU', PLAIN_DEBT]     maxFunds=3  // Corporate bonds
Bucket 2: ['DT-LIQ', 'DT-USD', 'DT-OVERNHT', 'DT-MM', PLAIN_LIQUID] maxFunds=2  // Liquid
Bucket 3: ['DT-GL', 'DT-TM', 'DT-Floater']          maxFunds=2  // Gilt/Floater
Bucket 4: ['DT-SD', 'DT-LD']                        maxFunds=2  // Short duration
```

**Total capacity:** 9 funds. **All debt.** No equity at all.

#### 15b. Core-Satellite Model (`getProfileTypeForCoreSatellite("conservative", "capital_preservation")`)

```
risk !== 'aggressive' → check goal
goal === 'capital_preservation' → return 'preservation'
```

**Core-Satellite Model: `preservation`** (`strategyGroups.ts:133`):

```
coreStrategyGroups: [
  'ultra_short_debt', 'liquid', 'money_market', 'short_debt',
  'corp_debt', 'floater', 'gilt', 'medium_debt', 'dynamic_debt', 'long_debt'
]
satelliteStrategyGroups: ['arbitrage', 'conservative_hybrid']
```

#### 15c. Phase 1a — Core picks

```
maxPhase1Picks = Math.min(10 core + 2 satellite = 12, Math.floor(9 * 0.6) = 5) = 5
```

Picks 1 fund from the top 5 highest-scored core strategy groups with available funds:
- `corp_debt` (DT-CB, DT-BK & PSU, Debt)
- `short_debt` (DT-SD, DT-LD)
- `gilt` (DT-GL, DT-TM, DT-Gilt 10Y CD)
- `liquid` (DT-LIQ, Liquid)
- `ultra_short_debt` (DT-OVERNHT, DT-USD)

#### 15d. Phase 1b — Satellite picks

Remaining: 5 - 5 = 0. No satellite picks.

#### 15e. Phase 2 — Bucket Fill

Fills remaining from the 4 debt allocation buckets:
- Corporate bond bucket: fills up to 3
- Liquid/ultra-short: fills up to 2
- Gilt/floater: fills up to 2
- Short duration: fills up to 2

#### 15f. Phase 3 — Fill remaining

If still < 9, picks top-scored remaining debt funds respecting AMC cap = 1, category caps from bucket config.

#### 15g. Final 9 funds

**100% debt.** All short-duration, liquid, corporate bond, gilt, or ultra-short debt funds. No equity, no hybrid (except possibly HY-AR or HY-CH if they survived goal eligibility, but `HY-CH` and `HY-AR` are NOT in any allocation bucket for conservation — they would only appear in Phase 3 fill).

---

## PROFILE 3 — Experienced Opportunistic Investor

### Raw Profile Fields

| Field | Value | Source |
|-------|-------|--------|
| `market_reaction` | `"invest_more"` | "I would invest more in a downturn" |
| `investor_stage` | `"early_career"` | Early career professional |
| `emergency_fund` | `">6_months"` | Strong emergency buffer |
| `existing_investments` | `"25l_plus"` | Large existing portfolio |
| `investment_horizon` | `"long"` | Long time horizon |
| `experience_level` | `"experienced"` | Experienced investor |
| `primary_goal` | `"wealth"` | Wealth creation |
| `investment_amount` | `"above_10l"` | Large investment amount |

### Step 1 — Risk Derivation

```
Factor                Value       Score    Weight    Contribution
──────────────────────────────────────────────────────────────────
Market reaction       invest_more 5        30%       1.50
Life stage            early_career4        20%       0.80
Emergency fund        >6_months   5        15%       0.75
Existing investments  25l_plus    5        15%       0.75
Dependents            0           5        10%       0.50
Investment horizon    long        5        10%       0.50
                                              ─────────
                                      Total   4.80

finalScore = Math.round(4.80) = 5
→ 5 > 3.5 → riskTolerance = "aggressive"
→ Reason: "Overall: Aggressive profile — pursuing maximum long-term growth"
```

### Step 2 — Goal Normalization

```
GOAL_NORMALIZE['wealth'] = 'wealth_creation'
```

### Step 3 — Horizon Normalization

```
HORIZON_NORMALIZE['long'] = 'long'
```

### Step 4 — RecommendationPreferences

```typescript
{
  riskTolerance: "aggressive",
  investmentGoal: "wealth_creation",
  investmentHorizon: "long",
  experienceLevel: "experienced",
  investmentAmount: "above_10l",
}
```

### Step 5 — Excluded Funds Removed

Same as above.

### Step 6 — Eligibility Hard Constraints

#### 6a. Risk Constraints with `risk = "aggressive"` → no constraints, no removals

#### 6b. Goal Eligibility with `goal = "wealth_creation"` (`categoryMappings.ts:161`)

```
wealth_creation: {
  allowedCategoryPrefixes: ['EQ-', 'HY-', 'DT-', PLAIN_EQUITY, PLAIN_INDEX, PLAIN_HYBRID, PLAIN_DEBT],
  blockedCategories: ['EQ-DIV Y', 'EQ-INTL', 'EQ-T-ESG', 'EQ-FOF'],
  maxVolatility: null,
}
```

**Removed:** Only `EQ-DIV Y`, `EQ-INTL`, `EQ-T-ESG`, `EQ-FOF`. Everything else survives.

#### 6c. Horizon Rules with `horizon = "long"` (`categoryMappings.ts:250`)

```
long: {
  blockedCategories: ['DT-OVERNHT', 'DT-LIQ', 'DT-MM'],
}
```

**Removed:** Overnight, liquid, money market debt funds.

#### 6d. Experience Filter with `experience = "experienced"`

```
experienced: { allowSectoral: true }
```

No funds removed.

#### 6e. Amount Constraints with `amount = "above_10l"` (`categoryMappings.ts:306`)

```
above_10l: { minAum: 500, maxExpense: 1, directPlanOnly: true }
```

**Removed:** Funds with AUM < 500 Cr, expense > 1%, and non-direct plans.

### Step 7 — Fallback

Not triggered — very large eligible pool.

### Step 8 — Profile Type

```typescript
determineProfileType("aggressive", "wealth_creation", "long", "experienced")
```

```
riskTolerance = "aggressive":
  investmentGoal = "wealth_creation" → NOT "capital_preservation"
  investmentHorizon = "long" → NOT "short"
  → return "aggressive"
```

**profileType = "aggressive"** — full growth weight profile.

### Step 9 — Category Medians

Computed over the full eligible universe (virtually all equity, all non-excluded debt, all hybrids except dividend yield).

### Step 10 — Norm Stats

Wider range due to diverse fund universe.

### Step 11 — Per-Fund Scoring

**Aggressive weights** applied as in Profile 1.

**Experience modifier:** `experienced` — if vol > 10 AND vol < 25, score *= 1.05 (5% boost for experienced investors using moderate volatility). No expense penalty.

### Step 12-14 — Same as Profile 1

### Step 15 — Portfolio Construction

```typescript
constructPortfolio(scored, prefs, target=9, normalizedGoal="wealth_creation")
```

#### 15a. Allocation Model (`getAllocationModel(risk="aggressive", goal="wealth_creation")` → `categoryMappings.ts:501`)

```
Aggressive + wealth:
  Bucket 1: ['EQ-SC', PLAIN_EQUITY]             maxFunds=2   // Small cap
  Bucket 2: ['EQ-MC']                            maxFunds=2   // Mid cap
  Bucket 3: ['EQ-FLX', 'EQ-MLC']                maxFunds=2   // Flexi/Multi cap
  Bucket 4: [...SECTORAL_CATEGORIES]             maxFunds=1   // Sectoral
  Bucket 5: ['EQ-VAL', 'EQ-Quant']               maxFunds=1   // Value/Quant
  Bucket 6: ['EQ-L&MC', 'EQ-LC', PLAIN_INDEX]    maxFunds=1   // Large cap
```

**Total capacity:** 9 funds. **100% equity.** No debt, no hybrid in allocation model.

#### 15b. Core-Satellite Model (`getProfileTypeForCoreSatellite("aggressive", "wealth_creation")`)

```
risk === 'aggressive' → return 'aggressive'
```

**Same model as Profile 1 (aggressive):**
```
core: ['large_cap_index', 'flexi_multi_cap', 'mid_cap']
satellite: ['small_cap', 'value', 'thematic_sectoral', 'quant', 'other']
```

#### 15c. Phase 1a — Core picks (max = 5)

```
maxPhase1Picks = Math.min(8, Math.floor(9 * 0.6) = 5) = 5
```
- `large_cap_index` (EQ-LC, Index, EQ-L&MC) → 1
- `flexi_multi_cap` (EQ-FLX, EQ-MLC, Equity) → 1
- `mid_cap` (EQ-MC) → 1

**3 core picks, phase1Picks = 3.**

#### 15d. Phase 1b — Satellite picks (remaining = 2)

- `small_cap` (EQ-SC) → eligible → 1
- `value` (EQ-VAL) → eligible → 1
- reaches maxPhase1Picks=5, stops

**5 Phase 1 picks total.** No thematic, quant, or other from Phase 1.

#### 15e. Phase 2 — Bucket Fill

Fills the 6 equity allocation buckets:
- Bucket 1 (SC, Equity): picks up to 2 (Phase 1 already took 1 SC → remaining = 1)
- Bucket 2 (MC): picks up to 2 (Phase 1 already took 1 MC → remaining = 1)
- Bucket 3 (FLX/MLC): picks up to 2 (Phase 1 took 1 FLX → remaining = 1)
- Bucket 4 (sectoral): picks up to 1
- Bucket 5 (VAL/Quant): picks up to 1 (Phase 1 took 1 VAL → remaining = 0)
- Bucket 6 (LC/L&MC/Index): picks up to 1 (Phase 1 took 1 LC → remaining = 0)

**After Phase 2:** 5 + 1 + 1 + 1 + 1 + 0 + 0 = 9 funds. Already at target.

#### 15f. Phase 3

Skipped — target already reached.

#### 15g. Final 9 funds

100% equity portfolio:
- 1 large cap (ELSS, LC, or index)
- 1 flexi/multi cap
- 1 mid cap
- 1 small cap
- 1 value/quant
- 1 sectoral
- + additional from the buckets that had room (SC, MC, FLX)

**No debt, no hybrid.** All AMCs unique. Max 3 ETFs.

---

## Comparison: Where Divergence Begins

### A) Dashboard UI Output vs recommendFundsV2 output

**Same.** The dashboard (`Index.tsx:245`) calls `recommendFundsV2(funds, prefs)` directly. The only difference is `Index.tsx:247`:

```typescript
const result = recommended.length > 0 ? recommended.slice(0, 9) : funds.slice(0, 9);
```

The slice to 9 is redundant because `constructPortfolio()` already returns at most `target=9` funds. If `recommendFundsV2` returns fewer than 9 (possible if fallback produces < 9), the dashboard falls back to `funds.slice(0, 9)` — **raw fund data with no scoring**.

### B) recommendFundsV2 output vs portfolioConstructor output

`recommendFundsV2()` **returns** the output of `constructPortfolio()` (`intersectionEngine.ts:465`):

```typescript
const diversified = constructPortfolio(scored, normalizedPrefs, 9, normalizedPrefs.investmentGoal);
return diversified;
```

**They are the same.** The divergence that matters is in the *other* caller:

### C) portfolioComparisonEngine → OLD constructPortfolio

`portfolioComparisonEngine.ts:315` calls **`portfolioConstruction.ts:70`** (OLD), NOT `portfolioConstructor.ts:43` (NEW). This means:

| Aspect | Dashboard UI path | Comparison engine path |
|--------|------------------|----------------------|
| Constructor | `portfolioConstructor.ts` (NEW) | `portfolioConstruction.ts` (OLD) |
| Strategy | Core-Satellite Phase 1/2/3 | Equity/Debt % buckets |
| AMC cap | 1 | 2 |
| Max same class | 60% | Not enforced |
| Selection reason | Yes | No |

**Divergence point: Line 315 in `portfolioComparisonEngine.ts`.**

### D) Where divergence begins — Summary Table

| Step | Profile 1 (Retirement) | Profile 2 (Capital Pres) | Profile 3 (Opportunistic) |
|------|----------------------|--------------------------|---------------------------|
| **Risk derivation** | `aggressive` (score 4) — ignores goal | `conservative` (score 2) | `aggressive` (score 5) |
| **Goal normalization** | `retirement` | `capital_preservation` | `wealth_creation` |
| **Goal eligibility removes** | SC, sectorals, Quant, DIV Y, INT, ESG, FOF, HY-AH, DT-CR; vol ≤ 8 | ALL EQUITY, most hybrids; vol ≤ 4 | DIV Y, INT, ESG, FOF only |
| **Risk constraints add** | None (aggressive = open) | Blocks remaining equity growth categories CAPTURED BY GOAL already | None |
| **Horizon removes** | Overnight, liquid, MM | Long duration debt (on top of goal's equity block) | Overnight, liquid, MM |
| **Experience filter** | None (intermediate, allowSectoral) | None (sectorals already gone) | None (experienced, allowSectoral) |
| **Amount removes** | AUM ≥ 500, expense ≤ 1%, direct plan | None (small = no constraints) | AUM ≥ 500, expense ≤ 1%, direct plan |
| **Profile type** | `aggressive` | `conservative` | `aggressive` |
| **Scoring weights** | Sortino 15%, CAGR 30%, Consistency 20% | Sortino **40%**, CAGR **10%**, Consistency 20% | Same as Profile 1 |
| **Experience scoring** | None | Beginner: vol > 15 → ×0.7, exp > 1.5 → ×0.9 | Experienced: vol 10-25 → ×**1.05** |
| **Allocation model** | Aggressive+retirement (9 buckets: equity + hybrids + debt) | Conservative+preservation (4 debt-only buckets) | Aggressive+wealth (6 equity-only buckets) |
| **Core-satellite model** | `aggressive` (large, flexi, mid core; small, value, thematic, quant satellite) | `preservation` (all debt core; arbitrage, conservative hybrid satellite) | Same as Profile 1 |
| **Phase 1** | 3 core + 2 satellite = 5 | 5 debt-core picks | 3 core + 2 satellite = 5 |
| **Phase 2** | Hybrid/debt buckets filled | 4 debt buckets filled | 6 equity buckets, likely hits 9 |
| **Phase 3** | Maybe 1-2 fill slots | Maybe 1-2 fill slots | Skipped (already 9) |
| **Final portfolio** | Mixed: equity growth + hybrids + debt cushion | 100% debt: short, liquid, corp, gilt | 100% equity: LC, FLX, MC, SC, VAL, sectoral |

### Key Divergence Points (exact code lines)

| Point | File:Line | What happens |
|-------|-----------|-------------|
| Risk ignores goal | `riskCapacity.ts:228-235` | `deriveRiskFromProfile()` has NO goal parameter. Retirement planner gets labelled `aggressive` |
| Core-satellite ignores retirement for aggressive risk | `strategyGroups.ts:142-148` | `getProfileTypeForCoreSatellite("aggressive", "retirement")` returns `"aggressive"`, not `"retirement"`. The user's retirement goal is ignored for Phase 1 picks. |
| Allocation model respects retirement | `categoryMappings.ts:488` | BUT the aggressive+retirement model is the ONLY combined model. All other goal+risk combos use generic. |
| Two constructPortfolio implementations | `portfolioComparisonEngine.ts:315` vs `intersectionEngine.ts:465` | Comparison engine uses OLD bucket-based constructor with AMC cap 2. Main engine uses NEW core-satellite constructor with AMC cap 1. |
| fallback can return all funds for non-locked goals | `intersectionEngine.ts:353-358` | If eligible is empty and fallback progresses to `Risk-only`, it returns all risk-allowed funds — potentially including inappropriate categories for the goal. |
| capital_preservation has `lockInFlag: false` | `categoryMappings.ts:222` | Despite being a preservation mandate, the goal is NOT locked. Fallback can eventually drop goal prefix entirely and return equity funds. |
| `maxVolatility: 4` duplicated | `categoryMappings.ts:120` and `categoryMappings.ts:219` | Both conservative risk and cap-preservation goal set vol ≤ 4. This is redundant but consistent. |
| Beginner experience can 30% penalty | `scoringEngineV3.ts:354` | `vol > 15` → `score *= 0.7`. In a conservative/debt universe where vol is typically < 5, this penalty may never fire. |
| Experienced 5% boost | `scoringEngineV3.ts:365-367` | `vol > 10 && vol < 25` → `score *= 1.05`. Only applies to moderate-volatility equity funds. |
| Profile 3's `above_10l` amount requires direct plan | `categoryMappings.ts:306` | For very large investments, only direct-plan funds are eligible. `directPlanOnly: true` is enforced in `applyAmountConstraints()` but **not** in `constructPortfolio()`. |
| `AMOUNT_CONSTRAINTS` key mismatch | `categoryMappings.ts:300-309` | Keys are `small`, `under_1l`, `medium`, `1l_to_10l`, `large`, `above_10l`, `50k-5lakhs`, `5lakhs+`. The profile field `investment_amount` must match exactly — no normalization. |
| No validation that `investment_amount` key exists | `intersectionEngine.ts:227-242` | `AMOUNT_CONSTRAINTS[amount]` returns `undefined` if key doesn't match → `return funds` (no filtering). Silent failure. |
| `isLocked` controls fallback severity | `intersectionEngine.ts:274` | Only `tax_saving` has `lockInFlag: true`. For capital_preservation, fallback can eventually bypass prefix check and include equity via Risk-only step. |
| Fallback minimum threshold is 5 | `intersectionEngine.ts:355` | Each fallback step requires ≥5 funds to accept. If <5, continues to more relaxed steps. This means a profile with 4 eligible funds will get progressively worse matches. |

---

## Per-Profile Risk of Incorrect Output

| Risk | Profile 1 | Profile 2 | Profile 3 |
|------|-----------|-----------|-----------|
| **Overly aggressive** | HIGH — labelled aggressive despite retirement goal | NONE — correctly conservative | NONE — correctly aggressive |
| **Wrong categories** | MODERATE — core-satellite model is `aggressive` not `retirement`, may pick small-cap satellites if any survive | LOW — goal and risk both limit to debt; only fallback risk | LOW — goal is wealth creation, equity is correct |
| **Missing diversification** | MODERATE — aggressive+retirement allocation model includes debt/hybrid, but Phase 1 picks aggressive core (no debt) | NONE — 4 debt buckets cover duration diversity | MODERATE — 100% equity, no debt/hybrid cushion even though wealth_creation allows HY- and DT- prefixes |
| **Fallback contamination** | LOW — unlikely to trigger fallback | MODERATE — if debt + HY-CH + HY-AR ≤ 4 funds, fallback can drop goal entirely and include equity via Risk-only step | LOW — unlikely to trigger fallback |
| **Scoring misalignment** | MODERATE — aggressive weights (CAGR 30%, Sortino 15%) emphasize growth over downside protection. Retirement should prioritize Sortino/consistency more. | LOW — conservative weights (Sortino 40%, CAGR 10%) align with preservation | NONE — aggressive weights align with growth |
| **Amount filter silent failure** | NONE — `large` key exists in AMOUNT_CONSTRAINTS | LOW — `small` key exists | NONE — `above_10l` key exists |

---

## Summary: Divergence Onset

```
                          ALL THREE PROFILES
                                │
                    ┌───────────┴───────────┐
                    │  deriveRiskFromProfile │  ← GOAL NOT CONSULTED
                    │  (riskCapacity.ts:167)  │
                    └───────────┬───────────┘
                                │
               ┌────────────────┼────────────────┐
               ▼                ▼                ▼
         Profile 1:        Profile 2:        Profile 3:
         aggressive        conservative      aggressive
               │                │                │
               ▼                ▼                ▼
         normalizeGoal     normalizeGoal     normalizeGoal
         "retirement"      "capital_presv"   "wealth_creation"
               │                │                │
               ▼                ▼                ▼
    ┌─────────────────────────────────────────────────┐
    │          applyGoalEligibility                    │ ← MAJOR DIVERGENCE
    │   retirement: blocks SC, sectorals, HY-AH, DT-CR│     Each goal removes
    │   capital_presv: blocks ALL equity, most hybrid │     different categories
    │   wealth_creation: blocks DIV Y, INT, ESG, FOF  │
    └─────────────────────────────────────────────────┘
               │                │                │
               ▼                ▼                ▼
         profileType =      profileType =      profileType =
         "aggressive"       "conservative"     "aggressive"
               │                │                │
               ▼                ▼                ▼
    ┌─────────────────────────────────────────────────┐
    │        getProfileTypeForCoreSatellite           │ ← DIVERGENCE FOR PROFILE 1
    │   Profile 1: returns "aggressive" (ignores      │     Core-satellite model
    │     retirement goal because risk is aggressive)  │     IGNORES retirement goal
    │   Profile 2: returns "preservation"             │     for aggressive-risk users
    │   Profile 3: returns "aggressive"               │
    └─────────────────────────────────────────────────┘
               │                │                │
               ▼                ▼                ▼
         getAllocationModel  getAllocationModel getAllocationModel
         aggressive+retire   conservative+presv aggressive+wealth
         (9 buckets:         (4 buckets:         (6 buckets:
          equity+hybrid+debt) all debt)           all equity)
               │                │                │
               ▼                ▼                ▼
         Phase 1/2/3 fills    Phase 1/2/3 fills  Phase 1/2/3 fills
         Mixed portfolio      100% debt          100% equity
```

**The single most impactful divergence point is `deriveRiskFromProfile()` not accepting the investment goal as input.** A `mid_career` professional saving for retirement gets labelled `aggressive` because their income stability, emergency fund, and long horizon push the score to 4. This propagates through the entire pipeline: profile type, core-satellite model, allocation model, and scoring weights all assume aggressive growth rather than retirement-focused allocation.
