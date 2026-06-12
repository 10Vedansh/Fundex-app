# Confidence-Aware Ranking Simulation Report

**Date:** 2026-06-12
**Recommendations Analyzed:** 243
**Personas:** 30

---

## 1. Current Confidence Distribution

| Confidence Level | Appearances | % of Total |
|---|---|---:|---:|
| high | 183 | 75.3% |
| limited_history | 58 | 23.9% |
| medium | 2 | 0.8% |

---

## 2. Multiplier Applied

| Confidence Level | Multiplier | Effect |
|---|---|---|
| High | 1.00 | Unchanged |
| Medium | 0.90 | 10% score reduction |
| Limited History | 0.75 | 25% score reduction |

---

## 3. Results Comparison

| Metric | Current Production | Simulated (w/ Confidence) | Δ |
|---|---|---|---|
| Total recommendations | 243 | 243 | 0 |
| Unique funds recommended | 73 | 73 | 0 |
| Missing-metric funds in Top 3 | 28 | 8 | -20 |
| Missing-metric funds in Top 10 | 58 | 58 | 0 |
| Young fund instances in Top 10 | 8 | 8 | 0 |
| Funds appearing in 6+ personas | 12 | 12 | 0 |
| Overlap instances (6+ persona slots) | 105 | 105 | 0 |

---

## 4. Top 3 Missing-Metric Funds Detail

### Current Production (28 instances)
| Fund | Appearances |
|---|---|
| HSBC Multi Cap Fund - Direct Plan | 8 |
| Tata Multicap Fund - Direct Plan | 5 |
| LIC MF Nifty Midcap 100 ETF | 3 |
| SBI Nifty50 Equal Weight Index Fund - Direct Plan | 3 |
| HDFC NIFTY Midcap 150 ETF | 2 |
| Helios Mid Cap Fund - Direct Plan | 1 |
| Zerodha ELSS Tax Saver Nifty Large Midcap 250 Index Fund - Direct Plan | 1 |
| NJ ELSS Tax Saver Scheme - Direct Plan | 1 |
| HDFC BSE 500 ETF | 1 |
| UTI NIFTY50 Equal Weight Index Fund - Direct Plan | 1 |
| Bandhan Nifty Midcap 150 Index Fund - Direct Plan | 1 |
| HDFC NIFTY Midcap 150 Index Fund - Direct Plan | 1 |

### Simulated (8 instances)
| Fund | Appearances |
|---|---|
| HSBC Multi Cap Fund - Direct Plan | 2 |
| Tata Multicap Fund - Direct Plan | 2 |
| Zerodha ELSS Tax Saver Nifty Large Midcap 250 Index Fund - Direct Plan | 1 |
| NJ ELSS Tax Saver Scheme - Direct Plan | 1 |
| UTI Nifty 500 Value 50 Index Fund - Direct Plan | 1 |
| HDFC BSE 500 ETF | 1 |

---

## 5. Per-Persona Impact (Top Ranks Changed)

### Persona 6: Early Career Retirement

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | HDFC NIFTY Midcap 150 ETF (score: 24.65, conf: limited_history) | Tata Arbitrage Fund - Direct Plan (score: 64.23→64.2, conf: high) ⬆ | high |
| 2 | LIC MF Nifty Midcap 100 ETF (score: 6.62, conf: limited_history) | Nippon India Ultra Short Duration Fund - Direct Plan (score: 62.16→62.2, conf: high) ⬆ | high |
| 3 | HSBC Multi Cap Fund - Direct Plan (score: 24.4, conf: limited_history) | Tata Ultra Short Term Fund - Direct Plan (score: 57.32→57.3, conf: high) ⬆ | high |

### Persona 7: Mid-Career Retirement Builder

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | ICICI Prudential Dy--mic Asset Allocation Active FoF - Direct Plan (score: 45.01, conf: high) | Tata Arbitrage Fund - Direct Plan (score: 64.32→64.3, conf: high) ⬆ | high |
| 2 | HSBC Multi Cap Fund - Direct Plan (score: 24.08, conf: limited_history) | Nippon India Conservative Hybrid Fund - Direct Plan (score: 45.2→45.2, conf: high) ⬆ | high |
| 3 | Tata Multicap Fund - Direct Plan (score: 17.19, conf: limited_history) | ICICI Prudential Dy--mic Asset Allocation Active FoF - Direct Plan (score: 45.01→45.0, conf: high) ⬆ | high |

