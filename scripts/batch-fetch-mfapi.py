#!/usr/bin/env python3
"""
batch-fetch-mfapi.py — Fetch scheme metadata from mfapi.in for
all scheme_codes that still have empty names in fund_master.

Uses concurrent workers with rate limiting.

Usage:
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/batch-fetch-mfapi.py
"""

import os
import sys
import time
import json
import urllib.request
import ssl
from concurrent.futures import ThreadPoolExecutor, as_completed
from supabase import create_client

sup = create_client('https://skvvltawshbphrgnqjzf.supabase.co', os.environ['SUPABASE_SERVICE_ROLE_KEY'])

# Category normalization: mfapi.in -> CIFRAA
CATEGORY_MAP = {
    # Equity
    "equity scheme - large cap": "Equity - Large Cap",
    "equity scheme - mid cap": "Equity - Mid Cap",
    "equity scheme - small cap": "Equity - Small Cap",
    "equity scheme - elss": "Equity - ELSS",
    "equity scheme - focused fund": "Equity - Focused",
    "equity scheme - value fund": "Equity - Value",
    "equity scheme - contra fund": "Equity - Contra",
    "equity scheme - dividend yield": "Equity - Dividend Yield",
    "equity scheme - sectoral": "Equity - Sectoral - Thematic",
    "equity scheme - thematic": "Equity - Thematic",
    "equity scheme - flexi cap": "Equity - Flexi Cap",
    "equity scheme - large & mid cap": "Equity - Large & Mid Cap",
    "equity scheme - index": "Equity - Index",
    # Hybrid
    "hybrid scheme - aggressive hybrid fund": "Hybrid - Aggressive",
    "hybrid scheme - conservative hybrid fund": "Hybrid - Conservative",
    "hybrid scheme - balanced hybrid fund": "Hybrid - Balanced",
    "hybrid scheme - arbitrage fund": "Hybrid - Arbitrage",
    "hybrid scheme - equity savings": "Hybrid - Equity Savings",
    "hybrid scheme - multi asset allocation": "Hybrid - Multi Asset Allocation",
    "hybrid scheme - dynamic asset allocation": "Hybrid - Dynamic Asset Allocation",
    # Debt
    "debt scheme - liquid fund": "Debt - Liquid",
    "debt scheme - money market fund": "Debt - Money Market",
    "debt scheme - gilt fund": "Debt - Gilt",
    "debt scheme - banking and psu fund": "Debt - Banking and PSU",
    "debt scheme - corporate bond fund": "Debt - Corporate Bond",
    "debt scheme - credit risk fund": "Debt - Credit Risk",
    "debt scheme - dynamic bond": "Debt - Dynamic Bond",
    "debt scheme - short duration": "Debt - Short Duration",
    "debt scheme - medium duration": "Debt - Medium Duration",
    "debt scheme - long duration": "Debt - Long Duration",
    "debt scheme - low duration": "Debt - Low Duration",
    "debt scheme - ultra short duration": "Debt - Ultra Short Duration",
    "debt scheme - floater": "Debt - Floater",
    "debt scheme - overnight": "Debt - Overnight",
    "debt scheme - 10 yr constant maturity": "Debt - 10 Year Constant Maturity",
    # Commodity
    "commodity scheme - gold etf": "Commodity - Gold",
    "commodity scheme - silver etf": "Commodity - Gold",
    # Other
    "other scheme - fund of funds": "Other - Fund of Funds",
    "other scheme - index": "Other - Index",
    "other scheme - etf": "Other - ETF",
    # Legacy categories from mfapi.in
    "income": "Debt - Income",
    "growth": "Equity - Growth",
    "equity": "Equity - General",
    "liquid": "Debt - Liquid",
    "balanced": "Hybrid - Balanced",
    "index": "Other - Index",
    "etf": "Other - ETF",
}

def normalize_category(cat: str) -> str:
    if not cat:
        return ""
    cl = cat.strip().lower()
    return CATEGORY_MAP.get(cl, cat.strip())

MAX_WORKERS = 8
ctx = ssl._create_unverified_context()

