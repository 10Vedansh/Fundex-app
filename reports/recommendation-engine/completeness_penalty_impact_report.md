# Completeness Penalty Impact Report — Before vs After

## Change Made

**Before:** Flat 5% penalty per null field (old `nullFieldCount` variable)

**After:** Differentiated penalties:
- **15%** per missing critical metric: Sharpe Ratio, Volatility, CAGR3Y
- **5%** per missing optional field: Sortino, Consistency, Expense Ratio, Benchmark, Fund Manager

## Summary Table

| Metric | Before | After | Change |
|---|---|---|---|
| Total recommendations | 243 | 243 | 0 |
| Unique funds recommended | 71 | 73 | +2 |
| Funds appearing in 6+ personas | 12 | 12 | 0 |
| Missing-metric funds in Top 3 instances | 28 | 28 | 0 |
| Missing-metric funds in Top 10 instances | 59 | 58 | -1 |
| Young funds (< 18mo) in Top 10 instances | 9 | 8 | -1 |
| Fallback-activated personas | 26/30 | 26/30 | 0 |

## Impact on Missing-Metric Fund Scores

| Fund | Nulls | Before Max Score | After Max Score | Δ |
|---|---|---|---|---|
| HDFC NIFTY Midcap 150 ETF | 3 critical | 27.50 | 24.65 | **-2.85** |
| HSBC Multi Cap Fund | 3 critical | 37.74 | 36.20 | **-1.54** |
| Tata Multicap Fund | 3 critical | 30.85 | 28.42 | **-2.43** |
| HDFC BSE 500 ETF | 3 critical | 29.67 | 29.67 | **0** |
| UTI Nifty 500 Value 50 Index Fund | 4 total | 21.59 | 19.45 | **-2.14** |
| SBI Nifty50 Equal Weight Index Fund | 4 total | 19.16 | 17.25 | **-1.91** |
| HDFC NIFTY Midcap 150 Index Fund | 4 total | 11.81 | 10.75 | **-1.06** |
| Helios Mid Cap Fund | 4 total | 7.07 | 6.11 | **-0.96** |
| LIC MF Nifty Midcap 100 ETF | 4 total | 10.99 | 10.03 | **-0.96** |
| Bandhan Nifty Midcap 150 Index Fund | 4 total | -- | 6.32 | *new* |
| ITI Large & Mid Cap Fund | 4 total | -- | 8.66 | *new* |
| Mirae Asset Nifty50 Equal Weight ETF | 4 total | 17.47 | 17.47 | **0** |

## Impact on Rankings — Detailed

### Missing-Metric Fund Appearances Changed

| Fund | Before (Top 10) | After (Top 10) | Δ |
|---|---|---|---|
| HSBC Multi Cap Fund | 9 | 8 | **-1** |
| Tata Multicap Fund | 8 | 7 | **-1** |
| HDFC NIFTY Midcap 150 Index Fund | 3 | 1 | **-2** |
| Mirae Asset Nifty50 Equal Weight ETF | 3 | 2 | **-1** |
| LIC MF Nifty Midcap 100 ETF | 2 | 3 | **+1** |

### Young Funds Changed

| Fund | Launch | Before (Top 10) | After (Top 10) | Δ |
|---|---|---|---|---|
| Mahindra Manulife Value Fund | 2025-03-03 | 5 personas | 5 personas | 0 |
| Helios Mid Cap Fund | 2025-03-13 | 1 persona | 1 persona | 0 |
| Mirae Asset Nifty50 Equal Weight ETF | 2025-05-09 | 3 personas | 2 personas | **-1** |

## Does the 15% Critical Penalty Improve Rankings?

**Partially, but minimally.**

### Evidence of improvement:
- Scores for 3-critical-null funds dropped 1.5-2.9 points (meaningful absolute reduction)
- 1 fewer young-fund instance in Top 10 (Mirae Asset Nifty50 Equal Weight ETF dropped from Early Career Retirement top 10)
- Missing-metric fund appearances in Top 10 decreased from 59 → 58 instances
- 2 new unique funds entered the recommendation pool (73 vs 71)

### Evidence of insufficient improvement:
- **28 instances** of missing-metric funds in Top 3 — unchanged
- **12 funds** appearing in 6+ personas — unchanged
- **26/30 personas** still using fallback — unchanged

## Root Cause Analysis: Why Rankings Didn't Change Materially

### 1. Filter bottleneck dominates rankings
The primary ranking constraint is not score but **filter pass/fail**. For aggressive-growth personas seeking equity funds with long horizons, only a handful of funds survive the filters. Those few funds often include young index ETFs with missing CAGR/volatility data. Even at a 15% penalty, they still outscore any fund that fails the filters entirely.

**Example:** "Helios Mid Cap Fund - Direct Plan" (launched 2025-03-13, 4 nulls) ranks #2 for Aggressive Retirement Accumulator in both before and after. Score dropped 7.07 → 6.11, but it's still the only mid-cap fund passing this persona's filters.

### 2. Fallback mode limits impact
26 of 30 personas trigger fallback (producing < 10 recommendations). Fallback relaxes score thresholds to fill slots. Even heavily penalized funds get recommended because there aren't enough passing funds.

### 3. Young funds have no age penalty in filters
The recency penalty (age-based score reduction at lines 397-410) only applies at 1/3/5 year boundaries. Funds launched in early 2025 (~15 months ago) are slightly past the 1-year mark, so they receive no age penalty at all.

### 4. CAGR normalization amplifies new funds
New funds with a single strong year get boosted by global CAGR normalization. A young fund with 25% CAGR can score as high or higher than a 10-year-old fund with 15% CAGR, even after the completeness penalty.

## Recommended Next Steps (if continuing)

| Approach | Expected Impact |
|---|---|
| Raise critical penalty to 30% | Would further reduce scores but not change ordering in filter-constrained personas |
| Add hard floor: null ≥ 3 → max score 50 | Would prevent 4-null funds from ranking above complete funds |
| Increase age penalty threshold to include 1-2 year funds | Would directly address young fund rankings |
| Relax filters for equity personas | Would increase candidate pool and reduce reliance on missing-metric funds |
| Add a completeness gate (skip funds with 4+ nulls entirely) | Would eliminate worst offenders but reduce total recommendations |

## Verification

- [x] TypeScript: no `nullFieldCount` ReferenceError in main `src/`
- [x] Build: `npm run build` succeeds
- [x] Lint: no new errors in `scoringEngineV3.ts`
- [x] Audit: runs to completion, all 30 personas processed
- [x] Before/after CSVs generated and compared
