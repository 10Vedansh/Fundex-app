#!/usr/bin/env python3
"""
backfill-metadata.py — Phase 5.2: Backfill category, AMC, and scheme_name
from AMFI NAVAll.txt and scheme name heuristics.

Pipeline:
  1. Download AMFI NAVAll.txt -> scheme_code ↔ scheme_name mapping
  2. Parse scheme names -> extract AMC (heuristic)
  3. Infer category from scheme name keywords
  4. Load existing fund_master rows from Supabase
  5. Merge backfill data
  6. Upsert fund_master and fund_metrics

Usage:
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/backfill-metadata.py
"""

import os
import re
import sys
import time
import urllib.request
import ssl
from datetime import datetime, timezone

AMFI_NAV_URL = "https://www.amfiindia.com/spages/NAVAll.txt"

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------

def load_env(path=".env"):
    if os.path.exists(path):
        with open(path) as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip("\"'"))

load_env()
supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
if not supabase_url or not service_key:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.")
    sys.exit(1)
from supabase import create_client
sup = create_client(supabase_url, service_key)

# ---------------------------------------------------------------------------
# AMC extraction — known AMC names (longest-first for greedy matching)
# ---------------------------------------------------------------------------

AMC_LIST = sorted([
    "360 ONE", "Aditya Birla Sun Life", "Axis", "Baroda BNP Paribas",
    "Bank of India", "Canara Robeco", "DSP", "Edelweiss", "Franklin Templeton",
    "Groww", "HDFC", "HSBC", "ICICI Prudential", "IDBI", "IIFL",
    "Indiabulls", "Invesco", "ITI", "JM Financial", "Kotak Mahindra",
    "LIC", "Mahindra Manulife", "Mirae Asset", "Motilal Oswal",
    "Navi", "NJ", "Nippon India", "PGIM India", "PPFAS",
    "Principal", "Quantum", "SBI", "Shriram", "Sundaram",
    "Tata", "Taurus", "Trust", "Union", "UTI", "WhiteOak Capital",
    "Zerodha", "Old Bridge", "Samco", "Bajaj Finserv", "Helios",
    "YES", "ABSL", "BOI", "BNP Paribas",
], key=len, reverse=True)

def extract_amc(scheme_name: str) -> str:
    if not scheme_name:
        return ""
    name = scheme_name.strip()
    # Try known AMC list first
    for amc in AMC_LIST:
        if name.lower().startswith(amc.lower()):
            return amc
    # Heuristic: first 1-3 tokens before known fund-type keyword
    tokens = name.split()
    amc_tokens = []
    fund_keywords = {"fund", "scheme", "plan", "etf", "index", "foF", "series"}
    for t in tokens:
        tl = t.lower().strip("-,")
        if tl in fund_keywords:
            break
        amc_tokens.append(t)
        if len(amc_tokens) >= 3:
            break
    return " ".join(amc_tokens) if amc_tokens else tokens[0] if tokens else ""

# ---------------------------------------------------------------------------
# Category inference from scheme name keywords
# ---------------------------------------------------------------------------

