# Confidence Data Flow — Trace Report

**Date:** 2026-06-12

## Flow Summary

```
computeConfidence()                    → confidenceLevel present: YES
                                       → confidenceReason present: YES
↓
ScoredFund type/interface              → confidenceLevel present: YES
(intersectionEngine.ts:41-42)          → confidenceReason present: YES
↓
recommendFundsV2()                     → confidenceLevel present: YES
(sets on each ScoredFund, line 557)    → confidenceReason present: YES
↓
intersectionEngine.ts (export)          → confidenceLevel present: YES
(returns ScoredFund[])                  → confidenceReason present: YES
↓
Index.tsx (import)                      → confidenceLevel present: YES
(passes fund to FundCard)               → confidenceReason present: YES
↓
FundCard.tsx (type + render)           → confidenceLevel present: YES (after fix)
(displays badge + reason)               → confidenceReason present: YES (after fix)
```

## Layer-by-Layer Verification

### Layer 1: computeConfidence() — intersectionEngine.ts:52-81

| Field | Present? | Detail |
|---|---|---|
| `confidenceLevel` | **YES** | Returns `{ level: 'high' \| 'medium' \| 'limited_history', reason: string }` |
| `confidenceReason` | **YES** | Returns contextual reason string based on age + missing metrics |

### Layer 2: ScoredFund interface — intersectionEngine.ts:35-46

| Field | Present? | Detail |
|---|---|---|
| `confidenceLevel` | **YES** | `confidenceLevel?: ConfidenceLevel` (line 41) |
| `confidenceReason` | **YES** | `confidenceReason?: string` (line 42) |

### Layer 3: recommendFundsV2() — intersectionEngine.ts:539-565

| Field | Present? | Detail |
|---|---|---|
| `confidenceLevel` | **YES** | Set line 557: `confidenceLevel: confidence.level` |
| `confidenceReason` | **YES** | Set line 558: `confidenceReason: confidence.reason` |

### Layer 4: Index.tsx — src/pages/Index.tsx:377

| Field | Present? | Detail |
|---|---|---|
| `confidenceLevel` | **YES** | Passed as part of `fund` object to `FundCard` |
| `confidenceReason` | **YES** | Passed as part of `fund` object to `FundCard` |

### Layer 5: FundCard type — src/components/dashboard/FundCard.tsx:8-19

| Field | Present? | Detail |
|---|---|---|
| `confidenceLevel` | **YES** | Added: `confidenceLevel?: 'high' \| 'medium' \| 'limited_history'` (line 13) |
| `confidenceReason` | **YES** | Added: `confidenceReason?: string` (line 14) |

### Layer 6: FundCard render — src/components/dashboard/FundCard.tsx (UI)

| Field | Present? | Detail |
|---|---|---|
| `confidenceLevel` | **YES** | Badge rendered at line 119-123: shows "High Confidence" / "Medium Confidence" / "Limited History" |
| `confidenceReason` | **YES** | Listed in "Why this fund?" section at lines 207-215 |

## Data Flow Gaps (Before Fix)

| Layer | Gap | Fix Applied |
|---|---|---|
| FundCard type | `confidenceLevel` and `confidenceReason` not in type interface | Added to `FundCardProps` type |
| FundCard badge | No confidence badge rendered | Added colored badge next to risk label |
| FundCard "Why this fund?" | No confidence reason shown | Added as bullet point with contextual color |

## Summary

Confidence data flows end-to-end without loss. All gaps were in the UI rendering layer only, which have now been addressed. The data is computed server-side (in-browser via intersectionEngine.ts), flows through Index.tsx to FundCard.tsx, and is now displayed as:

1. **Colored confidence badge** (below fund name, next to risk label)
2. **Confidence reason** (in the "Why this fund?" section with contextual coloring)
