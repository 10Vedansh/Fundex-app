---

## Analysis

### Does expanding the candidate pool solve the Top 3 quality issue?

**No. The data shows the opposite: the problem is scoring, not pool size.**

| Eligible Pool | Personas | Missing-metric Top 3 | Rate |
|---|---|---|---|
| < 5 eligible funds | 1 | 1/1 | **100%** |
| 5-10 eligible funds | 0 | 0/0 | **N/A%** |
| > 10 eligible funds | 29 | 10/29 | **34%** |

**Key finding:** 10 of the 11 personas with missing-metric Top 3 have **>10 eligible candidates**. Early Career Retirement has 766 eligible funds yet still has missing-metric funds in its Top 3. The pool size is not the constraint.

**Why missing-metric funds outrank alternatives:** The offenders (HSBC Multi Cap at 3.4y/3 nulls, Tata Multicap at 3.4y/3 nulls, HDFC NIFTY Midcap 150 ETF at 3.3y/3 nulls) have high 3Y CAGR returns that are amplified by global normalization. Their scores (24-36) exceed complete-data equity alternatives (typically 10-20). The current 15% completeness penalty is insufficient to overcome their return advantage.

### Who gets hit hardest?

| Persona | Eligible | Missing Top 3? | Primary constraint |
|---|---|---|---|
| Early Career Retirement | 766 | ❌ | Missing-data funds outscore complete ones |
| Mid-Career Retirement Builder | 400 | ❌ | Same |
| Aggressive Retirement Accumulator | 331 | ❌ | Same |
| Balanced Retirement Planner | 495 | ❌ | Same |
| Mid-Income Tax Optimizer | 2 | ❌ | Tax_saving goal → only 2 ELSS funds pass moderate risk filters |
| Moderate Wealth Seeker | 56 | ❌ | Missing-data funds outrank complete ones |
| Conservative Growth | 154 | ❌ | Same |
| New Parent Education Fund | 430 | ❌ | Same |
| Mid-Term Education Planner | 167 | ❌ | Same |
| Aggressive Education Accumulator | 237 | ❌ | Same |
| Balanced Education Planner | 167 | ❌ | Same |

### The real bottleneck mechanism

1. **Goal filters are not the problem** — `wealth_creation`/`retirement`/`child_education` pass most equity funds (430-1081 after goal filtering)
2. **Risk filters are not the problem** — aggressive has no restrictions, moderate blocks some equity but 855+ remain
3. **Amount filters do some narrowing** (137 avg drop) but still leave 300+ candidates
4. **The actual problem: score competition** — missing-metric funds score ~24-36 due to strong CAGR; complete equity funds score ~10-20 due to lower returns. The 15% penalty cuts missing-metric scores to ~20-30, which still beats 10-20.

### Is the candidate pool issue worth fixing?

**No.** Expanding the pool would not help. Even with 766 candidates, the scoring system still picks missing-metric funds for Top 3. The solution must address scoring directly.

### Recommendation

Since the candidate pool is not the root cause, focus on scoring:

1. **Hard cap on missing-metric fund scores** (e.g., max score = 30 for 3+ nulls) — prevents them from ranking above complete funds
2. **Stronger completeness penalty** (e.g., 25% per critical null) — further reduces scores
3. **Both** — hard cap as hard stop, penalty as gradual reduction
