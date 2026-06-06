// Shared FAQ data for both Landing page and Dashboard FAQModal
export interface FAQItem {
  q: string;
  a: string;
}

export const faqs: FAQItem[] = [
  { 
    q: 'What is CIFRAA?', 
    a: `CIFRAA (Comprehensive Intelligent Fund Research, Analysis & Advisory) is a full-featured educational platform designed to help investors navigate the complex world of mutual funds in India.

Unlike generic screeners that simply list funds, CIFRAA combines advanced data analytics with a personalized recommendation engine to surface funds that align with your unique financial profile.

The platform ingests data from a curated master workbook covering 2,200+ funds across Equity, Debt, Hybrid, and Commodity categories. It enriches this data daily with live NAVs from AMFI and performance records from MFAPI.

Key capabilities include:
• Personalized fund suggestions based on your risk appetite, goals, horizon, and experience
• Interactive fund comparison with sector allocation charts
• Portfolio tracking with educational insights on each holding
• A built-in SIP & Lump Sum calculator to project future returns
• Real-time financial news aggregated from trusted Indian sources

CIFRAA is built by investors, for investors — with the goal of making informed decision-making accessible to everyone, from first-time SIP starters to seasoned portfolio managers.` 
  },
  { 
    q: 'Is CIFRAA free to use?', 
    a: `Yes, CIFRAA is completely free to use with no hidden charges.

All core features are available at no cost, including:
• Full access to 2,200+ fund data points including NAV, CAGR, Sharpe ratio, beta, standard deviation, and more
• Personalized fund discovery based on your onboarding questionnaire
• Fund comparison tools with side-by-side sector allocation analysis
• Watchlist functionality to track funds you're interested in
• Portfolio tracker to monitor your existing investments
• SIP and Lump Sum calculators with projected growth charts
• Real-time financial news feed
• Detailed fund analysis modals with risk metrics and investor suitability guidance

We believe financial education should be accessible to all. CIFRAA does not charge any commission, transaction fee, or subscription fee. We do not facilitate actual transactions — we are purely an analysis and educational platform.`
  },
  { 
    q: 'Does CIFRAA provide investment advice?', 
    a: `No, CIFRAA does not provide investment advice, recommendations, or portfolio management services. This is an important distinction.

What CIFRAA does:
• Provides educational analysis of publicly available mutual fund data
• Surfaces funds that match your stated preferences and financial profile
• Offers objective metrics like Sharpe ratio, standard deviation, beta, alpha, and CAGR for informed comparison
• Generates educational insights such as "Why You Should Invest" and "Why You Should Avoid" based on fund characteristics

What CIFRAA does NOT do:
• Tell you to buy, sell, or hold any specific fund
• Guarantee any returns or performance outcomes
• Act as a registered investment advisor (RIA) or distributor
• Execute transactions on your behalf

CIFRAA is registered as an educational platform and not as a SEBI-registered investment advisor. All data and analysis provided is for informational and educational purposes only. Users are strongly encouraged to consult a certified financial advisor before making any investment decisions. Mutual fund investments are subject to market risks — please read all scheme-related documents carefully.`
  },
  { 
    q: 'How does personalization work?', 
    a: `CIFRAA's personalization engine is built on a multi-layered scoring and filtering system that processes your inputs through several stages:

Step 1 — Onboarding Questionnaire:
When you first sign up, you answer five key questions about your:
• Risk tolerance (Conservative, Moderate, or Aggressive)
• Investment goal (Wealth Creation, Regular Income, Tax Saving, or Capital Preservation)
• Investment horizon (Short-term < 3 years, Medium 3–5 years, or Long-term 5+ years)
• Experience level (Beginner, Intermediate, or Advanced)
• Investment amount range

Step 2 — Preference Matching:
Based on your answers, the system applies eligibility filters. For example, conservative investors won't see small-cap or thematic funds, while beginners are shielded from niche sectoral funds.

Step 3 — Scoring Engine:
Each eligible fund is scored using a composite formula that weighs returns (adjusted by your horizon), risk-adjusted metrics (Sharpe, Sortino, Standard Deviation, Beta), category alignment, and expense efficiency. Aggressive profiles get higher weight on returns and volatility bonuses, while conservative profiles heavily penalize volatility and reward stability.

Step 4 — Diversified Allocation:
The system doesn't just pick the 8 highest-scored funds. It uses an allocation model specific to your risk profile. Conservative investors get a mix of Large Cap, Debt, Hybrid, and Dividend funds. Aggressive investors get Small Cap, Mid Cap, Sectoral, and Flexi Cap funds. This ensures genuine diversification.

Step 5 — Quality Controls:
Duplicate exposure detection (e.g., two Nifty 50 trackers), thematic overload prevention (e.g., multiple PSU-focused funds), and AMC diversification limits ensure you get a well-rounded selection.

You can update your preferences anytime from the Profile → Preferences menu, and your recommendations will immediately refresh.`
  },
  { 
    q: 'Where does the data come from?', 
    a: `CIFRAA's data pipeline combines three authoritative sources to deliver comprehensive and up-to-date mutual fund information:

1. Master Workbook (Primary Source):
A curated Excel workbook containing 2,200+ Direct Plan mutual fund schemes across Equity, Debt, Hybrid, and Commodity asset classes. This workbook includes:
• Fund names, categories (using workbook codes like EQ-LC, DT-CB, HY-DAA, etc.)
• Performance returns (1-week to 10-year)
• Risk metrics: Standard Deviation, Sharpe Ratio, Sortino Ratio, Beta, Alpha, R-Squared
• AUM (Net Assets), Expense Ratio, Turnover Ratio
• Fund Manager details, 52-week High/Low, Market Cap
• The data is processed through a dedicated edge function that maps and enriches each fund record

2. AMFI (Association of Mutual Funds in India):
Daily NAV data is fetched from AMFI's official NAV feed (amfiindia.com). This ensures that the NAV displayed on CIFRAA reflects the latest closing price. Previous NAV is preserved for daily change calculations.

3. MFAPI (Mutual Fund API):
Used as a supplementary source to fill gaps in historical performance data, particularly for newer funds that may not have complete 3-year or 5-year return records in the workbook.

Data Freshness:
• NAV data refreshes daily after market close (post 9:30 PM IST)
• Workbook metrics are updated periodically with the latest scheme information
• A multi-tier caching system (local storage → database cache → live API) ensures fast load times while maintaining data accuracy

All data sources are publicly available and verifiable. CIFRAA does not use any proprietary or insider data.`
  },
  { 
    q: 'Is my data secure?', 
    a: `Yes, data security is a top priority at CIFRAA. Here's how we protect your information:

Authentication & Access:
• User authentication is handled through industry-standard protocols with email verification
• Passwords are hashed and never stored in plain text
• Session management uses secure, time-limited tokens

Data Storage:
• All user data (profile, watchlist, portfolio) is stored in a secured cloud database with row-level security (RLS) policies
• RLS ensures that you can only access your own data — no user can view, modify, or delete another user's information
• Database queries are parameterized to prevent SQL injection

Privacy:
• We do not sell, share, or distribute your personal information to any third party
• Your investment preferences and portfolio data are used exclusively to provide personalized analysis within the platform
• We do not track your browsing activity outside of CIFRAA
• No advertising or third-party analytics trackers are embedded in the application

Infrastructure:
• The platform runs on enterprise-grade cloud infrastructure with encryption at rest and in transit
• API communications use HTTPS with TLS encryption
• Edge functions processing sensitive operations run in isolated, secure environments

You can delete your account and all associated data at any time through the platform settings.`
  },
  {
    q: 'How do I add funds to my portfolio?',
    a: `Adding funds to your portfolio in CIFRAA is straightforward. Here's the step-by-step process:

Method 1 — From Search:
1. Use the global search bar at the top of the dashboard
2. Type the fund name or AMC (e.g., "HDFC Flexi Cap" or "SBI")
3. Click on the fund from the search results to open its detail modal
4. Click the "Add to Portfolio" button at the top of the modal
5. Enter your investment details: invested amount, SIP amount (if applicable), and whether it's a SIP investment
6. Click "Add" to save

Method 2 — From Fund Cards:
1. Browse funds in the Overview, All Funds, or Watchlist tabs
2. Click any fund card to open its detail view
3. Click "Add to Portfolio" from the detail modal

Method 3 — From All Funds Tab:
1. Navigate to the "All Funds" tab
2. Browse through asset classes and sub-categories
3. Click on any fund in the table to open its details
4. Add to portfolio from the detail modal

Portfolio Features:
• Track total invested amount and monthly SIP commitments
• View educational insights for each holding (Continue, Review, or Reduce signals based on performance)
• Click any portfolio holding to see full fund analysis
• Remove holdings anytime with the delete button

Important: CIFRAA does not execute actual transactions. The portfolio tracker is an educational tool for monitoring and analyzing your existing investments. To actually buy or redeem mutual fund units, use your broker, AMC platform, or registered investment platform.`
  },
  {
    q: 'Can I compare multiple funds?',
    a: `Yes! CIFRAA provides a powerful side-by-side fund comparison tool in the "Sectors" tab. Here's how to use it:

How to Compare:
1. Navigate to the "Sectors" tab from the sidebar or mobile navigation
2. You'll see two search dropdowns — "Fund A" and "Fund B"
3. Search for any fund by name or AMC in each dropdown
4. Select the funds you want to compare

What You Can Compare:
• Sector Allocation: Interactive donut charts showing how each fund allocates across sectors (Financial Services, IT, Healthcare, etc.)
• Key Metrics Side-by-Side:
  - NAV, AUM, Expense Ratio
  - 1-Year, 3-Year, 5-Year CAGR
  - Sharpe Ratio, Sortino Ratio, Beta, Alpha
  - Standard Deviation (volatility measure)
  - 52-Week High and Low
  - Fund Manager and Launch Date

Visual Comparison:
The comparison card uses color-coded indicators to highlight which fund performs better on each metric. Green highlights indicate the better value, making it easy to quickly identify relative strengths and weaknesses.

Tips for Effective Comparison:
• Compare funds within the same category (e.g., two Large Cap funds) for meaningful insights
• Pay attention to risk-adjusted returns (Sharpe Ratio) rather than just raw returns
• Consider the fund's expense ratio — even small differences compound significantly over time
• Look at consistency across time periods (1Y, 3Y, 5Y) rather than just recent performance

You can change the comparison funds at any time by searching for different funds in either dropdown.`
  },
];
