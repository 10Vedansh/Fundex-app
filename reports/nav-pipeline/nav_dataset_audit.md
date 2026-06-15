# historical-mf-nav-data SQLite Schema Audit

**Date:** 2026-06-15
**File:** `funds.db` (1.13 GB decompressed)
**Source:** [rajadilipkolli/historical-mf-nav-data](https://github.com/rajadilipkolli/historical-mf-nav-data) release `v1.0.20260615`

---

## 1. All Tables

| Table | Type | Rows | Purpose |
|-------|------|------|---------|
| `nav` | Table | **35,223,033** | Daily NAV records (date, scheme_code, nav) |
| `schemes` | Table | **37,959** | Scheme metadata (scheme_code → name) |
| `securities` | Table | **34,761** | ISIN-to-scheme_code mapping |
| `nav_by_isin` | View | — | JOIN view linking ISIN → NAV |
| `sqlite_stat1` | Internal | 3 | SQLite query planner stats |

---

## 2. Row Counts & Date Coverage

| Metric | Value |
|--------|-------|
| Total NAV records | **35,223,033** |
| Unique scheme codes in NAV | **37,353** |
| Total schemes registered | **37,959** (606 have zero NAV records) |
| Date range | **2006-04-01** to **2026-06-14** (20+ years) |
| Schemes with ≥60 NAV records | **34,249** (metric-calculable) |
| Schemes with ≥252 NAV records (1yr+) | **26,438** |
| Schemes with NAV in last 2yr (≈active) | **9,065** |

### NAV Records by Year

| Year | Records | Year | Records |
|------|--------:|------|--------:|
| 2006 | 363,186 | 2017 | 2,559,084 |
| 2007 | 663,066 | 2018 | 2,403,194 |
| 2008 | 931,913 | 2019 | 2,546,577 |
| 2009 | 877,649 | 2020 | 2,457,730 |
| 2010 | 858,447 | 2021 | 2,132,190 |
| 2011 | 1,014,232 | 2022 | 1,824,689 |
| 2012 | 1,158,786 | 2023 | 1,532,278 |
| 2013 | 1,883,505 | 2024 | 1,210,601 |
| 2014 | 2,514,728 | 2025 | 1,861,303 |
| 2015 | 2,685,941 | 2026 | 960,089 |
| 2016 | 2,783,845 | | |

### Schemes by NAV Data Density

| Bucket | Schemes | % of Total | Rows |
|--------|--------:|-----------:|-----:|
| <60 rows (skippable) | 3,104 | 8.2% | 121,171 |
| 3m–1yr (60–252) | 7,811 | 20.6% | 1,451,282 |
| 1–5yr (252–756) | 12,196 | 32.1% | 6,919,833 |
| 5–10yr (756–1260) | 6,825 | 18.0% | 6,369,147 |
| 10–20yr (1260–2520) | 3,607 | 9.5% | 6,665,707 |
| **20+yr** (>2520) | **3,810** | **10.0%** | **13,695,893** |

---

## 3. NAV Table Columns

```sql
CREATE TABLE "nav" (
    scheme_code INTEGER,    -- AMFI scheme code (numeric)
    date        TEXT,       -- Trading date (ISO: "2006-04-03")
    nav         FLOAT,      -- Net Asset Value
    FOREIGN KEY (scheme_code) REFERENCES schemes(scheme_code)
);
```

Column details:

| Column | Type | Nullable | Indexed | Notes |
|--------|------|----------|---------|-------|
| `scheme_code` | INTEGER | Yes | **No** (index added during audit) | 100027–154402 |
| `date` | TEXT | Yes | **No** (index added during audit) | ISO 8601 format |
| `nav` | FLOAT | Yes | No | Range: 0.0099–2,458,145.82 |

**Indexes were NOT present on download.** The README instructs creating them manually. During this audit, two indexes were added:

```sql
CREATE INDEX "nav-scheme" ON "nav" ("scheme_code");
CREATE INDEX "nav-date"   ON "nav" ("date");
```

---

## 4. Column Mapping to AMFI scheme_code

| Source | Column | Type | Example |
|--------|--------|------|---------|
| `funds.db` `nav.scheme_code` | INTEGER | `122639` |
| `funds.db` `schemes.scheme_code` | INTEGER | `122639` |
| `nav_history.scheme_code` (Supabase) | TEXT | `"122639"` |
| AMFI NAVAll.txt `Scheme_Code` | Numeric text | `122639` |

**Mapping:** Direct match via `CAST(funds.db.scheme_code AS TEXT) = nav_history.scheme_code`

No lookup table or cross-reference is required — the same AMFI scheme code numbering is used in both databases.

---

## 5. Active Scheme Code Matching Feasibility

| Question | Answer |
|----------|--------|
| **Are AMFI scheme codes directly matchable?** | **Yes** — same numbering system, direct cast |
| **Does funds.db cover all 14,212 active AMFI schemes?** | **Partially** — 9,065 schemes have NAV data in the last 2 years |
| **Gap analysis** | ~5,000 active AMFI schemes not found in funds.db. Likely causes: (a) very new schemes launched in 2025-26, (b) scheme restructuring, (c) daily AMFI NAVAll.txt includes some schemes that this dataset does not track |
| **Are closed/merged schemes included?** | **Yes** — 22,227 schemes have no NAV since 2020, and 606 schemes have zero NAV records at all |
| **Does scheme_code overlap with mfapi.in?** | Yes — mfapi.in uses the same AMFI codes |

### Scheme Status Breakdown

| Status | Count |
|--------|------:|
| Active (NAV in 2026) | 8,731 |
| Recent (NAV in 2024–2025) | 434 |
| Legacy (NAV in 2020–2023) | 5,961 |
| Stale / Closed (NAV before 2020) | 22,227 |
| No NAV data at all | 606 |
| **Total** | **37,959** |

---

## 6. Estimated Rows for 14,212 Active AMFI Schemes

From the database's 9,065 recently-active schemes:

| Metric | Value |
|--------|-------|
| Active schemes (NAV in last 2yr) | 9,065 |
| Total NAV rows for these schemes | **16,948,462** |
| Avg rows per active scheme | **1,870** |
| **Estimated rows for 14,212 schemes** | **~26.6 million** |
| Daily NAV schemes (June 2026 avg) | ~8,490/weekday |

The architecture doc (`reports/architecture/final_data_architecture.md`) estimated 14,212 × ~500 = **~7.1M rows** for a 2-year rolling window. The full historical dataset is denser because it includes all data since scheme inception (avg 1,870 rows vs 500 for 2yr).

**Implication:** A full backfill of all historical NAV records for 14,212 active schemes would insert **~26.6M rows** into `nav_history`. Based on the existing daily AMFI ingestion (~8,490 rows/day), this is equivalent to ~3,100 days of regular ingestion — roughly **8.5 years** of data that already exists from other sources blended in.

---

## 7. Import Plan

### Strategy: Selective Merge (Upsert Missing History)

Rather than a full bulk import (26.6M rows), import only NAV records that don't already exist in `nav_history`.

```mermaid
flowchart TD
    A[funds.db] --> B[Filter to 14,212 active AMFI scheme_codes]
    B --> C[Join on scheme_code + nav_date]
    C --> D{Record exists in nav_history?}
    D -- No --> E[Batch insert into nav_history]
    D -- Yes --> F[Skip (no update needed)]
    E --> G[Report: rows inserted, skipped]
```

### Step-by-Step

#### Step 1: Create indexes on funds.db (done)

```sql
CREATE INDEX "nav-scheme" ON "nav" ("scheme_code");
CREATE INDEX "nav-date"   ON "nav" ("date");
```

#### Step 2: Generate filtered import file

Extract only the 14,212 active AMFI scheme codes' NAV data from funds.db:

```bash
# Export to CSV (excluding existing nav_history records if possible offline)
python scripts/export_funds_nav.py funds.db --active-only --output nav_backfill.csv
```

Expected CSV: **~26.6M rows**, ~500 MB uncompressed.

#### Step 3: Upsert into nav_history via Supabase

Use `ingest-amfi-nav`'s existing upsert pattern in a Python script:

```python
for batch in chunk(csv_reader, 5000):
    supabase.table("nav_history").upsert(
        batch,
        on_conflict="scheme_code, nav_date",
        ignore_duplicates=True,
    )
```

**Estimated runtime:** ~30–60 minutes (26.6M records / 5K per batch / ~5 batches/sec).

#### Step 4: Run metric calculator

```bash
python scripts/calculate-fund-metrics.py funds.db -o fund_metrics.csv
```

The calculator already filters to schemes with ≥60 NAV records and auto-detects the `nav` table schema.

#### Step 5: Verify coverage

```sql
SELECT COUNT(DISTINCT scheme_code) FROM nav_history;
-- Expected: ~14,212 (up from daily AMFI ingestion)
```

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Import all historical NAV? | **Yes** — full history needed for 5Y CAGR and max drawdown | 2-year rolling window misses long-term metrics |
| Use upsert with ignore_duplicates? | **Yes** — existing daily AMFI data shouldn't be overwritten | `on_conflict: "scheme_code, nav_date"` |
| Batch size | **5,000** rows | Matches existing `ingest-amfi-nav` pattern |
| Index funds.db? | **Yes** — required for performant metric calculation | `nav-scheme` + `nav-date` indexes |
| Clean up funds.db after import? | **Optional** — can be kept for re-runs | 1.13 GB on disk |

### File Lifecycle

```
funds.db.zst (208 MB compressed, GitHub release)
    │
    ▼  unzstd
funds.db (1.13 GB, decompressed on disk)
    │
    ├──► Step 2: CREATE INDEX nav-scheme, nav-date
    │
    ├──► Step 3: Export active scheme NAVs → nav_backfill.csv
    │
    ├──► Step 4: Upsert into Supabase nav_history
    │
    └──► Step 5: Calculate fund_metrics (uses funds.db directly)
```

Expected total disk usage during import: **~2 GB** (1.13 GB funds.db + ~500 MB CSV + temporary files).

---

## Quick Reference

```bash
# Indexes needed before running metric calculator
sqlite3 funds.db "CREATE INDEX 'nav-scheme' ON 'nav' ('scheme_code')"
sqlite3 funds.db "CREATE INDEX 'nav-date'   ON 'nav' ('date')"

# Run metric calculator (already handles scheme filtering)
python scripts/calculate-fund-metrics.py funds.db -o fund_metrics.csv

# Expected output
# Read: 35,223,033 rows from table 'nav'
# 34,249 schemes with >= 60 data points
# Done. ~14,000 schemes written to fund_metrics.csv
```
