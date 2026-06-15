# NAV Dataset Recommendation Report

**Date:** 2026-06-15
**Purpose:** Find the best free historical Indian mutual fund NAV dataset for CIFRAA metric backfill.

---

## Recommendation: historical-mf-nav-data

**Source:** [rajadilipkolli/historical-mf-nav-data](https://github.com/rajadilipkolli/historical-mf-nav-data)

**Download:** `https://github.com/rajadilipkolli/historical-mf-nav-data/releases/latest/download/funds.db.zst`

This is the definitive dataset for CIFRAA's one-time historical backfill. It covers 20+ years of daily NAVs across 37,959 AMFI schemes — including closed, merged, and renamed funds — in a pre-indexed SQLite database.

---

## Evaluation Summary

| Criterion | historical-mf-nav-data | Tigzig MF NAV API | mfapi.in |
|-----------|----------------------|-------------------|----------|
| **Schemes** | **37,959** (all-time) | 17,866 | ~10,000+ |
| **Records** | **35,223,033** | 20,422,813 | Per-scheme |
| **Years** | **2006 – present (20 yr)** | 2013 – present (13 yr) | ~5 yr |
| **Format** | SQLite (pre-indexed) | CSV/Parquet/SQLite | JSON (live API) |
| **Download size** | 208 MB (compressed `.zst`) | 107–459 MB (varies) | N/A |
| **Decompressed DB** | ~1.5 GB | ~1–2 GB | N/A |
| **License** | MIT | Free (no license) | Free |
| **Update frequency** | Daily (GitHub Actions) | Daily | 6× daily |
| **API available** | SQLite direct | REST + bulk download | REST (per scheme) |
| **Closed funds** | Yes | No (active only) | No |
| **ISIN mapping** | Yes (`securities` table) | No | No |
| **scheme_code match** | Yes (INTEGER PK) | Yes | Yes |

---

## Source Evaluations

### 1. historical-mf-nav-data (Recommended ★)

| Attribute | Detail |
|---|---|
| **URL** | https://github.com/rajadilipkolli/historical-mf-nav-data |
| **Author** | Rajadilip Kolli |
| **License** | MIT |
| **Format** | SQLite database (pre-indexed) |
| **Total schemes** | 37,959 |
| **Total NAV records** | 35,223,033 |
| **Date range** | 2006-04-01 to 2026-06-14 |
| **Compressed size** | 208 MB (ZST) |
| **Decompressed size** | ~1.5 GB |
| **Update cadence** | Daily via GitHub Actions |
| **Release count** | 313 releases (as of 2026-06-15) |

**Schema:**

```sql
schemes (scheme_code INTEGER PK, scheme_name TEXT)
nav (date TEXT, scheme_code INTEGER, nav REAL)
securities (isin TEXT UNIQUE, type INTEGER, scheme_code INTEGER)
nav_by_isin (VIEW: isin, date, nav)
```

**Strengths:**
- Most comprehensive scheme coverage (includes closed/merged/renamed funds)
- Longest history (20+ years — critical for 5Y CAGR, 5Y volatility)
- Pre-indexed SQLite database (ready for `calculate-fund-metrics.py`)
- Daily automated updates
- MIT license — no usage restrictions
- ISIN mapping table enables cross-reference with portfolio holdings

**Weaknesses:**
- Requires `zstd` decompression tool
- Larger download than alternatives
- No REST API (file-based only)

---

### 2. Tigzig MF NAV API

| Attribute | Detail |
|---|---|
| **URL** | https://api.tigzig.com/mf/v1/ |
| **Author** | Amar Harolikar (TigZig) |
| **License** | Free (no formal license) |
| **Formats** | CSV, TSV, Parquet, SQLite |
| **Total schemes** | 17,866 |
| **Total NAV records** | 20,422,813 |
| **Date range** | Jan 2013 – present (~13 yr) |
| **Database size** | 459 MB (SQLite compressed) |
| **Update cadence** | Daily |

**Strengths:**
- REST API available (search, per-scheme, bulk download)
- Multiple formats (CSV, Parquet, SQLite)
- No authentication required
- Active maintenance by data professional

**Weaknesses:**
- Shorter history (13 years vs 20) — insufficient for 5Y CAGR on older funds
- Fewer schemes (17,866 vs 37,959) — closed/merged funds missing
- Only covers active AMFI schemes
- No ISIN mapping table

---

### 3. mfapi.in

| Attribute | Detail |
|---|---|
| **URL** | https://api.mfapi.in |
| **Author** | Yuvaraj Loganathan |
| **License** | Free |
| **Format** | JSON (REST API) |
| **Date range** | ~5 years |
| **Update cadence** | 6× daily |

**Strengths:**
- Very simple REST API (no auth, no rate limits)
- Already used by CIFRAA Edge Function (`mfapi/index.ts`)
- Suitable for daily incremental updates

**Weaknesses:**
- Only ~5 years of history (insufficient for 3Y/5Y metrics on many funds)
- Per-scheme API calls only (no bulk download)
- No `scheme_name` in NAV response (only in meta)
- Not suitable for one-time 14K-scheme backfill

---

### 4. Other Sources Considered

| Source | Verdict |
|---|---|
| **AMFI NAVAll.txt** | Daily only, no history. Used by `ingest-amfi-nav`. |
| **mfdata.in** | API requires key; 10 req/min free tier. Not suitable for bulk. |
| **utkarshohm/mf-nav-data** | Stale (2016). 45 MB compressed. Only historical value. |
| **BSE Star MF** | Requires license. Not free. |
| **KnowYourMF** | Web-only download, per-scheme. Not bulk. |
| **AdvisorKhoj** | Web-only, per-scheme. Not bulk. |

---

## Import Strategy into nav_history

### Phase 1: Download & Prepare

```bash
# Download compressed SQLite database
wget https://github.com/rajadilipkolli/historical-mf-nav-data/releases/latest/download/funds.db.zst

# Decompress (requires zstd)
unzstd funds.db.zst

# Verify
sqlite3 funds.db "SELECT COUNT(*) FROM nav;"
# Expected: 35,223,033
sqlite3 funds.db "SELECT COUNT(*) FROM schemes;"
# Expected: 37,959
```

### Phase 2: Run Metric Calculator

```bash
python scripts/calculate-fund-metrics.py funds.db -o fund_metrics.csv
```

The calculator auto-detects the `nav` table and `scheme_code`/`date`/`nav` columns.

### Phase 3: Import into Supabase (Future)

SQL to bulk upsert from CSV into `fund_metrics`:

```sql
-- Using psql \copy or Supabase SQL Editor
\copy fund_metrics FROM 'fund_metrics.csv' WITH (FORMAT CSV, HEADER);

-- Or via Python using supabase-py
```

For daily incremental updates, use the existing `ingest-amfi-nav` Edge Function (already running) — it fills `nav_history` daily from AMFI's NAVAll.txt. The SQLite backfill is a **one-time** operation to get the full 20-year history.

### Future Incremental Flow

```
[AMFI NAVAll.txt daily]
        │
        ▼
ingest-amfi-nav (Edge Function) ──► nav_history (daily)
        │
        ▼
Weekly cron: recalculate from
nav_history (last 2 years) +
fund_metrics (stored anchors)
        │
        ▼
fund_metrics (updated)
```

---

## Recommendation Verdict

**Use `historical-mf-nav-data` (rajadilipkolli) for the one-time backfill.**

It is the only source meeting all CIFRAA requirements:
- ✓ 20+ years of data (2006–2026)
- ✓ 37,959 schemes (including closed funds for legacy calculations)
- ✓ SQLite format (directly compatible with `calculate-fund-metrics.py`)
- ✓ Pre-indexed for fast querying
- ✓ Free (MIT license)
- ✓ Daily automated updates

Tigzig MF NAV is a strong fallback if scheme_code matching fails for newer schemes in the primary dataset. The two datasets can be cross-validated during the verification step.

---

## Quick Reference

```bash
# Download
wget https://github.com/rajadilipkolli/historical-mf-nav-data/releases/latest/download/funds.db.zst
unzstd funds.db.zst

# Run metric calculation
python scripts/calculate-fund-metrics.py funds.db -o fund_metrics.csv

# Expected output
# Read: 35,223,033 rows
# ~14,000 schemes with >= 60 data points
# Wrote: ~14,000 schemes to fund_metrics.csv
```
