# Recommendation Explainability — Audit Report

**Date:** 2026-06-12  
**Fund Universe:** 2011 funds  
**Personas Sampled:** 6 (Early Career Retirement, Mid-Career Retirement Builder, Aggressive Retirement Accumulator, Young Tax Saver, Young Wealth Builder, New Parent Education Fund)  

## Summary

| Metric | Value |
|---|---:|
| Explanation rules implemented | 12 |
| Sample recommendations analyzed | 49 |
| Unique funds represented | 35 |
| Funds with zero explanations | 0 |

## Explanation Rules

| # | Rule | Condition | Example Output |
|---|---|---|---|
| 1 | CAGR Outperformance | CAGR > category median | "3Y returns exceed category average by 5.2%" |
| 2 | CAGR Top Quartile | categoryRelativeScore > 75 | "Top-performing fund within its category" |
| 3 | Sharpe vs Peers | Sharpe > category median Sharpe | "Strong risk-adjusted performance relative to peers" |
| 4 | Low Volatility | Volatility < category median | "Lower volatility than similar funds in its category" |
| 5 | Very Low Volatility | Volatility < 5 | "Stable performance with low volatility" |
| 6 | Cost Efficiency | Expense < category median | "Cost-efficient: expense ratio is moderately/significantly below category median" |
| 7 | Large AUM | AUM > ₹5000Cr | "Large asset base reflects strong investor confidence" |
| 8 | Healthy AUM | AUM > ₹1000Cr | "Healthy asset base indicates steady investor trust" |
| 9 | Long Track Record | Age > 10 years | "Long track record of performance across market cycles" |
| 10 | Established History | Age > 5 years | "Established performance history through varying market conditions" |
| 11 | Positive Momentum | Recent periods all positive | "Consistent positive returns across recent time periods" |
| 12 | Confidence | Based on confidenceLevel | "High confidence recommendation based on complete historical data" |
| 13 | Tax Benefit | Category is EQ-ELSS | "Eligible for ₹1.5L tax deduction under Section 80C" |

## Sample Output — 20 Recommendations

### Sample 1: DSP ELSS Tax Saver Fund - Direct Plan

**Persona:** Young Tax Saver | **Rank:** #3 | **Score:** 70.1 | **Confidence:** high

**Category:** EQ-ELSS

**Explanations:**

- 3Y returns exceed category average by 4.1%
- Top-performing fund within its category
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Cost-efficient: expense ratio is moderately below category median
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods
- Eligible for ₹1.5L tax deduction under Section 80C

### Sample 2: Tata Arbitrage Fund - Direct Plan

**Persona:** Early Career Retirement | **Rank:** #7 | **Score:** 64.23 | **Confidence:** high

**Category:** HY-AR

**Explanations:**

- 3Y returns exceed category average by 0.2%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Cost-efficient: expense ratio is moderately below category median
- Large asset base reflects strong investor confidence
- Established performance history through varying market conditions
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 3: Tata Arbitrage Fund - Direct Plan

**Persona:** Mid-Career Retirement Builder | **Rank:** #8 | **Score:** 64.32 | **Confidence:** high

**Category:** HY-AR

**Explanations:**

- 3Y returns exceed category average by 0.1%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Cost-efficient: expense ratio is moderately below category median
- Large asset base reflects strong investor confidence
- Established performance history through varying market conditions
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 4: Edelweiss Equity Savings Fund - Direct Plan

**Persona:** Mid-Career Retirement Builder | **Rank:** #9 | **Score:** 42.78 | **Confidence:** high

**Category:** HY-EQ S

**Explanations:**

- 3Y returns exceed category average by 0.9%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Cost-efficient: expense ratio is moderately below category median
- Healthy asset base indicates steady investor trust
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 5: Tata Arbitrage Fund - Direct Plan

**Persona:** Aggressive Retirement Accumulator | **Rank:** #7 | **Score:** 56.66 | **Confidence:** high

**Category:** HY-AR

**Explanations:**

- 3Y returns exceed category average by 0.1%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Cost-efficient: expense ratio is moderately below category median
- Large asset base reflects strong investor confidence
- Established performance history through varying market conditions
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 6: Tata Arbitrage Fund - Direct Plan

**Persona:** New Parent Education Fund | **Rank:** #7 | **Score:** 63.89 | **Confidence:** high

**Category:** HY-AR

**Explanations:**

- 3Y returns exceed category average by 0.2%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Cost-efficient: expense ratio is moderately below category median
- Large asset base reflects strong investor confidence
- Established performance history through varying market conditions
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 7: Aditya Birla Sun Life Arbitrage Fund - Direct Plan

**Persona:** New Parent Education Fund | **Rank:** #9 | **Score:** 61.7 | **Confidence:** high

**Category:** HY-AR

**Explanations:**

- 3Y returns exceed category average by 0.1%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Cost-efficient: expense ratio is moderately below category median
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 8: Nippon India Ultra Short Duration Fund - Direct Plan

**Persona:** Early Career Retirement | **Rank:** #8 | **Score:** 62.16 | **Confidence:** high

**Category:** DT-USD

**Explanations:**

- 3Y returns exceed category average by 0.3%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 9: Tata Ultra Short Term Fund - Direct Plan

**Persona:** Early Career Retirement | **Rank:** #9 | **Score:** 57.32 | **Confidence:** high

**Category:** DT-USD

**Explanations:**

- 3Y returns exceed category average by 0.1%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Healthy asset base indicates steady investor trust
- Established performance history through varying market conditions
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 10: Franklin India Corporate Debt Fund - Direct Plan

