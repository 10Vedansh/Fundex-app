#!/usr/bin/env python3
"""
normalize-categories.py — Normalize 157 category variants to canonical taxonomy.

Steps:
  1. Migration: add original_category column (manual if needed)
  2. Migrate current category -> original_category
  3. Apply canonical mapping
  4. Upsert into fund_master
  5. Sync fund_metrics
  6. Verify

Usage:
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/normalize-categories.py
"""

import os
import sys
import time
from supabase import create_client
from collections import Counter

SUPABASE_URL = "https://skvvltawshbphrgnqjzf.supabase.co"
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
sup = create_client(SUPABASE_URL, SERVICE_KEY)

# ============================================================================
# Canonical taxonomy (self-mapping for valid categories)
# ============================================================================

CANONICAL_TAXONOMY = {
    # EQUITY (15)
    "Equity - Large Cap", "Equity - Mid Cap", "Equity - Small Cap",
    "Equity - Large & Mid Cap", "Equity - Multi Cap", "Equity - Flexi Cap",
    "Equity - Value", "Equity - Focused",
    "Equity - Dividend Yield", "Equity - ELSS", "Equity - Index",
    "Equity - Thematic",
    "Equity - Sectoral - Banking", "Equity - Sectoral - Technology",
    "Equity - Sectoral - Pharma", "Equity - Sectoral - Consumption",
    "Equity - Sectoral - Infrastructure",
    "Equity - Sectoral - PSU", "Equity - Sectoral - Manufacturing",
    # HYBRID (7)
    "Hybrid - Aggressive", "Hybrid - Conservative", "Hybrid - Balanced",
    "Hybrid - Equity Savings", "Hybrid - Arbitrage",
    "Hybrid - Multi Asset Allocation", "Hybrid - Dynamic Asset Allocation",
    # DEBT (16)
    "Debt - Liquid", "Debt - Money Market", "Debt - Overnight",
    "Debt - Ultra Short Duration", "Debt - Low Duration",
    "Debt - Short Duration", "Debt - Medium Duration",
    "Debt - Long Duration",
    "Debt - Dynamic Bond", "Debt - Corporate Bond",
    "Debt - Banking and PSU", "Debt - Gilt",
    "Debt - Credit Risk",
    "Debt - Floater", "Debt - Income", "Debt - IDF",
    # COMMODITY (1)
    "Commodity - Gold",
    # OTHER (6)
    "Other - Fund of Funds", "Other - International", "Other - ETF",
    "Other - Solution Oriented",
    "Other - Unclassified", "Unknown",
}

# ============================================================================
# 157 original -> canonical mapping
# ============================================================================

