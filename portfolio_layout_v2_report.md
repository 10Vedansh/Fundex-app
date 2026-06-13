# Portfolio Page Layout v2 Report

## Overview
Restructured the Portfolio tab to show Holdings first, then CIFRAA intelligence, then analytics/review/comparison.

## New Render Order

```
Portfolio Tab
│
├── [if no data] Action card: Upload CAMS / Add Fund
│
├── 1. Holdings Overview
│   ├── (CAMS) Health-o-Meter + Summary Cards (Total Investment, Current Value, Profit/Loss, Return %)
│   ├── (CAMS) Holdings List (CAMSUpload — fund cards with expand/collapse)
│   ├── (Manual) Portfolio Summary Cards (Total Invested, Monthly SIP, Fund Count)
│   └── (Manual) Your Investments (fund cards with insights)
│
├── 2. CIFRAA Portfolio Intelligence Hero (NEW)
│   ├── Health Score (from PortfolioReview engine)
│   ├── Improvement Score (from PortfolioComparison engine)
│   ├── Current Return → Recommended Return
│   ├── Current Diversification → Recommended Diversification
│   ├── Top 3 Portfolio Issues
│   ├── Top 3 Recommended Actions
│   └── CTA: "View Recommended Portfolio" (scrolls to comparison section)
│
├── 3. Portfolio Analytics
│   ├── Asset Allocation (donut chart)
│   ├── AMC Concentration (bar chart)
│   ├── Risk Distribution (3 cards)
│   └── Diversification Score (ring gauge)
│
├── 4. AI Portfolio Review
│   ├── Health Score
│   ├── Insights (positive/warning/negative)
│   ├── Strengths
│   ├── Risks
│   └── Summary
│
├── 5. Portfolio vs CIFRAA (id="portfolio-comparison")
│   ├── Side-by-side current vs recommended metrics
│   ├── Improvement score gauge
│   ├── Recommended allocation breakdown
│   └── Rebalancing suggestions
│
└── 6. Disclaimer
```

## Files Changed

| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Added `PortfolioIntelligenceHero` import; restructured portfolio tab to new order; wrapped PortfolioComparison in `<div id="portfolio-comparison">` for scroll target |
| `src/components/dashboard/PortfolioIntelligenceHero.tsx` | **NEW** — Intelligence dashboard component that calls `runPortfolioReview` and `comparePortfolios` internally, renders health/improvement scores, return/diversification comparison, top issues, top actions, and a CTA button |

## Component Architecture (No Duplication)

```
Index.tsx
│
├── PortfolioIntelligenceHero (calls engines internally, renders once)
├── PortfolioAnalytics (renders once)
├── PortfolioReview (calls engine internally, renders once)
├── PortfolioComparison (calls engine internally, renders once)
│
CAMSUpload.tsx (reduced to: header + holdings list + CAMS disclaimer)
```

Each section renders exactly once. No component duplication.

## Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Zero errors |
| `npm run build` | Succeeded (20.20s) |
| CAMS upload flow | Unchanged (persistence, save, fetch all preserved) |
| Manual portfolio | Unchanged (add, remove, insights all preserved) |
| Responsive layout | Same grid classes, same glass-card pattern |
