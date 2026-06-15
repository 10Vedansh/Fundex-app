#!/usr/bin/env python3
"""
build-fund-master.py — Phase 1: Build fund_master mapping table.

Pipeline:
  1. Parse local AMFI NAVAll.txt → scheme_code ↔ name mapping
  2. Load workbook funds from Supabase fund_cache
  3. Load fund_metrics from Supabase
  4. Match using 4-tier strategy
  5. Upsert into fund_master

Usage:
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/build-fund-master.py
    python scripts/build-fund-master.py  # reads .env
"""

import os
import re
import sys
import time
from datetime import datetime, timezone
import rapidfuzz

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
supabase = create_client(supabase_url, service_key)

AMFI_CACHE = "amfi_nav.txt"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize(name: str) -> str:
    n = name.lower().strip()
    n = re.sub(r'\s*-\s*direct\s*plan\s*', '', n)
    n = re.sub(r'\s*-\s*direct\s*', '', n)
    n = re.sub(r'\s*direct\s*plan\s*', '', n)
    n = re.sub(r'\s*-\s*regular\s*plan\s*', '', n)
    n = re.sub(r'\s*-\s*regular\s*', '', n)
    n = re.sub(r'\s*regular\s*plan\s*', '', n)
    n = re.sub(r'\s*-\s*growth\s*', '', n)
    n = re.sub(r'\s*growth\s*option\s*', '', n)
    n = re.sub(r'\s*growth\s*', '', n)
    n = re.sub(r'\s*idcw\s*option\s*', '', n)
    n = re.sub(r'\s*-\s*idcw\s*', '', n)
    n = re.sub(r'\s*payout\s*', '', n)
    n = re.sub(r'\s*reinvestment\s*', '', n)
    n = re.sub(r'\s*-\s*e\s*', '', n)
    n = re.sub(r'\s*-\s*ii\s*', '', n)
    n = re.sub(r'\s*-\s*iii\s*', '', n)
    n = re.sub(r'\s*-\s*iv\s*', '', n)
    n = re.sub(r'\s+', ' ', n)
    return n.strip()


def similarity(a: str, b: str) -> float:
    return rapidfuzz.fuzz.ratio(a, b) / 100.0


# ---------------------------------------------------------------------------
# Phase 1: Parse cached AMFI NAV data
# ---------------------------------------------------------------------------

def parse_amfi_data():
    print("Phase 1: Parsing AMFI NAV data ...")
    name_map = {}
    code_map = {}
    count = 0

    if not os.path.exists(AMFI_CACHE):
        print(f"  ERROR: {AMFI_CACHE} not found. Run download first.")
        return name_map, code_map

    with open(AMFI_CACHE, "r", encoding="utf-8") as f:
        for line in f:
            trimmed = line.strip()
            if not trimmed or "Scheme Code;" in trimmed or ";" not in trimmed:
                continue
            parts = trimmed.split(";")
            if len(parts) >= 6:
                sc = parts[0].strip()
                sn = parts[3].strip()
                nav_str = parts[4].strip()
                if not sc or not sn or not nav_str or nav_str in ("N.A.", "-"):
                    continue
                try:
                    float(nav_str)
                except ValueError:
                    continue
                norm = normalize(sn)
                name_map[norm] = {"scheme_code": sc, "scheme_name": sn}
                if sc not in code_map:
                    code_map[sc] = {"scheme_name": sn, "normalized_name": norm}
                count += 1

    print(f"  Parsed {count:,} entries ({len(name_map):,} unique names, {len(code_map):,} unique codes)")
    return name_map, code_map


# ---------------------------------------------------------------------------
# Phase 2: Load Supabase data
# ---------------------------------------------------------------------------

def load_workbook_funds():
    print("Phase 2.1: Loading workbook funds ...")
    resp = supabase.from_("fund_cache").select("data").eq("cache_key", "workbook_data").single().execute()
    if resp.data and resp.data.get("data"):
        funds = resp.data["data"]
    else:
        resp = supabase.from_("fund_cache").select("data").eq("cache_key", "mf_data").single().execute()
        funds = resp.data["data"]
    print(f"  Loaded {len(funds):,} workbook funds")
    return funds


def load_fund_metrics():
    print("Phase 2.2: Loading fund_metrics (paged) ...", flush=True)
    all_rows = []
    offset = 0
    limit = 1000  # Supabase API max per request
    t0 = time.time()
    while True:
        resp = supabase.from_("fund_metrics").select("*").range(offset, offset + limit - 1).execute()
        batch = resp.data
        if not batch:
            break
        all_rows.extend(batch)
        offset += limit
        if len(batch) < limit:
            break
        if offset % 5000 == 0:
            print(f"    ... {offset:,} rows loaded ({time.time()-t0:.1f}s)", flush=True)

    metrics = {r["scheme_code"]: r for r in all_rows}
    print(f"  Loaded {len(metrics):,} fund_metrics rows in {time.time()-t0:.1f}s", flush=True)
    return metrics


# ---------------------------------------------------------------------------
# Phase 3: Matching
# ---------------------------------------------------------------------------