**Persona:** Mid-Career Retirement Builder | **Rank:** #7 | **Score:** 44.93 | **Confidence:** high

**Category:** DT-CB

**Explanations:**

- 3Y returns exceed category average by 0.5%
- Strong risk-adjusted performance relative to peers
- Stable performance with low volatility
- Cost-efficient: expense ratio is moderately below category median
- Healthy asset base indicates steady investor trust
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 11: Nippon India Ultra Short Duration Fund - Direct Plan

**Persona:** Aggressive Retirement Accumulator | **Rank:** #8 | **Score:** 55.36 | **Confidence:** high

**Category:** DT-USD

**Explanations:**

- 3Y returns exceed category average by 0.3%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 12: Nippon India Multi Asset Allocation Fund - Direct Plan

**Persona:** Aggressive Retirement Accumulator | **Rank:** #9 | **Score:** 54.81 | **Confidence:** high

**Category:** HY-MAA

**Explanations:**

- 3Y returns exceed category average by 2.5%
- Top-performing fund within its category
- Strong risk-adjusted performance relative to peers
- Cost-efficient: expense ratio is significantly below category median
- Large asset base reflects strong investor confidence
- Established performance history through varying market conditions
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 13: SBI ELSS Tax Saver Fund - Direct Plan

**Persona:** Young Tax Saver | **Rank:** #1 | **Score:** 74.41 | **Confidence:** high

**Category:** EQ-ELSS

**Explanations:**

- 3Y returns strongly outperform category average by 6.8%
- Top-performing fund within its category
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Eligible for ₹1.5L tax deduction under Section 80C

### Sample 14: HDFC ELSS Tax Saver Fund - Direct Plan

**Persona:** Young Tax Saver | **Rank:** #2 | **Score:** 73.48 | **Confidence:** high

**Category:** EQ-ELSS

**Explanations:**

- 3Y returns exceed category average by 4.2%
- Top-performing fund within its category
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Eligible for ₹1.5L tax deduction under Section 80C

### Sample 15: Invesco India Arbitrage Fund - Direct Plan

**Persona:** New Parent Education Fund | **Rank:** #8 | **Score:** 62.79 | **Confidence:** high

**Category:** HY-AR

**Explanations:**

- 3Y returns exceed category average by 0.2%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 16: ICICI Prudential Dy--mic Asset Allocation Active FoF - Direct Plan

**Persona:** Mid-Career Retirement Builder | **Rank:** #1 | **Score:** 45.01 | **Confidence:** high

**Category:** HY-DAA

**Explanations:**

- 3Y returns exceed category average by 0.7%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Cost-efficient: expense ratio is significantly below category median
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data

### Sample 17: HDFC Focused Fund - Direct Plan

**Persona:** Young Wealth Builder | **Rank:** #6 | **Score:** 65.27 | **Confidence:** high

**Category:** EQ-FLX

**Explanations:**

- 3Y returns exceed category average by 5.0%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 18: DSP Value Fund - Direct Plan

**Persona:** Young Wealth Builder | **Rank:** #7 | **Score:** 59.67 | **Confidence:** high

**Category:** EQ-VAL

**Explanations:**

- 3Y returns exceed category average by 0.4%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Healthy asset base indicates steady investor trust
- Established performance history through varying market conditions
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 19: ICICI Prudential Focused Equity Fund - Direct Plan

**Persona:** Young Wealth Builder | **Rank:** #9 | **Score:** 59.58 | **Confidence:** high

**Category:** EQ-FLX

**Explanations:**

- 3Y returns strongly outperform category average by 6.6%
- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Large asset base reflects strong investor confidence
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

### Sample 20: Nippon India Conservative Hybrid Fund - Direct Plan

**Persona:** Mid-Career Retirement Builder | **Rank:** #6 | **Score:** 45.2 | **Confidence:** high

**Category:** HY-CH

**Explanations:**

- Strong risk-adjusted performance relative to peers
- Lower volatility than similar funds in its category
- Stable performance with low volatility
- Long track record of performance across market cycles
- High confidence recommendation based on complete historical data
- Consistent positive returns across recent time periods

## Funds with Limited Explanations

**4 recommendations** have 0-1 explanations:

| Fund | Persona | Explanations | Confidence |
|---|---|---:|---|
| ITI Large & Mid Cap Fund - Direct Plan | Early Career Retirement | 1 | limited_history |
| Mahindra Manulife Value Fund - Direct Plan | Early Career Retirement | 1 | limited_history |
| UTI Nifty 500 Value 50 Index Fund - Direct Plan | Mid-Career Retirement Builder | 1 | limited_history |
| UTI Nifty 500 Value 50 Index Fund - Direct Plan | Aggressive Retirement Accumulator | 1 | limited_history |

**Common reasons for limited explanations:** Young funds (no CAGR, no age stats), missing Sharpe/volatility data, or funds in categories with sparse median data.

## Before/After Comparison

**Before (generic):**
- "Strong risk-adjusted returns (Sortino)"
- "Above-average absolute returns"
- "Large, well-established fund"

**After (data-driven):**
- "3Y returns exceed category average by 5.2%"
- "Strong risk-adjusted performance relative to peers"
- "Cost-efficient: expense ratio is significantly below category median"
- "High confidence recommendation based on complete historical data"

## Verification

| Check | Status |
|---|---|
| TypeScript errors | ✅ None |
| Build succeeds | ✅ Yes |
| Rankings unchanged | ✅ (explanations are cosmetic only) |
| Confidence badges visible | ✅ (unmodified) |
| Explanations generated | ✅ (all recommendations have data-driven text) |
