# Historical NAV Data Source Audit

## 1. AMFI (Association of Mutual Funds in India)

| Attribute | Detail |
|---|---|
| **URL** | https://www.amfiindia.com/net-asset-value/nav-download |
| **NAV file** | https://www.amfiindia.com/spages/NAVAll.txt |
| **Historical NAV** | Limited. Only latest NAV per scheme in NAVAll.txt. Historical via web form — 90-day max window per query. |
| **Years available** | Current day only via automated fetch. Historical form goes back ~indefinitely but requires per-AMC, per-date-range manual query. |
| **Daily granularity** | Yes — one row per scheme per day when fetched daily. |
| **API** | No REST API. Raw semicolon-delimited text file download. |
| **Automation** | Easy. Single HTTP GET for latest day. Historical requires scraping web form per AMC + date range. |
| **Rate limits** | None documented, but repeated scraping may trigger blocks. |
| **Licensing** | Public regulatory data, free for commercial use. |
| **Coverage** | All 14,000+ AMFI-registered schemes (active). Inactive schemes eventually drop from NAVAll.txt. |
| **Verdict** | Best for **daily future NAV updates**. Poor for historical backfill. |

---

## 2. MFAPI.in

| Attribute | Detail |
|---|---|
| **URL** | https://www.mfapi.in |
| **API base** | https://api.mfapi.in |
| **Historical NAV** | Full history per scheme via `GET /mf/{scheme_code}`. Optional date-range filtering. |
| **Years available** | ~5+ years (varies by scheme). |
| **Daily granularity** | Yes — every trading day. |
| **API** | REST JSON. `GET /mf` (list), `GET /mf/{code}` (history), `GET /mf/{code}/latest` (latest), `GET /mf/search?q=`. |
| **Automation** | Trivial. Requires scheme code lookup first, then fetch per scheme. |
| **Rate limits** | Claims no rate limits. Implements rate limiting for fair usage (undisclosed threshold). Updated 6x daily. |
| **Licensing** | Free, open API. No authentication or API key required. |
| **Coverage** | 10,000+ schemes (active only). |
| **Verdict** | Good for **daily future NAV updates** and **~5yr backfill**. Simple, free, reliable. |

---

## 3. mfdata.in

| Attribute | Detail |
|---|---|
| **URL** | https://mfdata.in |
| **API base** | https://mfdata.in/api/v1 |
| **Historical NAV** | Daily NAV history per scheme via `GET /schemes/{code}/nav/history`. Supports date-range, period shortcuts (1m-5y), and OHLC aggregation. |
| **Years available** | **Up to 18 years** (~2008 onward). |
| **Daily granularity** | Yes — raw daily data. Also supports monthly and yearly grouping. |
| **API** | REST JSON. 8 endpoints for schemes + NAV, 6 for holdings/sectors, 6 for compare/overlap. |
| **Automation** | Trivial. Rich API with bulk lookup endpoints. |
| **Rate limits** | 30 req/min for standard endpoints, 10 req/min for analytics/bulk. 429 with `X-RateLimit-Reset` header. |
| **Licensing** | Free, open-source. No authentication required for standard endpoints. Commercial use permitted. |
| **Coverage** | 14,000+ schemes. Enrichment pipeline fills gaps from multiple sources. Includes holdings, ratios, ratings, Morningstar stars. |
| **Verdict** | **Best overall source for historical NAV backfill.** 18 years of daily data, free, comprehensive. |

---

## 4. Value Research Online

| Attribute | Detail |
|---|---|
| **URL** | https://www.valueresearchonline.com |
| **Historical NAV** | Available through premium subscription. No public API. |
| **Years available** | Unknown (premium gated). |
| **Daily granularity** | Likely yes (premium). |
| **API** | No public API. Data accessible only via website UI or enterprise data feeds. |
| **Automation** | Difficult. Would require scraping premium pages. |
| **Rate limits** | Not applicable (no API). |
| **Licensing** | Premium subscription required. Data is Value Research's commercial product. Likely restricts redistribution. |
| **Coverage** | All active schemes, plus research and ratings. |
| **Verdict** | **Not recommended.** No API, no automation, paid subscription required. |

---

## 5. Morningstar India

| Attribute | Detail |
|---|---|
| **URL** | https://www.morningstar.in |
| **Historical NAV** | Available via enterprise licensing. No publicly documented self-serve API for NAV history. Raw NAV time series not available as a dedicated endpoint. Growth-of-10K arrays provide a proxy but are not raw NAV. |
| **Years available** | Enterprise licensing: likely 10+ years. |
| **Daily granularity** | Enterprise: yes. Public: only current NAV. |
| **API** | Enterprise: Morningstar Direct Web Services (REST, SOAP). Public: no. |
| **Automation** | Enterprise: yes via API. Public: not feasible. |
| **Rate limits** | Enterprise: negotiated per contract. |
| **Licensing** | **Expensive.** Enterprise license typically costs ₹20L+/year. Prohibits redistribution in competing products. |
| **Coverage** | Comprehensive including ratings, analyst reports, risk metrics. |
| **Verdict** | **Not recommended for CIFRAA.** Cost-prohibitive and overkill for NAV-only needs. |