CAT_MAP = {
    # Empty -> Unknown
    "": "Unknown",

    # Workbook short codes -> canonical
    "EQ-LC": "Equity - Large Cap",
    "EQ-MC": "Equity - Mid Cap",
    "EQ-SC": "Equity - Small Cap",
    "EQ-L&MC": "Equity - Large & Mid Cap",
    "EQ-FLX": "Equity - Flexi Cap",
    "EQ-MLC": "Equity - Multi Cap",
    "EQ-VAL": "Equity - Value",
    "EQ-DIV Y": "Equity - Dividend Yield",
    "EQ-ELSS": "Equity - ELSS",
    "EQ-THEMATIC": "Equity - Thematic",
    "EQ-T-ESG": "Equity - Thematic",
    "EQ-TBC": "Equity - Thematic",
    "EQ-SA&T": "Equity - Thematic",
    "EQ-Innovation": "Equity - Thematic",
    "EQ-Quant": "Equity - Thematic",
    "EQ-BANK": "Equity - Sectoral - Banking",
    "EQ-IT": "Equity - Sectoral - Technology",
    "EQ-Pharma": "Equity - Sectoral - Pharma",
    "EQ-Consumption": "Equity - Sectoral - Consumption",
    "EQ-INFRA": "Equity - Sectoral - Infrastructure",
    "EQ-Energy": "Equity - Sectoral - Energy",
    "EQ-PSU": "Equity - Sectoral - PSU",
    "EQ-MNC": "Equity - Sectoral - MNC",
    "EQ-Manufacturing": "Equity - Sectoral - Manufacturing",
    "EQ-INTL": "Other - International",

    "HY-AH": "Hybrid - Aggressive",
    "HY-CH": "Hybrid - Conservative",
    "HY-BH": "Hybrid - Balanced",
    "HY-EQ S": "Hybrid - Equity Savings",
    "HY-AR": "Hybrid - Arbitrage",
    "HY-MAA": "Hybrid - Multi Asset Allocation",
    "HY-DAA": "Hybrid - Dynamic Asset Allocation",
    "HY-IPA": "Hybrid - Multi Asset Allocation",

    "DT-LIQ": "Debt - Liquid",
    "DT-MM": "Debt - Money Market",
    "DT-OVERNHT": "Debt - Overnight",
    "DT-USD": "Debt - Ultra Short Duration",
    "DT-LD": "Debt - Low Duration",
    "DT-SD": "Debt - Short Duration",
    "DT-MD": "Debt - Medium Duration",
    "DT-M to LD": "Debt - Medium to Long Duration",
    "DT-LONG D": "Debt - Long Duration",
    "DT-DB": "Debt - Dynamic Bond",
    "DT-CB": "Debt - Corporate Bond",
    "DT-BK & PSU": "Debt - Banking and PSU",
    "DT-GL": "Debt - Gilt",
    "DT-Gilt 10Y CD": "Debt - Gilt with 10yr Constant Maturity",
    "DT-CR": "Debt - Credit Risk",
    "DT-Floater": "Debt - Floater",
    "DT-TM": "Debt - Income",
    "DT-OTH": "Debt - Income",

    # mfapi.in raw -> canonical
    "Equity Scheme - Large Cap Fund": "Equity - Large Cap",
    "Equity Scheme - Mid Cap Fund": "Equity - Mid Cap",
    "Equity Scheme - Small Cap Fund": "Equity - Small Cap",
    "Equity Scheme - Large & Mid Cap Fund": "Equity - Large & Mid Cap",
    "Equity Scheme - Multi Cap Fund": "Equity - Multi Cap",
    "Equity Scheme - Focussed Fund": "Equity - Focused",
    "Equity Scheme - Dividend Yield Fund": "Equity - Dividend Yield",
    "Equity Scheme - Sectoral/ Thematic": "Equity - Thematic",
    "Equity Scheme - Index Fund": "Equity - Index",

    "Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage": "Hybrid - Dynamic Asset Allocation",

    "Debt Scheme - Liquid Fund": "Debt - Liquid",
    "Debt Scheme - Money Market Fund": "Debt - Money Market",
    "Debt Scheme - Overnight Fund": "Debt - Overnight",
    "Debt Scheme - Ultra Short Duration Fund": "Debt - Ultra Short Duration",
    "Debt Scheme - Low Duration Fund": "Debt - Low Duration",
    "Debt Scheme - Short Duration Fund": "Debt - Short Duration",
    "Debt Scheme - Medium Duration Fund": "Debt - Medium Duration",
    "Debt Scheme - Medium to Long Duration Fund": "Debt - Medium to Long Duration",
    "Debt Scheme - Long Duration Fund": "Debt - Long Duration",
    "Debt Scheme - Dynamic Bond Fund": "Debt - Dynamic Bond",
    "Debt Scheme - Corporate Bond Fund": "Debt - Corporate Bond",
    "Debt Scheme - Banking and PSU Fund": "Debt - Banking and PSU",
    "Debt Scheme - Gilt Fund": "Debt - Gilt",
    "Debt Scheme - Gilt Fund with 10 year constant duration": "Debt - Gilt with 10yr Constant Maturity",
    "Debt Scheme - Credit Risk Fund": "Debt - Credit Risk",
    "Debt Scheme - Floater Fund": "Debt - Floater",
    "Debt Scheme - Income Fund": "Debt - Income",

    "Gold-Funds": "Commodity - Gold",
    "Silver-Funds": "Commodity - Silver",
    "Other Scheme - Gold ETF": "Commodity - Gold",

    "Other Scheme - FoF Domestic": "Other - Fund of Funds",
    "Other Scheme - FoF Overseas": "Other - International",
    "Other Scheme - Index Funds": "Equity - Index",
    "Other Scheme - Other  ETFs": "Other - ETF",

    "Solution Oriented Scheme - Retirement Fund": "Other - Retirement Fund",
    "Equity - Growth": "Other - Unclassified",
    "Income": "Debt - Income",
    "Debt - Income": "Debt - Income",
    "Liquid": "Debt - Liquid",
    "Balanced": "Hybrid - Balanced",
    "Growth": "Other - Unclassified",
    "Money Market": "Debt - Money Market",
    "Gilt": "Debt - Gilt",
    "Index": "Equity - Index",
    "ETF": "Other - ETF",
    "IDF": "Debt - IDF",

    # Garbage / plan types
    "1099 Days": "Other - Unclassified",
    "1100 days": "Other - Unclassified",
    "1100 Days": "Other - Unclassified",
    "1100 DAYS": "Other - Unclassified",
    "1102 Days": "Other - Unclassified",
    "1111 DAYS": "Other - Unclassified",
    "1116 Days": "Other - Unclassified",
    "1124 Days": "Other - Unclassified",
    "1141 Days": "Other - Unclassified",
    "1150 DAYS": "Other - Unclassified",
    "1194 DAYS": "Other - Unclassified",
    "1305 Days": "Other - Unclassified",
    "19 months Plan": "Other - Unclassified",
    "466 DAYS": "Other - Unclassified",
    "5 Year Plan": "Other - Unclassified",
    "91 Days": "Other - Unclassified",
    "1": "Other - Unclassified",
    "Analyst's Conviction Equalized": "Other - Unclassified",
    "Compulsory Reinvestment": "Other - Unclassified",
    "Daily": "Other - Unclassified",
    "Direct": "Other - Unclassified",
    "DIRECT": "Other - Unclassified",
    "erstwhile Cash Option": "Other - Unclassified",
    "Formerly Known as IIFL Mutual Fund": "Other - Unclassified",
    "Formerly Super Institutional Plan": "Other - Unclassified",
    "FV Rs 32.161": "Other - Unclassified",
    "G": "Other - Unclassified",
    "Half Yearly Dividend": "Other - Unclassified",
    "Merger of Capex & Energy Opportunities": "Other - Unclassified",
    "Payout": "Other - Unclassified",
    "54EB Growth": "Other - Unclassified",
    "ELSS": "Equity - ELSS",

    # Already canonical (before April 2026 consolidation)
    "Equity - Sectoral": "Equity - Thematic",
    "Equity - Contra": "Equity - Value",
    "Equity - Sectoral - FMCG": "Equity - Thematic",
    "Equity - Sectoral - Real Estate": "Equity - Thematic",
    "Equity - Sectoral - MNC": "Equity - Thematic",
    "Equity - Sectoral - Energy": "Equity - Thematic",
    "Debt - Medium to Long Duration": "Debt - Medium Duration",
    "Debt - Gilt with 10yr Constant Maturity": "Debt - Gilt",
    "Commodity - Silver": "Commodity - Gold",
    "Other - Retirement Fund": "Other - Solution Oriented",
    "Debt - 10 Year Constant Maturity": "Debt - Gilt",
}