def match_funds(workbook_funds, amfi_name_map, code_map, fund_metrics):
    print("Phase 3: Matching funds ...")
    results = []
    matched_codes = set()
    stats = {"exact": 0, "normalized": 0, "fuzzy": 0, "amc_fuzzy": 0, "unmatched": 0}

    for idx, fund in enumerate(workbook_funds):
        wb_name = fund.get("name", "") or ""
        wb_id = fund.get("id", "") or ""
        wb_amc = (fund.get("amc", "") or "").strip()
        norm = normalize(wb_name)

        match = None
        method = None
        confidence = None

        # Tier 1: Exact
        if norm in amfi_name_map:
            match = amfi_name_map[norm]
            method = "exact"
            confidence = "high"

        # Tier 2: Normalized (try shorter prefix)
        if not match:
            tokens = norm.split()
            for end in range(len(tokens), 0, -1):
                candidate = " ".join(tokens[:end])
                if candidate in amfi_name_map:
                    match = amfi_name_map[candidate]
                    method = "normalized"
                    confidence = "high"
                    break

        # Tier 3: Fuzzy
        if not match:
            best_score = 0.85
            best_match = None
            for amfi_norm, entry in amfi_name_map.items():
                score = similarity(norm, amfi_norm)
                if score > best_score:
                    best_score = score
                    best_match = entry
            if best_match:
                match = best_match
                method = "fuzzy"
                confidence = "medium"

        # Tier 4: AMC-assisted fuzzy
        if not match and wb_amc:
            best_score = 0.78
            best_match = None
            for amfi_norm, entry in amfi_name_map.items():
                sc = entry["scheme_code"]
                fm = fund_metrics.get(sc, {})
                amfi_amc = (fm.get("amc") or "").strip().lower()
                if amfi_amc and amfi_amc == wb_amc.lower():
                    score = similarity(norm, amfi_norm)
                    if score > best_score:
                        best_score = score
                        best_match = entry
            if best_match:
                match = best_match
                method = "amc_fuzzy"
                confidence = "low"

        if match:
            sc = match["scheme_code"]
            sc_name = match["scheme_name"]
            fm = fund_metrics.get(sc, {})
            matched_codes.add(sc)
            stats[method] += 1

            results.append({
                "scheme_code": sc,
                "scheme_name": sc_name,
                "normalized_scheme_name": normalize(sc_name),
                "amc": wb_amc or fm.get("amc"),
                "category": fund.get("category") or fm.get("category"),
                "workbook_id": wb_id,
                "workbook_name": wb_name,
                "match_confidence": confidence,
                "match_method": method,
                "expense_ratio": fund.get("expenseRatio") or fm.get("expense_ratio"),
                "aum": fund.get("netAssets") or fund.get("aum") or fm.get("net_assets"),
                "fund_manager": fund.get("fundManager"),
                "launch_date": fund.get("launch") or fm.get("launch_date"),
                "beta": fund.get("beta") or fm.get("beta"),
                "alpha": fund.get("alpha") or fm.get("alpha"),
                "std_dev": fund.get("stdDev") or fm.get("std_dev"),
                "is_active": bool(fm.get("last_nav_date")),
                "last_nav_date": fm.get("last_nav_date"),
                "total_data_points": fm.get("total_data_points"),
                "first_nav_date": fm.get("first_nav_date"),
                "matched_at": datetime.now(timezone.utc).isoformat(),
            })
        else:
            stats["unmatched"] += 1
            results.append({
                "scheme_code": f"unmatched_{wb_id}",
                "scheme_name": wb_name,
                "normalized_scheme_name": norm,
                "amc": wb_amc,
                "category": fund.get("category"),
                "workbook_id": wb_id,
                "workbook_name": wb_name,
                "match_confidence": None,
                "match_method": "unmatched",
                "expense_ratio": fund.get("expenseRatio"),
                "aum": fund.get("netAssets") or fund.get("aum"),
                "fund_manager": fund.get("fundManager"),
                "launch_date": fund.get("launch"),
                "beta": fund.get("beta"),
                "alpha": fund.get("alpha"),
                "std_dev": fund.get("stdDev"),
                "is_active": False,
                "last_nav_date": None,
                "total_data_points": None,
                "first_nav_date": None,
                "matched_at": None,
            })

        if (idx + 1) % 200 == 0:
            matched_so_far = sum(stats.get(k, 0) for k in ("exact", "normalized", "fuzzy", "amc_fuzzy"))
            print(f"    ... {idx+1}/{len(workbook_funds)} funds processed, {matched_so_far} matched")

    return results, stats, matched_codes


# ---------------------------------------------------------------------------
# Phase 4: Unmatched fund_metrics
# ---------------------------------------------------------------------------