### Persona 9: Aggressive Retirement Accumulator

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | LIC MF Nifty Midcap 100 ETF (score: 10.03, conf: limited_history) | Tata Arbitrage Fund - Direct Plan (score: 56.66→56.7, conf: high) ⬆ | high |
| 2 | Helios Mid Cap Fund - Direct Plan (score: 6.11, conf: limited_history) | Nippon India Ultra Short Duration Fund - Direct Plan (score: 55.36→55.4, conf: high) ⬆ | high |
| 3 | HSBC Multi Cap Fund - Direct Plan (score: 25.57, conf: limited_history) | Nippon India Multi Asset Allocation Fund - Direct Plan (score: 54.81→54.8, conf: high) ⬆ | high |

### Persona 10: Balanced Retirement Planner

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | ICICI Prudential Dy--mic Asset Allocation Active FoF - Direct Plan (score: 57.25, conf: high) | Kotak Arbitrage Fund - Direct Plan (score: 65.07→65.1, conf: high) ⬆ | high |
| 2 | HSBC Multi Cap Fund - Direct Plan (score: 34.89, conf: limited_history) | ICICI Prudential Dy--mic Asset Allocation Active FoF - Direct Plan (score: 57.25→57.3, conf: high) ⬆ | high |
| 3 | Tata Multicap Fund - Direct Plan (score: 28, conf: limited_history) | Parag Parikh Conservative Hybrid Fund - Direct Plan (score: 55.57→55.6, conf: high) ⬆ | high |

### Persona 19: Moderate Wealth Seeker

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | HSBC Multi Cap Fund - Direct Plan (score: 36.2, conf: limited_history) | HSBC Multi Cap Fund - Direct Plan (score: 36.2→27.2, conf: limited_history)   | limited_history |
| 2 | Tata Multicap Fund - Direct Plan (score: 28.42, conf: limited_history) | Tata Multicap Fund - Direct Plan (score: 28.42→21.3, conf: limited_history)   | limited_history |
| 3 | SBI Nifty50 Equal Weight Index Fund - Direct Plan (score: 16.92, conf: limited_history) | UTI Nifty 500 Value 50 Index Fund - Direct Plan (score: 18.93→14.2, conf: limited_history) ⬆ | limited_history |

### Persona 20: Conservative Growth

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | HSBC Multi Cap Fund - Direct Plan (score: 36.12, conf: limited_history) | HSBC Multi Cap Fund - Direct Plan (score: 36.12→27.1, conf: limited_history)   | limited_history |
| 2 | HDFC BSE 500 ETF (score: 29.67, conf: limited_history) | HDFC BSE 500 ETF (score: 29.67→22.3, conf: limited_history)   | limited_history |
| 3 | UTI NIFTY50 Equal Weight Index Fund - Direct Plan (score: 17.88, conf: limited_history) | Tata Multicap Fund - Direct Plan (score: 28.41→21.3, conf: limited_history) ⬆ | limited_history |

### Persona 26: New Parent Education Fund

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | HDFC NIFTY Midcap 150 ETF (score: 24.22, conf: limited_history) | Tata Arbitrage Fund - Direct Plan (score: 63.89→63.9, conf: high) ⬆ | high |
| 2 | Bandhan Nifty Midcap 150 Index Fund - Direct Plan (score: 6.32, conf: limited_history) | Invesco India Arbitrage Fund - Direct Plan (score: 62.79→62.8, conf: high) ⬆ | high |
| 3 | Parag Parikh Flexi Cap Fund - Direct Plan (score: 47.51, conf: high) | Aditya Birla Sun Life Arbitrage Fund - Direct Plan (score: 61.7→61.7, conf: high) ⬆ | high |

