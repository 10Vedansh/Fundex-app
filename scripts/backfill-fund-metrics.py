#!/usr/bin/env python3
"""
backfill-fund-metrics.py

Matches fund_metrics rows with workbook_data from fund_cache by fund name,
and backfills category, amc, expense_ratio, net_assets, fund_manager,
launch_date, and other workbook-only fields.

Usage:
    python scripts/backfill-fund-metrics.py
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/backfill-fund-metrics.py
"""

import os
import sys
from datetime import datetime

# Load .env
def load_env(path=".env"):
    if not os.path.exists(path):
        return
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, val = line.split("=", 1)
            key = key.strip()
            val = val.strip().strip("\"'")
            os.environ.setdefault(key, val)

load_env()
supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not service_key:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.")
    sys.exit(1)

from supabase import create_client
import re


def normalize(name: str) -> str:
    """Normalize fund name for matching."""
    n = name.lower().strip()
    n = re.sub(r'\s+', ' ', n)
    n = n.replace(' - direct plan', '').replace(' - direct', '')
    n = n.replace('direct plan', '').replace('regular plan', '')
    n = n.replace(' - regular plan', '').replace(' - regular', '')
    n = n.replace('growth', '').replace(' - growth', '').replace('idcw', '')
    n = n.replace('option', '').replace(' - option', '')
    n = n.replace('payout', '').replace('reinvestment', '')
    n = n.strip()
    n = re.sub(r'\s+', ' ', n)
    return n


def main():
    supabase = create_client(supabase_url, service_key)

    print("Step 1: Fetch fund_metrics with missing fields...")
    resp = supabase.from_("fund_metrics") \
        .select("scheme_code, scheme_name") \
        .is_("category", "null") \
        .execute()
    metrics_rows = resp.data
    print(f"  {len(metrics_rows):,} fund_metrics rows need backfill")

    if not metrics_rows:
        print("  All rows already backfilled. Checking total coverage...")
        resp2 = supabase.from_("fund_metrics").select("scheme_code, category", count="exact").limit(1).execute()
        total = resp2.count
        resp3 = supabase.from_("fund_metrics").select("scheme_code").not_.is_("category", "null").execute()
        filled = len(resp3.data)
        print(f"  {filled:,}/{total:,} rows have category populated")
        if filled == total:
            print("  Nothing to do.")
            return

    print("Step 2: Load workbook_data from fund_cache...")
    resp = supabase.from_("fund_cache").select("data").eq("cache_key", "mf_data").single().execute()
    workbook_funds = resp.data["data"]
    print(f"  {len(workbook_funds):,} workbook funds loaded")

    # Build lookup: normalized name -> workbook fund
    lookup = {}
    for f in workbook_funds:
        key = normalize(f.get("name", ""))
        if key and len(key) > 5:
            lookup[key] = f

    print(f"  Lookup has {len(lookup)} unique normalized names")

    # Match and backfill
    matched = 0
    unmatched = 0
    batch = []
    batch_size = 200
    total_updated = 0

    for row in metrics_rows:
        name = normalize(row["scheme_name"])
        wf = lookup.get(name)

        if not wf:
            # Try partial match: remove everything after last space
            for attempt in range(3):
                parts = name.rsplit(" ", 1)
                if len(parts) == 2:
                    name = parts[0]
                    wf = lookup.get(name)
                    if wf:
                        break
                else:
                    break

        if not wf:
            unmatched += 1
            continue

        matched += 1

        # Map workbook fields to fund_metrics columns
        update = {
            "scheme_code": row["scheme_code"],
            "category": wf.get("category"),
            "amc": wf.get("amc"),
            "expense_ratio": wf.get("expenseRatio"),
            "net_assets": wf.get("netAssets") or wf.get("aum"),
            "fund_manager": wf.get("fundManager"),
            "turnover": wf.get("turnover"),
            "min_investment": wf.get("minInvestment"),
            "exit_load": wf.get("exitLoad"),
            "benchmark": wf.get("benchmark"),
            "beta": wf.get("beta"),
            "alpha": wf.get("alpha"),
            "std_dev": wf.get("stdDev"),
            "sortino_ratio": wf.get("sortinoRatio"),
        }
        # Convert None to None for Supabase (remove keys with None values)
        update = {k: v for k, v in update.items() if v is not None}
        batch.append(("fund_metrics", update, row["scheme_code"]))

        if len(batch) >= batch_size:
            upsert_batch = []
            for table, data, sc in batch:
                data["scheme_code"] = sc
                upsert_batch.append(data)
            supabase.table("fund_metrics").upsert(upsert_batch, on_conflict="scheme_code").execute()
            total_updated += len(upsert_batch)
            batch = []
            print(f"  ... {total_updated:,} updated, {matched:,} matched, {unmatched:,} unmatched")

    # Remaining batch
    if batch:
        upsert_batch = []
        for table, data, sc in batch:
            data["scheme_code"] = sc
            upsert_batch.append(data)
        supabase.table("fund_metrics").upsert(upsert_batch, on_conflict="scheme_code").execute()
        total_updated += len(upsert_batch)

    print()
    print("=" * 60)
    print("  BACKFILL SUMMARY")
    print("=" * 60)
    print(f"  fund_metrics rows:          {len(metrics_rows):>8,}")
    print(f"  Matched and updated:        {matched:>8,}")
    print(f"  Unmatched (no workbook):    {unmatched:>8,}")
    print(f"  Successfully upserted:      {total_updated:>8,}")
    print("=" * 60)


if __name__ == "__main__":
    main()