def find_unmatched_metrics(fund_metrics, matched_codes):
    print("Phase 4: Finding unmatched fund_metrics ...")
    unmatched = []
    for sc, fm in fund_metrics.items():
        if sc not in matched_codes:
            unmatched.append({
                "scheme_code": sc,
                "scheme_name": fm.get("scheme_name", ""),
                "normalized_scheme_name": "",
                "amc": fm.get("amc"),
                "category": fm.get("category"),
                "workbook_id": None,
                "workbook_name": None,
                "match_confidence": None,
                "match_method": "metrics_only",
                "expense_ratio": fm.get("expense_ratio"),
                "aum": fm.get("net_assets"),
                "fund_manager": None,
                "launch_date": fm.get("launch_date"),
                "beta": fm.get("beta"),
                "alpha": fm.get("alpha"),
                "std_dev": fm.get("std_dev"),
                "is_active": bool(fm.get("last_nav_date")),
                "last_nav_date": fm.get("last_nav_date"),
                "total_data_points": fm.get("total_data_points"),
                "first_nav_date": fm.get("first_nav_date"),
                "matched_at": None,
            })
    print(f"  {len(unmatched):,} unmatched fund_metrics schemes")
    return unmatched


# ---------------------------------------------------------------------------
# Phase 5: Upsert
# ---------------------------------------------------------------------------

def upsert_batch(rows, batch_size=500, first_err_only=True):
    total = len(rows)
    success = 0
    errors = 0
    printed_first_err = False
    print(f"\nPhase 5: Upserting {total:,} rows into fund_master ...")
    t0 = time.time()

    for i in range(0, total, batch_size):
        batch = rows[i:i + batch_size]
        valid = [r for r in batch if not r["scheme_code"].startswith("unmatched_")]
        if valid:
            try:
                supabase.table("fund_master").upsert(valid, on_conflict="scheme_code").execute()
                success += len(valid)
            except Exception as e:
                errors += len(valid)
                if not printed_first_err:
                    printed_first_err = True
                    print(f"      upsert err [{len(valid)} rows]: {str(e)[:300]}", flush=True)
                    if valid:
                        print(f"      failing row: sc={valid[0]['scheme_code']} method={valid[0]['match_method']} confidence={valid[0]['match_confidence']}", flush=True)

        if (i // batch_size + 1) % 10 == 0 or i + batch_size >= total:
            pct = min((i + batch_size) / total * 100, 100)
            print(f"    {min(i + batch_size, total):,}/{total:,} ({pct:.0f}%) | {success:,} ok | {errors:,} err | {time.time()-t0:.1f}s")

    return success, errors


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    t_start = time.time()

    amfi_name_map, code_map = parse_amfi_data()

    workbook_funds = load_workbook_funds()
    fund_metrics = load_fund_metrics()

    matched_rows, stats, matched_codes = match_funds(workbook_funds, amfi_name_map, code_map, fund_metrics)
    unmatched_metrics = find_unmatched_metrics(fund_metrics, matched_codes)

    # Deduplicate matched_rows by scheme_code (keep first/highest quality match)
    seen_codes = set()
    deduped = []
    for r in matched_rows:
        sc = r["scheme_code"]
        if sc.startswith("unmatched_"):
            deduped.append(r)  # keep unmatched workbook entries
        elif sc not in seen_codes:
            seen_codes.add(sc)
            deduped.append(r)
    print(f"  Deduplicated matched_rows: {len(matched_rows)} -> {len(deduped)}")
    
    # Upsert unmatched_metrics first, then matched_rows on top
    # (matched_rows have higher-quality match_method, match_confidence)
    _, _ = upsert_batch(unmatched_metrics)
    success, errors = upsert_batch(deduped)

    total_matched = sum(stats.get(k, 0) for k in ("exact", "normalized", "fuzzy", "amc_fuzzy"))
    elapsed = time.time() - t_start

    print()
    s = "-" * 58
    print(s)
    print("  FUND MASTER BUILD SUMMARY")
    print(s)
    print(f"  AMFI entries parsed:        {len(amfi_name_map):>8,}")
    print(f"  Workbook funds:             {len(workbook_funds):>8,}")
    print(f"  Fund metrics rows:          {len(fund_metrics):>8,}")
    print(f"  {'-' * 45}")
    print(f"  Matched (exact):            {stats['exact']:>8,}")
    print(f"  Matched (normalized):       {stats['normalized']:>8,}")
    print(f"  Matched (fuzzy):            {stats['fuzzy']:>8,}")
    print(f"  Matched (AMC+fuzzy):        {stats['amc_fuzzy']:>8,}")
    print(f"  Total matched:              {total_matched:>8,}")
    total_wb = len(workbook_funds)
    print(f"  Match rate:                 {total_matched/total_wb*100:>7.1f}%")
    print(f"  Unmatched (workbook):       {stats['unmatched']:>8,}")
    print(f"  Unmatched (metrics):        {len(unmatched_metrics):>8,}")
    print(f"  Total in fund_master:       {success:>8,}")
    print(f"  Time:                       {elapsed:>7.1f}s")
    print(s)

    # Confidence breakdown
    confidences = {"high": 0, "medium": 0, "low": 0}
    for r in matched_rows:
        c = r.get("match_confidence")
        if c in confidences:
            confidences[c] += 1
    print(f"\n  Confidence breakdown:")
    for c in ("high", "medium", "low"):
        print(f"    {c:>10}: {confidences[c]:>4}")
    print()


if __name__ == "__main__":
    main()
