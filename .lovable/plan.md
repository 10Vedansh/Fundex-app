# Reverse-Engineering Document: Mutual Fund Recommendation Model

Goal: produce a rigorous, code-grounded technical specification of the recommendation methodology implemented in this codebase, suitable as the source material for the paper "Recommendation Model for Mutual Funds". No paper prose yet — documentation only.

## Deliverable

A single markdown document, `docs/recommendation-model-spec.md`, written in academic register with LaTeX equations and pseudocode. Every factual claim will carry a `file:line` citation into the repository. Anything not establishable from the code will be marked explicitly as "Not determinable from the current implementation."

## Document structure

1. Problem formulation — investor, item set, objective; formal statement as constrained personalized ranking over a fund universe, and why it is not return-sorting.
2. Model inputs — three verified tables (investor-level, fund-level, portfolio-level), each row: feature, definition, computation, source field/pipeline stage, role. Features present in the type definitions but never consumed by scoring will be listed separately as unused.
3. Feature engineering — missing-value semantics (`--`/null treated as NA with category-median imputation), min–max normalization, category-relative z-scoring, consistency and Sortino/drawdown approximations, credit-quality penalties.
4. Personalization mechanism — how the five onboarding preferences plus the extended financial profile map to hard constraints, the risk-capacity aggregation, and the `min(selected, capacity)` downgrade rule.
5. Core algorithm — the full pipeline: exclusion, five hard-constraint filters, cascading fallback relaxation, V3 scoring, sort, allocation-bucket diversification with AMC and category caps, top-N truncation.
6. Mathematical model — every normalization, sub-score, weight, multiplier and threshold transcribed verbatim from the implementation into LaTeX, including the composite score and all multiplicative penalty terms.
7. Pseudocode — two algorithm blocks: recommendation ranking, and the separate strategy/portfolio-construction engine.
8. Design rationale and per-metric critique.
9. Recommender-system taxonomy placement, argued from the implementation.
10. Portfolio-awareness audit — whether holdings feed back into scoring, and the separate allocation engine's treatment of concentration/overlap.
11. Dynamics — data refresh path (OneDrive → cache table → client hook) and whether recomputation is on-read, scheduled, or absent.
12. Strict ML audit — training data, fitted parameters, validation, inference; explicit verdict, and what would be required for a genuine learned model.
13–16. Evaluation framework, experimental design, baselines, ablations — all designed, none fabricated, clearly flagged as proposed.
17. Explainability — existing reason-string generation vs. a proposed contribution-decomposition framework.
18. Limitations and biases — only those the code actually exhibits.
19. Future ML evolution — candidate approaches with required data, labels, features, evaluation.
20. Defensible research contributions, separated from overclaims.
21. Condensed "Recommendation Model Technical Specification" appendix.

## Technical scope of the analysis

Source files to be transcribed and cited exhaustively:

- `src/utils/recommendation/categoryMappings.ts` — risk/goal/horizon/experience/amount constraint tables, sectoral list, exclusion list, allocation models
- `src/utils/recommendation/scoringEngineV3.ts` — normalization stats, category medians, weighted composite, penalties, badges
- `src/utils/recommendation/intersectionEngine.ts` — filter cascade, fallback, diversification
- `src/utils/recommendation/riskCapacity.ts` — capacity scoring and risk downgrade
- `src/utils/recommendation/preferenceValidator.ts` — preference conflict rules
- `src/utils/recommendation/portfolioConstruction.ts`, `strategyPortfolioEngine.ts` — allocation and portfolio-level logic
- `src/utils/recommendationEngine.ts` — the legacy/alternate scoring path (will be documented as a distinct variant and its call sites identified)
- `src/types/mutualFund.ts` — the full fund feature schema
- `src/hooks/useFundCache.tsx`, `src/hooks/usePortfolio.tsx`, `src/pages/Index.tsx`, `src/pages/Onboarding.tsx` — input collection and recomputation triggers
- `supabase/functions/sync-onedrive`, `fetch-fund-data`, `load-funds-json` — the data pipeline and update cadence

## Ground rules applied

No invented formulas, features, weights, metrics or results. Implemented methodology and proposed methodology kept in visually distinct sections. Deterministic scoring will not be described as machine learning. Weaknesses stated plainly.

## Not included

No changes to application code, UI, or behaviour. This task only adds one documentation file.
