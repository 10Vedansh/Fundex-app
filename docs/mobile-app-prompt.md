# 📱 CIFRAA Mobile App — Full Development Prompt

## Brand Identity
- **App Name**: CIFRAA
- **App ID**: `app.lovable.c1088b3c7e854d008c71fc11fd122f6c`
- **Domain**: cifraa.in / cifraa.lovable.app
- **Tagline**: "Transform complex mutual fund data into actionable clarity."
- **Logo**: Horizontal logo combining a money bag icon with 'Sacramento' cursive font. The logo is an image asset (`CIFRAA-Logo.png`), not text — always render as an image.
- **Founded by**: 3 CSE Engineers — Shivansh Tewari (CMO), Dhruv Dalal (CEO), Vedansh Taparia (CTO)

---

## Design System (MUST match exactly)

### Color Palette (HSL — Dark theme only, no light mode)
```
Background:        222 47% 11%    (#0f172a-ish deep navy)
Foreground:        210 40% 98%    (near white)
Card:              222 47% 14%    (slightly lighter navy)
Primary:           217 91% 60%    (vivid blue #3b82f6)
Primary Foreground:222 47% 11%    (dark on blue)
Secondary:         217 33% 17%    (muted dark blue)
Muted:             217 33% 17%
Muted Foreground:  215 20% 65%   (gray text)
Accent:            217 33% 20%
Destructive:       0 84% 60%     (red)
Success:           142 71% 45%   (green)
Warning:           38 92% 50%    (amber/orange)
Border:            217 33% 22%
```

### Chart Colors
```
Equity:  217 91% 60%  (blue)
Debt:    142 71% 45%  (green)
Hybrid:  38 92% 50%   (amber)
Index:   265 83% 67%  (purple)
Liquid:  173 80% 40%  (teal)
```

### Typography
- **Font Family**: Inter (primary), system-ui fallback
- **Headings**: Bold, tight tracking (`tracking-tight`)
- **Body**: Regular weight, `text-muted-foreground` for secondary text
- **Data values**: Bold, large (`text-xl font-bold`)

### Visual Effects
- **Glass cards**: `bg-card/80 backdrop-blur-sm border border-border/50`
- **Glow effects**: `box-shadow: 0 0 20px hsl(primary / 0.3)`
- **Gradient**: `linear-gradient(135deg, hsl(217 91% 60%), hsl(265 83% 67%))`
- **Hover lift**: `-translate-y-1` with glow shadow on hover
- **Border radius**: 0.75rem (12px) base
- **Scrollbar**: Thin, primary-colored thumb on secondary track

### Auth Card Styling
```css
bg-card/90 backdrop-blur-md border border-border/30 rounded-2xl
box-shadow: 0 0 0 1px hsla(217,91%,60%,0.05), 0 4px 24px -4px hsla(222,47%,5%,0.5), 0 0 80px -20px hsla(217,91%,60%,0.15)
```

---