# Self-map canonical -> canonical so they pass through
for c in list(CANONICAL_TAXONOMY):
    if c not in CAT_MAP:
        CAT_MAP[c] = c


def normalize(orig: str) -> str:
    if not orig or not orig.strip():
        return "Unknown"
    return CAT_MAP.get(orig.strip(), "Other - Unclassified")


# ============================================================================
# Step 1: Add original_category column via migration file
# ============================================================================

MIGRATION_SQL = """-- Phase 5.3: Add original_category for auditability
ALTER TABLE fund_master ADD COLUMN IF NOT EXISTS original_category TEXT;
ALTER TABLE fund_metrics ADD COLUMN IF NOT EXISTS original_category TEXT;

-- Copy current category to original_category where original is null
UPDATE fund_master SET original_category = category
WHERE original_category IS NULL OR original_category = '';
"""

def write_migration():
    path = "supabase/migrations/20260615000005_add_original_category.sql"
    with open(path, "w") as f:
        f.write(MIGRATION_SQL)
    print(f"  Migration written to {path}")
    print("  Run: npx supabase migration up")
    print("  Or execute manually in Supabase SQL editor.")


def try_sql_direct():
    """Try direct SQL via Supabase REST API."""
    import requests as req
    for endpoint in [
        f"{SUPABASE_URL}/rest/v1/sql",
        f"{SUPABASE_URL}/rest/v1/rpc/exec_sql",
        f"{SUPABASE_URL}/rest/v1/rpc/exec",
    ]:
        try:
            r = req.post(endpoint, headers={
                "Authorization": f"Bearer {SERVICE_KEY}",
                "apikey": SERVICE_KEY,
                "Content-Type": "application/json",
            }, json={"query": MIGRATION_SQL.split("--")[0].strip()}, timeout=5)
            if r.status_code < 400:
                print(f"  SQL via {endpoint} succeeded")
                return True
        except Exception:
            continue
    return False


