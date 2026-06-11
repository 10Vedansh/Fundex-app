# CIFRAA Recommendation Engine — Executive Summary

**Audit Date:** 2026-06-11  
**Fund Universe:** 2011  
**Personas Tested:** 30  

## Key Metrics

| Metric | Value |
|---|---:|
| Total recommendations generated | 248 |
| Avg recommendations per persona | 8.3 |
| Unique funds recommended | 74 |
| Personas with 0 results | 0 |
| High-match recommendations | 80 |
| Medium-match recommendations | 127 |
| Low-match recommendations | 41 |

## Top 5 Most Recommended Funds

| Fund | Appearances | Avg Score |
|---|---:|---:|
| Nippon India Ultra Short Duration Fund - Direct Plan | 13 | 77.8 |
| Tata Arbitrage Fund - Direct Plan | 13 | 72.2 |
| Union Liquid Fund - Direct Plan | 12 | 80.2 |
| ICICI Prudential Corporate Bond Fund - Direct Plan | 11 | 63.6 |
| Kotak Floating Rate Fund - Direct Plan | 10 | 73.2 |

## Asset Class Distribution

| Asset Class | Count | Percentage |
|---|---:|---:|
| Equity | 105 | 42.3% |
| Debt | 94 | 37.9% |
| Hybrid | 49 | 19.8% |

## Flagged Issues

1. **Overlap:** 12 funds appear in 6+ personas.
2. **Young funds:** 15 instances of funds < 18 months old in top 10.
3. **Missing metrics:** 28 funds with null fields in top 3 ranks.
4. **Concentration:** Top category "HY-AR" has 4.7% share.

## Top 10 Improvement Opportunities

1. Introduce a "novelty bonus" or per-persona diversity constraint to reduce fund overlap across unrelated profiles (12 funds appear in 6+ personas).
2. Add a launch-date recency penalty (e.g., multiply score by 0.85 for funds < 2 years old) to prevent young funds from ranking too highly.
3. Strengthen the completeness penalty: current 5%/null may be insufficient. Consider 10%/null or a hard floor that prevents funds with 3+ nulls from scoring above 50.
4. Investigate why 27 personas received fewer than 10 recommendations. This may indicate overly restrictive goal/risk filters for certain combinations.
5. Goal "tax_saving" received unexpected categories: DT-CB, DT-Floater, EQ-LC, HY-CH, DT-LIQ. Check if fallback is bypassing goal eligibility filters.
6. Evaluate adding a "fund age" stability bonus for funds with 5+ year track record (reduces recency bias).
7. Consider goal-specific CAGR targets instead of global normalization — global normalization may over-weight funds in high-return periods (e.g., gold/silver spikes).
8. Add a Category Diversity Score that rewards multi-category portfolios (complements the existing AMC concentration cap).
9. Review the minimum Sharpe filter for passive_income goal (currently 1.5) — this may exclude many valid debt funds.
10. Explore an "information ratio" or "alpha consistency" component to reward funds that consistently beat their benchmark.

## Report Files

- Full report: `src/audit/output/audit_report.md`
- Raw data: `src/audit/output/persona_recommendations.csv`
- This summary: `src/audit/output/executive_summary.md`