---

## 6. Individual AMC Websites

| Attribute | Detail |
|---|---|
| **Historical NAV** | Each AMC provides NAV history on their website (e.g., https://www.bajajamc.com/nav-history). Formats vary: CSV, Excel, PDF, HTML table. |
| **Years available** | Varies by AMC. Most provide full scheme history since inception. |
| **Daily granularity** | Yes. |
| **API** | No standardized API. Some AMCs offer REST APIs, but no common spec. |
| **Automation** | **Very difficult.** 40+ AMCs with different page structures, formats, auth requirements. |
| **Rate limits** | AMC-specific (mostly none for public pages, but scraping may trigger blocks). |
| **Licensing** | Public data, but terms vary per AMC site. |
| **Coverage** | Only that AMC's schemes. Inactive/historical schemes may have data. |
| **Verdict** | **Not feasible as primary source.** Too fragmented. Useful only as fallback for gap-filling. |

---

## 7. BSE Star MF Platform

| Attribute | Detail |
|---|---|
| **URL** | https://www.bsestarmf.in |
| **Historical NAV** | NAV Master file available (Scheme Code, ISIN, NAV, Date). |
| **Years available** | Not well documented. Designed for transaction processing, not historical data retrieval. |
| **Daily granularity** | Yes (NAV Master is a daily file). |
| **API** | SOAP/XML web services. Requires membership credentials. Not designed for data publishing. |
| **Automation** | Complex. Requires BSE membership, authentication, SOAP client. |
| **Rate limits** | Platform is for intermediaries, not data consumers. |
| **Licensing** | Requires intermediary agreement with BSE. |
| **Coverage** | All schemes traded on BSE Star MF platform. |
| **Verdict** | **Not recommended.** Designed for order routing, not data retrieval. High barrier to entry. |

---

## 8. Genka.dev (Paid API)

| Attribute | Detail |
|---|---|
| **URL** | https://genka.dev |
| **Historical NAV** | **20 years of NAV** for 4,700+ funds. Time-travel via `?as_of=YYYY-MM-DD`. Includes risk metrics, holdings, backtesting. |
| **Years available** | **20 years** (~2006 onward). |
| **Daily granularity** | Yes. |
| **API** | REST JSON. Also provides MCP server for AI agent integration. |
| **Automation** | Trivial. Standard REST API with API key. |
| **Rate limits** | Credit-based: $5 trial (500 credits), $29/mo (2,900 credits), $99/mo (9,900 credits). |
| **Licensing** | Commercial. Credits consumed per request. |
| **Coverage** | 4,700 funds (smaller set than AMFI's 14,000+). Includes metrics, holdings, concall transcripts. |
| **Verdict** | **Best paid option for backfill-rich architectures.** 20-year history is unmatched. MCP support ideal for AI agents. But smaller scheme set and cost. |

---

## 9. historical-mf-nav-data (Open Source GitHub)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/rajadilipkolli/historical-mf-nav-data |
| **Historical NAV** | **Pre-built SQLite database** available as GitHub release. Daily auto-update via GitHub Actions. |
| **Years available** | **2006-04-01 to present** (~20 years). |
| **Daily granularity** | Yes. 36.3M+ NAV records across 37,936 schemes. |
| **API** | No API. Ships as self-contained Java JAR with embedded SQLite. Provides Spring Boot auto-config, query services. |
| **Automation** | Releases auto-generated daily. Download JAR/db file directly. |
| **Rate limits** | None (it's a downloadable dataset, not an API). |
| **Licensing** | Open source (project license on GitHub). Data sourced from AMFI (public regulatory data). |
| **Coverage** | 37,936 schemes including inactive/merged (most comprehensive set seen). Securities: 34,724. |
| **Verdict** | **Best historical dataset for one-time backfill.** Download 20-year pre-built SQLite db. Cannot be used for daily live updates without building infrastructure. |

---

## 10. amfipy (Python Library)

| Attribute | Detail |
|---|---|
| **URL** | https://pypi.org/project/amfipy |
| **Historical NAV** | Wraps AMFI and RTA data programmatically. History available per scheme via `client.nav.history()`. |
| **Years available** | As much as AMFI provides (depends on scheme). |
| **Daily granularity** | Yes. |
| **API** | Python library with sync/async clients. Returns dict or polars DataFrame. |
| **Automation** | Easy for Python-based workflows. Not directly usable from TypeScript/JS. |
| **Rate limits** | Subject to AMFI's rate limits. |
| **Licensing** | MIT license (library). Data is AMFI public data. |
| **Coverage** | Same as AMFI (14,000+ schemes). |
| **Verdict** | Useful if CIFRAA had a Python backend. Not applicable for current TypeScript/Supabase stack. |

---

## Comparative Summary

| Source | Years | Schemes | Daily NAV | API | Automation | Cost | Best For |
|---|---|---|---|---|---|---|---|
| **AMFI** | Current only | 14,000+ | Yes | Text file | Easy | Free | Daily future updates |
| **MFAPI.in** | ~5 yr | 10,000+ | Yes | REST JSON | Easy | Free | Near-term + backfill |
| **mfdata.in** | **18 yr** | 14,000+ | Yes | REST JSON | Easy | **Free** | **Historical backfill** |
| Value Research | Gated | All | Premium | None | Hard | Paid | Skip |
| Morningstar | 10+ yr | All | Enterprise | Enterprise | Med | **₹20L+/yr** | Skip |
| AMC websites | Inception | Per-AMC | Yes | None | **Very hard** | Free | Fallback only |
| BSE Star MF | Unknown | All | Yes | SOAP | **Complex** | Membership | Skip |
| Genka.dev | **20 yr** | 4,700 | Yes | REST + MCP | Easy | **$29-99/mo** | AI integration |
| **historical-mf-nav-data** | **20 yr** | **37,936** | Yes | SQLite DB | Easy | **Free** | **One-time backfill** |
| amfipy | AMFI-limited | 14,000+ | Yes | Python lib | Easy | Free | Python workflows |

---

## Recommendations

### Best source for daily future NAV updates
**AMFI (NAVAll.txt)** — single HTTP GET, free, regulatory source of truth, covers all 14,000+ schemes. Exactly what the existing `ingest-amfi-nav` function already does. No reason to change.

### Best source for historical NAV backfill
**mfdata.in** — 18 years of daily NAV, REST API, free, no auth, covers 14,000+ schemes. The 30 req/min rate limit is manageable with a sequential backfill script (one scheme at a time, ~7 hours for full backfill; batch endpoints reduce this dramatically).

**Alternative: historical-mf-nav-data** — a one-time download of a 20-year SQLite database with 36M+ NAV records. Faster than any API crawl. Can be imported into Supabase directly. But requires manual refresh (daily GitHub releases).

### Recommended CIFRAA Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CIFRAA NAV Pipeline                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  DAILY (cron: every weekday at 6PM IST)                    │
│  ┌─────────────────────────────────────────────────┐       │
│  │  ingest-amfi-nav (Edge Function)                │       │
│  │  ┌─────────────┐    ┌──────────────────────┐   │       │
│  │  │ AMFI        │───▶│ nav_history table     │   │       │
│  │  │ NAVAll.txt  │    │ UNIQUE(code, date)   │   │       │
│  │  └─────────────┘    └──────────────────────┘   │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  ONE-TIME BACKFILL                                         │
│  ┌─────────────────────────────────────────────────┐       │
│  │  backfill-nav-history (supabase function/script) │       │
│  │  ┌─────────────┐    ┌──────────────────────┐   │       │
│  │  │ mfdata.in   │───▶│ nav_history table     │   │       │
│  │  │ 18yr history │    │ (existing rows        │   │       │
│  │  └─────────────┘    │  skipped via ON        │   │       │
│  │                     │  CONFLICT DO NOTHING)  │   │       │
│  │                     └──────────────────────┘   │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  FUTURE CONSUMERS (Phase 2+)                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ nav_history │─▶│ Metrics      │─▶│ Recommendation   │  │
│  │ table       │  │ Engine       │  │ Engine           │  │
│  │             │  │ (CAGR, vol,  │  │ (enhanced with   │  │
│  │             │  │  sharpe, etc)│  │  NAV history)    │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Phased Implementation Plan

| Phase | What | Source | Timeline |
|---|---|---|---|
| **Phase 1** (Done) | `nav_history` table + daily AMFI ingestion | AMFI NAVAll.txt | Now |
| **Phase 2** (Next) | One-time historical backfill | mfdata.in | ~1-2 hours |
| **Phase 3** | Compute fund metrics (CAGR, volatility, Sharpe) from nav_history | Internal | Next |
| **Phase 4** | Feed metrics into recommendation engine | Internal | Future |

### Key Design Principles

1. **AMFI stays as the daily source** — regulatory source of truth, single HTTP GET, free
2. **mfdata.in for backfill** — 18 years, free, no auth, rich API
3. **`nav_history` as single source of truth for NAV** — eliminates Excel dependency for NAV data
4. **ON CONFLICT DO NOTHING** — backfill and daily runs coexist idempotently
5. **No recommendation engine changes yet** — Phase 1 is pure data infrastructure