CATEGORY_KEYWORDS = [
    # Equity - Large Cap
    (r'\b(bluechip|blue chip|large[-\s]?cap|top 100|top100|top 200|nifty 50|sensex|cnx 100|bse 100|bse100)\b', "Equity - Large Cap"),
    (r'\b(large[-\s]?cap|100)\b', "Equity - Large Cap"),

    # Equity - Mid Cap
    (r'\b(mid[-\s]?cap|midcap|mid cap|mid-cap|next 100|bse mid)\b', "Equity - Mid Cap"),

    # Equity - Small Cap
    (r'\b(small[-\s]?cap|smallcap|small cap|small-cap|bse small)\b', "Equity - Small Cap"),

    # Equity - ELSS
    (r'\b(elss|tax[-\s]?saver|tax saver|taxsaver|tax[-\s]?saving)\b', "Equity - ELSS"),

    # Equity - Focused
    (r'\b(focused|focus|concentrated|emphasis)\b', "Equity - Focused"),

    # Equity - Value
    (r'\b(value|contrarian)\b', "Equity - Value"),

    # Equity - Contra
    (r'\b(contra)\b', "Equity - Contra"),

    # Equity - Dividend Yield
    (r'\b(dividend yield|dividend[-\s]?yield)\b', "Equity - Dividend Yield"),

    # Equity - Sectoral / Thematic
    (r'\b(infrastructure|infra)\b', "Equity - Sectoral - Infrastructure"),
    (r'\b(banking|financial|psu bank|banking)\b', "Equity - Sectoral - Banking"),
    (r'\b(consumption|consumer)\b', "Equity - Sectoral - Consumption"),
    (r'\b(pharma|healthcare|health|medical)\b', "Equity - Sectoral - Pharma"),
    (r'\b(technology|tech[-\s]?it|it[-\s]?fund|digital)\b', "Equity - Sectoral - Technology"),
    (r'\b(energy|power)\b', "Equity - Sectoral - Energy"),
    (r'\b(fmcg)\b', "Equity - Sectoral - FMCG"),
    (r'\b(psu)\b', "Equity - Sectoral - PSU"),
    (r'\b(manufacturing|make india)\b', "Equity - Sectoral - Manufacturing"),
    (r'\b(real[-\s]?estate|property)\b', "Equity - Sectoral - Real Estate"),
    (r'\b(mnc)\b', "Equity - Sectoral - MNC"),
    (r'\b(sectoral|thematic)\b', "Equity - Thematic"),

    # Equity - Flexi Cap
    (r'\b(flexi[-\s]?cap|flexicap|multi[-\s]?cap|multicap)\b', "Equity - Flexi Cap"),

    # Equity - Index / ETF
    (r'\b(index|etf)\b', "Equity - Index"),

    # Hybrid - Aggressive
    (r'\b(aggressive[-\s]?hybrid|hybrid[-\s]?aggressive|balanced[-\s]?advantage)\b', "Hybrid - Aggressive"),

    # Hybrid - Conservative
    (r'\b(conservative[-\s]?hybrid|hybrid[-\s]?conservative)\b', "Hybrid - Conservative"),

    # Hybrid - Balanced
    (r'\b(balanced|hybrid)\b(?!.*(aggressive|conservative))', "Hybrid - Balanced"),

    # Hybrid - Arbitrage
    (r'\b(arbitrage)\b', "Hybrid - Arbitrage"),

    # Hybrid - Equity Savings
    (r'\b(equity[-\s]?savings?|savings?[-\s]?fund)\b', "Hybrid - Equity Savings"),

    # Hybrid - Multi Asset
    (r'\b(multi[-\s]?asset|multiasset|asset[-\s]?allocation)\b', "Hybrid - Multi Asset Allocation"),

    # Hybrid - Dynamic Asset Allocation
    (r'\b(dynamic[-\s]?asset|dynamic[-\s]?allocation)\b', "Hybrid - Dynamic Asset Allocation"),

    # Debt - Liquid
    (r'\b(liquid)\b', "Debt - Liquid"),

    # Debt - Money Market
    (r'\b(money[-\s]?market|moneymarket)\b', "Debt - Money Market"),

    # Debt - Gilt
    (r'\b(gilt|government[-\s]?security|govt[-\s]?bond|treasury)\b', "Debt - Gilt"),

    # Debt - Banking & PSU
    (r'\b(banking[-\s]?and[-\s]?psu|banking\s+&\s+psu|psu\s+bond)\b', "Debt - Banking and PSU"),

    # Debt - Corporate Bond
    (r'\b(corporate[-\s]?bond|corpbond|corporate bond)\b', "Debt - Corporate Bond"),

    # Debt - Credit Risk
    (r'\b(credit[-\s]?risk|credit[-\s]?opportunity)\b', "Debt - Credit Risk"),

    # Debt - Dynamic Bond
    (r'\b(dynamic[-\s]?bond|dynamic bond|bond[-\s]?fund)\b', "Debt - Dynamic Bond"),

    # Debt - Short Duration
    (r'\b(short[-\s]?duration|short[-\s]?term|shortterm)\b', "Debt - Short Duration"),

    # Debt - Medium Duration
    (r'\b(medium[-\s]?duration|medium[-\s]?term|mediumterm)\b', "Debt - Medium Duration"),

    # Debt - Long Duration
    (r'\b(long[-\s]?duration|long[-\s]?term|longterm)\b', "Debt - Long Duration"),

    # Debt - Low Duration
    (r'\b(low[-\s]?duration|low[-\s]?term|lowterm)\b', "Debt - Low Duration"),

    # Debt - Ultra Short Duration
    (r'\b(ultra[-\s]?short|ultrashort)\b', "Debt - Ultra Short Duration"),

    # Debt - Floater
    (r'\b(floater|floating[-\s]?rate|floating[-\s]?rate)\b', "Debt - Floater"),

    # Debt - Overnight
    (r'\b(overnight|over[-\s]?night)\b', "Debt - Overnight"),

    # Debt - 10 Year
    (r'\b(10[-\s]?year|10yr|ten[-\s]?year)\b', "Debt - 10 Year Constant Maturity"),

    # Gold / Commodity
    (r'\b(gold|silver|commodity|precious[-\s]?metal)\b', "Commodity - Gold"),

    # FOF (Fund of Funds)
    (r'\b(fof|fund[-\s]?of[-\s]?fund|feeder)\b', "Other - Fund of Funds"),

    # International / Overseas
    (r'\b(international|overseas|global|world|foreign|us[-\s]?equity|europe|china|japan|nasdaq|dow\s?jones|s&p)\b', "Other - International"),
]