## Supabase Backend Configuration
- **Project ID**: `jyugiihjjmecsdqcxcsi`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dWdpaWhqam1lY3NkcWN4Y3NpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MTM4ODksImV4cCI6MjA4Mzk4OTg4OX0.pXtMXkxlGgHjtYt0km0CnNSolxrTxWWCjvVv6jMVoJ0`

### Database Tables
1. **profiles**: `user_id, full_name, email, avatar_url, risk_tolerance, investment_goal, investment_horizon, experience_level, investment_amount, occupation, income_stability, monthly_emis, dependents, has_insurance, existing_investments, onboarding_completed, pin_hash, pin_salt, pin_set, risk_capacity_score`
2. **watchlist**: `user_id, fund_id, fund_name, fund_category`
3. **portfolio**: `user_id, fund_id, fund_name, fund_category, invested_amount, units, purchase_nav, is_sip, sip_amount, notes`
4. **fund_cache**: `cache_key, data (JSON), expires_at`
5. **otp_records**: `phone_number, hashed_otp, expires_at, attempt_count, verified`

### Edge Functions
- `ai-chat` — Streams AI responses via Lovable AI gateway (google/gemini-3-flash-preview), system prompt: friendly Indian mutual fund advisor, short bullet points, ₹/Cr/Lakhs
- `fetch-fund-data` — Fetches mutual fund data
- `fetch-news` — Fetches financial news articles
- `generate-insights` — Generates fund insights
- `mfapi` — Proxy for MFAPI
- `parse-cams` — Parses CAMS PDF statements
- `process-workbook` — Processes Excel data
- `send-otp` / `verify-otp` — Phone OTP flow
- `set-pin` / `verify-pin` — 4-digit PIN gate

---

## App Screens & Navigation

### 1. Landing Page
- **3D animated globe background** (Three.js with React Three Fiber)
- **Navigation**: About, Features, Founders, News, FAQs + "Get Started" CTA (rounded pill button)
- **Hero**: Massive kinetic text "CIFRAA" with GSAP character-by-character reveal (rotateX animation), subtitle below
- **Stats row**: "2200+ Funds Analyzed", "25K+ Data Points", "99.9% Uptime"
- **About section**: "Data everywhere. Understanding nowhere." with numbered problem cards (01-04)
- **Features section**: 4 cards — Advanced Analytics, Smart Discovery, Portfolio Tracking, Allocation Insights (each with icon, title, description in GlowCard)
- **Trust section**: "Zero conflicts of interest" — 3 cards: Publicly sourced data, No money handling, No hidden partnerships
- **How It Works**: 4 steps — Create Account, Set Preferences, Get Recommendations, Track & Grow
- **Founders section**: Links to /founders page with preview cards
- **News section**: Links to /news page
- **FAQs**: Accordion with shared FAQ data
- **Footer**: Logo, nav links, legal modals (Terms, Privacy, Disclaimer, Refund), copyright

### 2. Auth Page (Split layout)
- **Left half** (desktop): Hero text "Dear Investor", feature highlights (Smart Recommendations, Risk-Aligned, Goal-Focused)
- **Right half**: Auth card with:
  - 3 social buttons (Google, Meta, X) — all currently **disabled** with `opacity-50`
  - "or continue with" separator
  - Tabs: Login / Sign Up
  - Login: Email/Phone toggle (phone shows "coming soon"), email+password form, forgot password
  - Sign Up: Email/Phone toggle, name+email+password form
  - Forgot Password: Dialog modal with email input, sends reset link
- **Background**: AuthBackground component with animated wave elements

### 3. Onboarding (5-step questionnaire)
- **Left half**: Progress tracker showing all 5 steps with check marks
- **Right half**: One question at a time in auth-card style
- **Questions**:
  1. Risk Tolerance: Conservative / Moderate / Aggressive
  2. Investment Goal: Wealth Creation / Regular Income / Capital Preservation / Tax Savings
  3. Investment Horizon: Short (1-3y) / Medium (3-7y) / Long (7+y)
  4. Experience Level: Beginner / Intermediate / Advanced
  5. Investment Amount: Under ₹50K / ₹50K-5L / ₹5L+
- **Smart validation**: Incompatible options are disabled with explanation (e.g., aggressive risk + capital preservation)
- **Auto-advance**: Selecting an option auto-advances to next question
- Saves to `profiles` table on completion

### 4. PIN Gate
- After auth, before dashboard access
- 4-digit PIN entry with individual digit inputs
- First-time users set PIN, returning users verify PIN
- Shake animation on wrong PIN
- PIN stored as hash+salt in profiles table

### 5. Dashboard (Main app — tabbed layout)
- **Header**: Fixed top bar with CIFRAA logo (h-20), FAQ button, Notifications popover, User avatar dropdown (My Account, Preferences, Sign Out)
- **Sidebar** (desktop, fixed left, w-24): 7 nav items vertically centered — Home, All Funds, Sectors, Watchlist, Portfolio, Build, AI. Active item has `bg-primary/15 text-primary`. Badge counts on Watchlist & Portfolio.
- **Mobile Nav**: Horizontal scrollable tab bar at top of content area

#### 5a. Home Tab (Overview)
- Greeting: "Good [morning/afternoon/evening], [FirstName]"
- Global search bar (searches by fund name or AMC)
- Grid of 9 personalized fund cards (3 cols desktop, 2 tablet, 1 mobile)
- **Fund Card design**: Glass card with bookmark button, category badge (color-coded), fund name, AMC, risk label, 4 metrics grid (3Y CAGR with trend icon, Volatility, Sharpe Ratio, Expense Ratio), bottom bar (NAV + AUM), optional "Why this fund?" section with bullet reasons

#### 5b. All Funds Tab
- Full searchable/filterable list of all 2200+ funds
- Filters by category, AMC, sorting options

#### 5c. Sectors Tab
- Two fund search dropdowns (Fund A & Fund B)
- Side-by-side sector allocation pie charts
- Fund comparison card with metrics table

#### 5d. Watchlist Tab
- Grid of bookmarked fund cards
- Empty state: Bookmark icon + "Your watchlist is empty" message

#### 5e. Portfolio Tab
- Summary cards: Total Invested, Total Funds, SIP Funds
- Portfolio holdings list with:
  - Fund name, category badge, invested amount
  - Insight indicator (continue/review/reduce) with detailed analysis text
  - Click to open PortfolioFundModal
- Add to portfolio dialog: Fund name, invested amount, SIP toggle, SIP amount
- Empty state: Wallet icon + "Your portfolio is empty"
- CAMS Upload feature (PDF parsing)

#### 5f. Build (Portfolio Builder)
- **Phase 1**: Financial profile questionnaire (Occupation, Income Stability, Monthly EMIs, Dependents, Insurance, Existing Investments)
- **Phase 2**: Strategy generation — produces 3-4 portfolios (Conservative, Balanced, Growth, Aggressive)
- Each portfolio shows:
  - Risk level indicator with color coding
  - Expected return range
  - Horizon suitability
  - Single donut pie chart (Recharts) with color-coded segments
  - Fund cards with: Fund Name, Asset Class badge, Allocation %, Amount in ₹, Justification text
  - Total allocation validation (must equal 100%)
- Risk capacity meter (1-5 gauge)
- Strategy selector cards at top

#### 5g. AI Chat (Auctus)
- Chat interface with session management
- Suggestion chips for quick queries
- Streaming responses with thinking indicator (3 bouncing dots + "Auctus is thinking...")
- Markdown rendering for responses
- New chat / chat history sidebar
- System prompt: friendly Indian MF advisor, 3-5 bullet points, simple language, ₹/Cr/Lakhs

### 6. Founders Page
- Header with logo + back button
- Badge: "The Team Behind CIFRAA"
- 3 founder cards in grid:
  - Photo with gradient overlay
  - Role badge with icon
  - Bio text
  - Skills badges
  - Social links (LinkedIn, GitHub, Mail)
- Mission statement card at bottom

### 7. News Page
- Search bar for filtering articles
- 3-column grid of news cards with:
  - Optional image
  - Source badge + date
  - Title (2-line clamp)
  - Description (3-line clamp)
  - "Read more" link
- Load More button (cycles through different news queries)

### 8. Reset Password Page
- Simple form for new password entry after clicking email reset link

### 9. 404 Not Found Page

---

## Data Models

### MutualFund Type
```typescript
{
  id: string;
  name: string;
  amc: string;
  category: string; // e.g., "EQ-LC", "DT-LIQ", "HY-BAL"
  nav: number;
  aum: number;
  expenseRatio: number;
  sharpeRatio: number;
  volatility: number;
  beta?: number;
  cagr1Y: number;
  cagr3Y: number;
  cagr5Y: number;
  ret3Y?: number;
}
```

### Category Labels (key examples)
```
EQ-LC → Large Cap, EQ-MC → Mid Cap, EQ-SC → Small Cap
EQ-FLX → Flexi Cap, EQ-MLC → Multi Cap
DT-LIQ → Liquid, DT-ST → Short Term, DT-GILT → Gilt
HY-BAL → Balanced Hybrid, HY-AGG → Aggressive Hybrid
```

---

## Key Libraries Used (use React Native equivalents)
- **UI**: shadcn/ui components (Card, Button, Badge, Dialog, Tabs, Accordion, Select, Input, etc.)
- **Charts**: Recharts (pie charts, bar charts)
- **Animation**: Framer Motion + GSAP
- **3D**: React Three Fiber + Three.js (landing page only)
- **Icons**: Lucide React
- **State**: React Query (TanStack Query)
- **Routing**: React Router DOM
- **Backend**: Supabase JS client
- **Markdown**: react-markdown
- **Toast**: Sonner

---

## Mobile-Specific Considerations
- Bottom tab navigation (matching the 7 sidebar items)
- Swipe gestures for tab switching
- Pull-to-refresh for fund data
- Native-feeling transitions between screens
- Biometric auth option (fingerprint/face) as alternative to PIN
- Push notifications for watchlist alerts
- Offline caching for fund data
- Native share for portfolio strategies

---

## Authentication Flow
1. User opens app → Landing page
2. Taps "Get Started" → Auth page (login/signup)
3. New user signs up → Email verification required → Onboarding questionnaire (5 questions)
4. Returning user logs in → PIN gate → Dashboard
5. First-time after signup: Set 4-digit PIN → Dashboard

---

Build this as a React Native (or Capacitor-wrapped) mobile app that connects to the same Supabase backend, maintaining pixel-perfect visual consistency with the dark fintech theme described above.