def fetch_scheme(sc: str):
    """Fetch single scheme from mfapi.in, return (sc, name, fund_house, category) or None."""
    url = f'http://api.mfapi.in/mf/{sc}'
    for attempt in range(2):
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
                data = json.loads(resp.read())
                meta = data.get('meta', {})
                return (
                    sc,
                    meta.get('scheme_name', ''),
                    meta.get('fund_house', ''),
                    meta.get('scheme_category', ''),
                )
        except Exception:
            if attempt == 0:
                time.sleep(1)
            else:
                return (sc, None, None, None)


def main():
    t_start = time.time()

    # Load all empty-name scheme codes
    print("Loading empty-name scheme codes from fund_master ...")
    all_codes = []
    offset = 0
    limit = 1000
    while True:
        resp = sup.from_("fund_master").select("scheme_code").eq("scheme_name", "").range(offset, offset + limit - 1).execute()
        batch = [r["scheme_code"] for r in resp.data]
        if not batch:
            break
        all_codes.extend(batch)
        offset += limit
        if len(batch) < limit:
            break
        if len(all_codes) % 2000 == 0:
            print(f"    ... {len(all_codes):,} codes loaded", flush=True)

    print(f"\n  Total codes to fetch: {len(all_codes):,}")

    # Fetch concurrently
    fetched = 0
    failed = 0
    updates = []

    print(f"Fetching with {MAX_WORKERS} concurrent workers ...")
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(fetch_scheme, sc): sc for sc in all_codes}
        for i, future in enumerate(as_completed(futures), 1):
            result = future.result()
            if result and result[1]:
                sc, name, fund_house, category = result
                cat_norm = normalize_category(category)
                updates.append({
                    "scheme_code": sc,
                    "scheme_name": name,
                    "amc": fund_house,
                    "category": cat_norm,
                })
                fetched += 1
            else:
                failed += 1

            if i % 200 == 0 or i == len(all_codes):
                elapsed = time.time() - t_start
                rate = i / elapsed if elapsed > 0 else 0
                print(f"    {i}/{len(all_codes)} ({i/len(all_codes)*100:.0f}%) | {fetched} ok | {failed} fail | {rate:.0f}/s | {elapsed:.0f}s", flush=True)

    print(f"\nFetched {fetched:,} names, {failed:,} failed in {time.time()-t_start:.1f}s")

    # Upsert into fund_master
    if updates:
        print(f"\nUpserting {len(updates):,} rows into fund_master ...")
        total = len(updates)
        success = 0
        errors = 0
        t0 = time.time()
        for i in range(0, total, 500):
            batch = updates[i:i + 500]
            try:
                sup.table("fund_master").upsert(batch, on_conflict="scheme_code").execute()
                success += len(batch)
            except Exception as e:
                errors += len(batch)
                if errors <= 500:
                    print(f"      upsert err: {str(e)[:200]}", flush=True)
            if (i // 500 + 1) % 10 == 0 or i + 500 >= total:
                print(f"    {min(i+500, total):,}/{total:,} | {success:,} ok | {errors:,} err | {time.time()-t0:.1f}s")

        # Also upsert into fund_metrics
        print(f"\nUpserting {len(updates):,} rows into fund_metrics ...")
        t0 = time.time()
        success2 = 0
        errors2 = 0
        for i in range(0, total, 500):
            batch = updates[i:i + 500]
            try:
                sup.table("fund_metrics").upsert(batch, on_conflict="scheme_code").execute()
                success2 += len(batch)
            except Exception as e:
                errors2 += len(batch)
                if errors2 <= 500:
                    print(f"      upsert err: {str(e)[:200]}", flush=True)
            if (i // 500 + 1) % 10 == 0 or i + 500 >= total:
                print(f"    {min(i+500, total):,}/{total:,} | {success2:,} ok | {errors2:,} err | {time.time()-t0:.1f}s")

    elapsed = time.time() - t_start
    print(f"\n{'='*60}")
    print(f"  BATCH FETCH SUMMARY")
    print(f"{'='*60}")
    print(f"  Codes processed:           {len(all_codes):>8,}")
    print(f"  Fetched successfully:      {fetched:>8,}")
    print(f"  Failed:                    {failed:>8,}")
    print(f"  Upserted (master):         {len(updates) if updates else 0:>8,}")
    print(f"  Total time:                {elapsed:>7.1f}s")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