def infer_category(scheme_name: str) -> str:
    if not scheme_name:
        return ""
    name_lower = scheme_name.lower()

    # Skip suffixes like Plan, Growth, IDCW, Payout etc.
    for pattern, cat in CATEGORY_KEYWORDS:
        if re.search(pattern, name_lower):
            return cat
    return ""


# ---------------------------------------------------------------------------
# Step 1: Download AMFI NAVAll.txt
# ---------------------------------------------------------------------------

def download_amfi_nav(url: str) -> dict:
    """Download AMFI NAVAll.txt and parse into {scheme_code: scheme_name}."""
    print(f"Downloading {url} ...", flush=True)
    ctx = ssl._create_unverified_context()
    req = urllib.request.Request(url)
    t0 = time.time()
    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        text = resp.read().decode("utf-8", errors="replace")
    print(f"  Downloaded {len(text):,} bytes in {time.time()-t0:.1f}s", flush=True)

    scheme_map = {}
    lines = text.splitlines()
    parsed = 0
    for line in lines:
        trimmed = line.strip()
        if not trimmed or "Scheme Code" == trimmed or ";" not in trimmed:
            continue
        parts = trimmed.split(";")
        if len(parts) >= 6:
            sc = parts[0].strip()
            sn = parts[3].strip()
            nav_str = parts[4].strip()
            if not sc or not sn or not nav_str or nav_str in ("N.A.", "-"):
                continue
            # Validate NAV is numeric and scheme_code is numeric
            try:
                float(nav_str)
                int(sc)
            except ValueError:
                continue
            if sc not in scheme_map:
                scheme_map[sc] = sn
                parsed += 1

    print(f"  Parsed {parsed:,} unique scheme_code -> name mappings", flush=True)
    return scheme_map


# ---------------------------------------------------------------------------
# Step 2: Load existing fund_master rows
# ---------------------------------------------------------------------------

def load_fund_master():
    print("Loading fund_master (paged) ...", flush=True)
    rows = []
    offset = 0
    limit = 1000
    t0 = time.time()
    while True:
        resp = sup.from_("fund_master").select("*").range(offset, offset + limit - 1).execute()
        batch = resp.data
        if not batch:
            break
        rows.extend(batch)
        offset += limit
        if len(batch) < limit:
            break
        if offset % 5000 == 0:
            print(f"    ... {offset:,} loaded ({time.time()-t0:.1f}s)", flush=True)
    print(f"  Loaded {len(rows):,} rows in {time.time()-t0:.1f}s", flush=True)
    return rows


# ---------------------------------------------------------------------------
# Step 3: Backfill — merge AMFI names, extract AMC & category
# ---------------------------------------------------------------------------