# ============================================================================
# Step 2: Load all rows
# ============================================================================

def load_all():
    print("Step 2: Loading fund_master rows ...")
    rows = []
    off = 0
    t0 = time.time()
    while True:
        batch = sup.from_("fund_master").select("scheme_code,category").range(off, off + 999).execute().data
        if not batch:
            break
        rows.extend(batch)
        off += 1000
        if len(batch) < 1000:
            break
        if off % 5000 == 0:
            print(f"  ... {off:,} loaded ({time.time()-t0:.1f}s)", flush=True)
    print(f"  Loaded {len(rows):,} rows in {time.time()-t0:.1f}s")
    return rows


# ============================================================================
# Step 3: Map categories
# ============================================================================

def process(rows):
    print("Step 3: Processing categories ...")
    updates = []
    variant_counts = Counter()
    mapped_counts = Counter()
    unmapped = set()
    no_op = 0

    for row in rows:
        sc = row["scheme_code"]
        orig = (row.get("category") or "").strip()
        variant_counts[orig] += 1
        canonical = normalize(orig)
        mapped_counts[canonical] += 1

        if canonical == orig:
            no_op += 1
            continue

        if canonical == "Other - Unclassified":
            unmapped.add(orig)

        updates.append({"scheme_code": sc, "category": canonical})

    print(f"    Total: {len(rows):,}")
    print(f"    No change: {no_op:,}")
    print(f"    Canonicalized: {len(updates):,}")
    print(f"    Original variants: {len(variant_counts)}")
    print(f"    Canonical variants: {len(mapped_counts)}")
    print(f"    Unmapped -> Unclassified: {len(unmapped)}")

    return updates, variant_counts, mapped_counts, unmapped


# ============================================================================
# Step 4: Upsert
# ============================================================================

