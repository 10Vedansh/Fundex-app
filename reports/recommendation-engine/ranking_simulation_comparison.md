# Ranking Simulation Comparison

**Date:** 2026-06-12
**Fund Universe:** 2011 funds
**Personas:** 30

---

## Methodology

### Simulation A — No fund < 1 year old can rank in Top 3
Funds younger than 1 year are skipped for positions 1-3. The next eligible fund in the original order moves up. All other positions follow the original diversified order.

### Simulation B — No fund < 2 years old can rank in Top 3
Same as A but threshold is 2 years.

### Simulation C — Confidence as tiebreaker (score diff < 5%)
Adjacent funds in the ranking with scores within 5% of each other are reordered so the higher-confidence fund ranks first. This is a local bubble-sort, not a global re-sort.

---

## Results Summary

| Metric | Current | A | ΔA | B | ΔB | C | ΔC |
|---|---|---|---|---|---|---|---|
| Missing-metric Top 3 | 28 | 28 | 0 | 27 | -1 | 28 | 0 |
| Missing-metric Top 10 | 58 | 58 | 0 | 58 | 0 | 58 | 0 |
| Young fund instances in Top 10 | 8 | 8 | 0 | 8 | 0 | 8 | 0 |
| Equity funds in Top 10 (all personas summed) | 107 | 107 | 0 | 107 | 0 | 107 | 0 |
| Debt funds in Top 10 | 89 | 89 | 0 | 89 | 0 | 89 | 0 |
| Hybrid funds in Top 10 | 47 | 47 | 0 | 47 | 0 | 47 | 0 |
| Personas with Top 3 changes | — | 0 | — | 2 | — | 0 | — |

---

## Per-Persona Changes

### Simulation A — Top 3 Changes: 0 / 30
No fund under 1 year old currently ranks in Top 3 for any persona. Zero impact.

### Simulation B — Top 3 Changes: 2 / 30

**Persona 9 (Aggressive Retirement Accumulator):**
- Pos 2: ~~Helios Mid Cap Fund (EQ-MC, 1.3y)~~ → Aditya Birla Sun Life Arbitrage Fund (HY-AR, 9.5y)

**Persona 26 (New Parent Education Fund):**
- Pos 2: ~~Bandhan Nifty Midcap 150 Index Fund (EQ-MC, 1.7y)~~ → Invesco India Arbitrage Fund (HY-AR, 8.7y)

### Simulation C — Top 3 Changes: 0 / 30
No adjacent fund pair in any persona has a score difference < 5% where the lower-confidence fund ranks higher.

---

## Root Cause Analysis

### Age breakdown of the 28 missing-metric Top 3 instances

Only 2 of 28 instances involve funds under 2 years old:

| Fund | Age | Nulls | Appearances in Top 3 |
|---|---|---|---|
| HSBC Multi Cap Fund | 3.4y | 3 | 8 |
| Tata Multicap Fund | 3.4y | 3 | 4 |
| LIC MF Nifty Midcap 100 ETF | 2.3y | 4 | 3 |
| SBI Nifty50 Equal Weight Index Fund | 2.4y | 4 | 3 |
| HDFC NIFTY Midcap 150 ETF | 3.3y | 3 | 2 |
| Helios Mid Cap Fund | **1.3y** | 4 | 1 |
| Zerodha ELSS Tax Saver | 2.6y | 4 | 1 |
| NJ ELSS Tax Saver Scheme | 3.0y | 4 | 1 |
| HDFC BSE 500 ETF | 3.3y | 3 | 1 |
| UTI NIFTY50 Equal Weight Index Fund | 3.0y | 4 | 1 |
| Bandhan Nifty Midcap 150 Index Fund | **1.7y** | 4 | 1 |
| HDFC NIFTY Midcap 150 Index Fund | 3.1y | 4 | 1 |

### Age distribution of all Top 10 funds

| Age bracket | Instances in Top 10 |
|---|---|
| < 1 year | 0 |
| 1-2 years | 12 |
| 2-3 years | 12 |
| 3-5 years | 36 |
| 5+ years | 183 |

### Why each simulation fails

| Simulation | Blocks in Top 3 | Rationale |
|---|---|---|
| A: No <1yr | 0 of 28 | No fund < 1y ranks in Top 3 |
| B: No <2yr | 2 of 28 | Only Helios (1.3y) and Bandhan (1.7y) blocked; 26 remain |
| C: Tiebreaker | 0 of 28 | Score gaps between adjacent funds are >5% |

---

## Verdict: The primary root cause is #2 — Missing Critical Metrics

| Factor | Contribution to 28 Top 3 instances |
|---|---|
| 1. Young fund age | 2/28 (~7%) |
| 2. Missing critical metrics (Sharpe, CAGR, Volatility) | 26/28 (~93%) |
| 3. Equity asset class concentration | Correlated but not causal |

**The 28 missing-metric Top 3 instances are driven by funds aged 2.3–3.4 years that lack 3–4 critical data fields.** These are index ETFs and newer equity funds that haven't reported full 3-year performance metrics despite being past the "young fund" threshold. An age filter misses 93% of the problem.

The existing completeness penalty (15% per critical null) already targets the correct root cause, but it's insufficient because:
- **Filter bottleneck**: For aggressive-equity personas, very few equity funds pass the filters. The same missing-metric funds are often the only available candidates.
- **No alternatives**: Even with stronger penalties, no high-confidence equity funds exist in those filter-constrained categories.

### Recommended path

None of the 3 simulated approaches materially improves the ranking (max improvement: 28→27). The only effective options involve either:

1. **Hard cap on missing-metric fund scores** (e.g., max score = 30 for 3+ nulls) — prevents them from outranking complete funds
2. **Stronger completeness penalty** (e.g., 25% per critical null) — further reduces their scores
3. **Relax category filters for aggressive-equity personas** — increases the supply of eligible equity funds

Option 1 (hard cap) is the simplest and most transparent: a fund missing 3+ critical data points cannot be a top recommendation, regardless of how narrow the filter is.