def backfill(fm_rows: list, amfi_map: dict):
    """Backfill scheme_name, amc, category for fund_master rows."""
    updates = []
    stats = {"empty_name_filled": 0, "amc_extracted": 0, "category_inferred": 0,
             "had_name": 0, "had_amc": 0, "had_category": 0,
             "name_still_empty": 0, "amc_still_empty": 0, "cat_still_empty": 0}

    for row in fm_rows:
        sc = row["scheme_code"]
        orig_name = (row.get("scheme_name") or "").strip()
        orig_amc = (row.get("amc") or "").strip()
        orig_cat = (row.get("category") or "").strip()

        new_name = orig_name
        new_amc = orig_amc
        new_cat = orig_cat

        # Fill scheme_name if empty
        if not new_name and sc in amfi_map:
            new_name = amfi_map[sc]
            stats["empty_name_filled"] += 1
        elif new_name:
            stats["had_name"] += 1
        else:
            stats["name_still_empty"] += 1

        # Extract AMC if empty and we have a name
        if not new_amc and new_name:
            extracted = extract_amc(new_name)
            if extracted:
                new_amc = extracted
                stats["amc_extracted"] += 1
        elif new_amc:
            stats["had_amc"] += 1
        else:
            stats["amc_still_empty"] += 1

        # Infer category if empty and we have a name
        if not new_cat and new_name:
            inferred = infer_category(new_name)
            if inferred:
                new_cat = inferred
                stats["category_inferred"] += 1
        elif new_cat:
            stats["had_category"] += 1
        else:
            stats["cat_still_empty"] += 1

        # Only update if something changed
        if (new_name != orig_name or new_amc != orig_amc or new_cat != orig_cat):
            updates.append({
                "scheme_code": sc,
                "scheme_name": new_name,
                "amc": new_amc,
                "category": new_cat,
            })

    print(f"  Backfill stats:")
    for k, v in stats.items():
        print(f"    {k}: {v}")
    print(f"  Rows needing update: {len(updates):,}")
    return updates


# ---------------------------------------------------------------------------
# Step 4: Upsert into fund_master
# ---------------------------------------------------------------------------

def upsert_batch(rows, table="fund_master", batch_size=500):
    total = len(rows)
    success = 0
    errors = 0
    t0 = time.time()
    print(f"Upserting {total:,} rows into {table} ...", flush=True)

    for i in range(0, total, batch_size):
        batch = rows[i:i + batch_size]
        try:
            sup.table(table).upsert(batch, on_conflict="scheme_code").execute()
            success += len(batch)
        except Exception as e:
            errors += len(batch)
            if errors <= len(batch):
                print(f"      upsert err [{len(batch)} rows]: {str(e)[:200]}", flush=True)

        if (i // batch_size + 1) % 10 == 0 or i + batch_size >= total:
            pct = min((i + batch_size) / total * 100, 100)
            print(f"    {min(i+batch_size, total):,}/{total:,} ({pct:.0f}%) | {success:,} ok | {errors:,} err | {time.time()-t0:.1f}s")

    return success, errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    t_start = time.time()

    # Step 1: Download AMFI data
    amfi_map = download_amfi_nav(AMFI_NAV_URL)
    print(f"  AMFI schemes available: {len(amfi_map):,}\n")

    # Step 2: Load fund_master
    fm_rows = load_fund_master()

    # Step 3: Backfill
    updates = backfill(fm_rows, amfi_map)

    # Step 4: Upsert into fund_master
    if updates:
        success, errors = upsert_batch(updates, "fund_master")
    else:
        print("No updates needed.")
        success, errors = 0, 0

    # Also backfill fund_metrics with scheme_name, amc, category
    print("\n--- fund_metrics backfill ---")
    fm_updates = []
    for u in updates:
        fm_updates.append({
            "scheme_code": u["scheme_code"],
            "scheme_name": u["scheme_name"],
            "amc": u["amc"],
            "category": u["category"],
        })
    if fm_updates:
        success2, errors2 = upsert_batch(fm_updates, "fund_metrics")
    else:
        success2, errors2 = 0, 0

    elapsed = time.time() - t_start
    print(f"\n{'='*60}")
    print(f"  PHASE 5.2 BACKFILL SUMMARY")
    print(f"{'='*60}")
    print(f"  AMFI names available:      {len(amfi_map):>8,}")
    print(f"  fund_master rows:           {len(fm_rows):>8,}")
    print(f"  Rows updated (master):      {success:>8,}")
    print(f"  Rows updated (metrics):     {success2:>8,}")
    print(f"  Errors (master):            {errors:>8,}")
    print(f"  Errors (metrics):           {errors2:>8,}")
    print(f"  Time:                       {elapsed:>7.1f}s")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