def upsert(rows, table, batch_size=500):
    if not rows:
        print(f"  No rows to upsert into {table}")
        return 0, 0
    total = len(rows)
    ok = 0
    err = 0
    t0 = time.time()
    print(f"Step 4: Upserting {total:,} into {table} ...", flush=True)
    for i in range(0, total, batch_size):
        batch = rows[i:i + batch_size]
        try:
            sup.table(table).upsert(batch, on_conflict="scheme_code").execute()
            ok += len(batch)
        except Exception as e:
            err += len(batch)
            if err <= len(batch):
                print(f"    err [{len(batch)}]: {str(e)[:200]}", flush=True)
        if (i // batch_size + 1) % 10 == 0 or i + batch_size >= total:
            print(f"    {min(i+batch_size, total):,}/{total:,} ({min((i+batch_size)/total*100,100):.0f}%) | {ok:,} ok", flush=True)
    print(f"  Done: {ok:,} ok, {err:,} err in {time.time()-t0:.1f}s")
    return ok, err


# ============================================================================
# Step 5: Sync fund_metrics
# ============================================================================

def load_fm():
    print("\nStep 5: Loading fund_metrics ...")
    rows = []
    off = 0
    t0 = time.time()
    while True:
        batch = sup.from_("fund_metrics").select("scheme_code,category,scheme_name").range(off, off + 999).execute().data
        if not batch:
            break
        rows.extend(batch)
        off += 1000
        if len(batch) < 1000:
            break
        if off % 5000 == 0:
            print(f"  ... {off:,} loaded ({time.time()-t0:.1f}s)", flush=True)
    print(f"  Loaded {len(rows):,} rows in {time.time()-t0:.1f}s")

    updates = []
    for row in rows:
        sc = row["scheme_code"]
        orig = (row.get("category") or "").strip()
        canonical = normalize(orig)
        if canonical != orig:
            # Include scheme_name to avoid NOT NULL violation
            updates.append({
                "scheme_code": sc,
                "category": canonical,
                "scheme_name": row.get("scheme_name") or "",
            })
    print(f"  {len(updates):,} need category update")
    return updates


# ============================================================================
# Step 6: Verify
# ============================================================================

def verify():
    print("\nStep 6: Verification ...")
    total = sup.from_("fund_master").select("scheme_code", count="exact").limit(1).execute().count
    cats = Counter()
    active_cats = Counter()
    off = 0
    while True:
        batch = sup.from_("fund_master").select("category,is_active").range(off, off + 999).execute().data
        if not batch:
            break
        for row in batch:
            c = (row.get("category") or "").strip()
            a = row.get("is_active", False)
            cats[c] += 1
            if a:
                active_cats[c] += 1
        off += 1000
        if len(batch) < 1000:
            break

    active_total = sum(active_cats.values())
    unknown_active = active_cats.get("Unknown", 0) + active_cats.get("Other - Unclassified", 0)
    known_active = active_total - unknown_active
    remaining_spurious = [c for c in cats if c and c not in CANONICAL_TAXONOMY and c not in ("Unknown", "Other - Unclassified")]

    print(f"  Total funds: {total:,}")
    print(f"  Active funds: {active_total:,}")
    print(f"  Remaining active unknown: {unknown_active:,} ({unknown_active/active_total*100:.1f}%)")
    print(f"  Active with canonical category: {known_active:,} ({known_active/active_total*100:.1f}%)")
    print(f"  Canonical categories used: {len([c for c in cats if c in CANONICAL_TAXONOMY])}")
    print(f"  Spurious categories remaining: {len(remaining_spurious)}")

    unknown_ids = {c: cats[c] for c in cats if c not in CANONICAL_TAXONOMY and c not in ("Unknown", "Other - Unclassified")}
    if unknown_ids:
        print("\n  Unexpected categories remaining:")
        for c, cnt in sorted(unknown_ids.items(), key=lambda x: -x[1]):
            print(f"    '{c}': {cnt}")

    return cats, active_cats


# ============================================================================
# Main
# ============================================================================

def main():
    t_start = time.time()

    print("Step 1: original_category column")
    write_migration()
    if try_sql_direct():
        print("  Column added via direct SQL")
    else:
        print("  WARNING: Run migration manually")

    rows = load_all()
    updates, vc, mc, unmapped = process(rows)

    s1, e1 = upsert(updates, "fund_master")

    fm_updates = load_fm()
    if fm_updates:
        s2, e2 = upsert(fm_updates, "fund_metrics")
    else:
        s2, e2 = 0, 0

    cats, acats = verify()

    # Terminal totals (no unicode arrows)
    elapsed = time.time() - t_start
    print()
    print("=" * 60)
    print("  CATEGORY NORMALIZATION SUMMARY")
    print("=" * 60)
    print(f"  Rows processed:           {len(rows):>8,}")
    print(f"  Original variants:        {len(vc):>8}")
    print(f"  Canonical variants:       {len(mc):>8}")
    print(f"  Canonicalized (master):   {s1:>8,}")
    print(f"  Canonicalized (metrics):  {s2:>8,}")
    print(f"  Errors:                   {e1 + e2:>8}")
    print(f"  Active coverage:          {sum(acats.values()):,}")
    active_known = sum(v for k, v in acats.items() if k in CANONICAL_TAXONOMY)
    print(f"  Active with known cat:    {active_known:,}")
    active_total = sum(acats.values())
    print(f"  Coverage pct:             {active_known/active_total*100:.1f}%")
    print(f"  Time:                     {elapsed:>7.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()
