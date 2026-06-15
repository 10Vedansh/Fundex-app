#!/usr/bin/env python3
"""
upload-fund-metrics.py

Reads fund_metrics.csv and upserts into the Supabase fund_metrics table.

Usage:
    python scripts/upload-fund-metrics.py fund_metrics.csv
    python scripts/upload-fund-metrics.py fund_metrics.csv --batch-size 2000

Environment:
    SUPABASE_URL        — Supabase project URL
    SUPABASE_SERVICE_ROLE_KEY — Service role key (bypasses RLS)
    If not set, reads from .env file in project root.
"""

import argparse
import csv
import os
import sys
import time
from datetime import datetime

BATCH_SIZE = 1000


def load_env(path=".env"):
    """Load variables from a .env file (VITE_ prefix stripped for SUPABASE vars)."""
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
            # Map VITE_SUPABASE_* -> SUPABASE_*
            if key.startswith("VITE_SUPABASE_"):
                os.environ.setdefault(key.replace("VITE_", ""), val)
            os.environ.setdefault(key, val)


def main():
    parser = argparse.ArgumentParser(
        description="Upload fund_metrics.csv to Supabase fund_metrics table")
    parser.add_argument("input_csv", default="fund_metrics.csv", nargs="?",
                        help="Path to fund_metrics.csv")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE,
                        help=f"Rows per upsert batch (default: {BATCH_SIZE})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate CSV without uploading")
    args = parser.parse_args()

    # Load credentials
    load_env()
    supabase_url = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url:
        print("ERROR: SUPABASE_URL not set. Add it to .env or export it.")
        sys.exit(1)

    if not service_key:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set.")
        print("  Get it from Supabase Dashboard > Settings > API > service_role key.")
        print("  Then: $env:SUPABASE_SERVICE_ROLE_KEY='your-key'")
        print("  Or add SUPABASE_SERVICE_ROLE_KEY= to .env")
        sys.exit(1)

    # Read CSV
    print(f"Reading {args.input_csv} ...")
    with open(args.input_csv, newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    print(f"  {len(rows):,} rows loaded")

    if not rows:
        print("No data to upload.")
        return

    fieldnames = list(rows[0].keys())
    print(f"  Columns ({len(fieldnames)}): {', '.join(fieldnames)}")

    if args.dry_run:
        print("\nDry-run: CSV validated, no upload attempted.")
        return

    # Connect to Supabase
    print(f"\nConnecting to {supabase_url} ...")
    try:
        from supabase import create_client, Client
    except ImportError:
        print("ERROR: supabase Python package not installed.")
        print("  pip install supabase")
        sys.exit(1)

    supabase: Client = create_client(supabase_url, service_key)

    # Verify table access
    try:
        resp = supabase.table("fund_metrics").select("scheme_code", count="exact").limit(1).execute()
        existing_count = getattr(resp, "count", None)
        if existing_count is not None:
            print(f"  Existing rows in fund_metrics: {existing_count:,}")
        else:
            print("  Table fund_metrics exists.")
    except Exception as e:
        print(f"WARNING: Could not verify table access: {e}")
        print("  Continuing anyway ...")

    # Upsert in batches
    total = len(rows)
    success = 0
    errors = 0
    start_time = time.time()

    numeric_cols = {
        "return_1m", "return_3m", "return_6m",
        "cagr_1y", "cagr_3y", "cagr_5y",
        "volatility_1y", "volatility_3y", "volatility_5y",
        "max_drawdown",
        "sharpe_ratio_1y", "sharpe_ratio_3y", "sharpe_ratio_5y",
        "sortino_ratio_1y", "sortino_ratio_3y", "sortino_ratio_5y",
        "consistency_score", "confidence_score", "recommendation_score",
        "total_data_points",
    }

    def clean_batch(batch):
        """Convert empty strings to None for numeric columns."""
        cleaned = []
        for row in batch:
            r = dict(row)
            for col in numeric_cols:
                if col in r and r[col] == "":
                    r[col] = None
            cleaned.append(r)
        return cleaned

    print(f"\nUploading {total:,} rows in batches of {args.batch_size} ...")

    for i in range(0, total, args.batch_size):
        batch = clean_batch(rows[i:i + args.batch_size])
        try:
            resp = supabase.table("fund_metrics").upsert(
                batch,
                on_conflict="scheme_code",
                ignore_duplicates=False,
            ).execute()
            success += len(batch)
        except Exception as e:
            print(f"  ERROR at batch {i // args.batch_size + 1}: {e}")
            errors += len(batch)

        if (i // args.batch_size + 1) % 10 == 0 or i + args.batch_size >= total:
            elapsed = time.time() - start_time
            rate = success / elapsed if elapsed > 0 else 0
            pct = (i + args.batch_size) / total * 100 if total else 0
            print(f"  {min(i + args.batch_size, total):,}/{total:,} ({pct:.0f}%) | "
                  f"{success:,} ok | {errors:,} err | {rate:.0f} rows/s")

    elapsed = time.time() - start_time
    print()
    print("=" * 60)
    print("  UPLOAD SUMMARY")
    print("=" * 60)
    print(f"  Total rows:        {total:>8,}")
    print(f"  Uploaded:          {success:>8,}")
    print(f"  Errors:            {errors:>8,}")
    print(f"  Time:              {elapsed:>8.1f}s")
    print(f"  Avg rate:          {success / elapsed:>8.0f} rows/s" if elapsed > 0 else "")
    print("=" * 60)


if __name__ == "__main__":
    main()