### Persona 27: Mid-Term Education Planner

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | HSBC Multi Cap Fund - Direct Plan (score: 24.08, conf: limited_history) | Tata Arbitrage Fund - Direct Plan (score: 64.38→64.4, conf: high) ⬆ | high |
| 2 | Tata Multicap Fund - Direct Plan (score: 17.19, conf: limited_history) | ICICI Prudential Dy--mic Asset Allocation Active FoF - Direct Plan (score: 45.03→45.0, conf: high) ⬆ | high |
| 3 | SBI Nifty50 Equal Weight Index Fund - Direct Plan (score: 9.99, conf: limited_history) | ICICI Prudential Balanced Advantage Fund - Direct Plan (score: 43.56→43.6, conf: high) ⬆ | high |

### Persona 29: Aggressive Education Accumulator

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | HDFC NIFTY Midcap 150 Index Fund - Direct Plan (score: 10.75, conf: limited_history) | Tata Arbitrage Fund - Direct Plan (score: 56.17→56.2, conf: high) ⬆ | high |
| 2 | LIC MF Nifty Midcap 100 ETF (score: 9.95, conf: limited_history) | Invesco India Arbitrage Fund - Direct Plan (score: 55.76→55.8, conf: high) ⬆ | high |
| 3 | HDFC Focused Fund - Direct Plan (score: 54.42, conf: high) | Nippon India Multi Asset Allocation Fund - Direct Plan (score: 55.45→55.5, conf: high) ⬆ | high |

### Persona 30: Balanced Education Planner

| Rank | Current | Simulated | Confidence |
|---|---|---|---|
| 1 | HSBC Multi Cap Fund - Direct Plan (score: 24.08, conf: limited_history) | Tata Arbitrage Fund - Direct Plan (score: 64.38→64.4, conf: high) ⬆ | high |
| 2 | Tata Multicap Fund - Direct Plan (score: 17.19, conf: limited_history) | ICICI Prudential Dy--mic Asset Allocation Active FoF - Direct Plan (score: 45.03→45.0, conf: high) ⬆ | high |
| 3 | SBI Nifty50 Equal Weight Index Fund - Direct Plan (score: 9.99, conf: limited_history) | ICICI Prudential Balanced Advantage Fund - Direct Plan (score: 43.56→43.6, conf: high) ⬆ | high |

**Personas with Top 3 changes (where confidence was a factor):** 10 of 30

---

## 6. Analysis

### Does confidence-aware ranking outperform completeness penalty?

**Yes, but the improvement is limited for the same structural reasons.**

**What improves:**
- Missing-metric funds in Top 3: 28 → 8 (reduction)
- Missing-metric funds in Top 10: 58 → 58 (unchanged)
- Young fund instances in Top 10: 8 → 8 (unchanged)

**What stays the same:**
- Filter bottleneck: same structural constraint as completeness penalty — few funds pass filters for aggressive-equity personas, so even a 25% penalty doesn't demote limited-history funds below non-passing funds.
- 10 of 30 personas saw changes in Top 3 (33% impacted).
- Total recommendations remain 243 (all funds still recommended, just reordered).

**Key insight:** The confidence multiplier affects scores by 10-25%, while the completeness penalty already applies 15% per critical null + 5% per optional null. For a fund with 3 critical nulls, the completeness penalty is 45% reduction. But it still appears in Top 3 because it's the only fund passing filters.

Confidence-aware ranking is **complementary** to completeness penalty — they penalize different things:
- Completeness penalty → penalizes missing data fields
- Confidence multiplier → penalizes short track record regardless of data completeness

### Recommendation

**Combine both approaches:**

1. Keep the existing differentiated completeness penalty (15% critical, 5% optional).
2. Add a confidence multiplier as a **second pass** after completeness: High=1.0, Medium=0.9, Limited=0.75.
3. For even stronger effect, also add a **hard minimum score floor** for limited-history funds (cap at 50) to prevent them from dominating filter-constrained personas.

This dual approach addresses different root causes:
- Completeness handles funds with missing metrics
- Confidence handles funds with short track records
- Together they create a more robust ranking without requiring filter changes

```
Combined penalty example (3 critical nulls + limited_history):
  Base score: 100
  After completeness (3 × -15%): 100 × 0.55 = 55
  After confidence (limited × 0.75): 55 × 0.75 = 41.25
  Total effective penalty: 58.75% reduction
```
