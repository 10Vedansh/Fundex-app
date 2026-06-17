#!/usr/bin/env python3
"""Deep audit: find ALL corrupted AMC records and count them."""
import os, requests, sys, json
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://skvvltawshbphrgnqjzf.supabase.co'
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not SERVICE_ROLE:
    print("FATAL: SUPABASE_SERVICE_ROLE_KEY not set")
    sys.exit(1)
HEADERS = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}

all_funds = []
offset = 0
while True:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe', headers=HEADERS,
        params={'select': 'scheme_code,scheme_name,amc', 'order': 'scheme_code',
                'limit': 2000, 'offset': offset}, timeout=30)
    batch = r.json()
    if not batch:
        break
    all_funds.extend(batch)
    offset += len(batch)
    if len(batch) < 2000:
        break

# Known clean AMC names (what these SHOULD be)
KNOWN_AMCS = {
    'icici prudential', 'nippon india', 'sbi', 'sundaram', 'uti',
    'aditya birla sun life', 'invesco', 'axis', 'tata', 'bank of india',
    'hdfc', 'kotak', 'quant', 'quantum', 'hsbc', 'mirae asset',
    'canara robeco', 'dsp', 'bnp paribas', 'lic', 'lic mf',
    'principal mutual fund', 'l&t mutual fund', 'franklin india',
    'franklin templeton', 'bandhan', 'edelweiss', 'jm', 'sahara',
    'idbi', 'union', 'navi', 'groww', 'tata', 'motilal oswal',
    'baroda', 'baroda bnp paribas', 'nippon india mutual fund',
    'sundaram mutual fund', 'aditya birla sun life mutual fund',
    'hsbc mutual fund', 'invesco india', 'bnp paribas mutual fund',
    'templeton india',
}

def is_clean(amc: str) -> bool:
    """Check if AMC is a known clean value."""
    a = amc.lower().strip()
    for k in KNOWN_AMCS:
        if k in a and len(a) <= len(k) + 3:
            return True
    return False

# Categorize all AMC values
clean_amcs = set()
corrupted = []
good = []
for f in all_funds:
    amc = (f.get('amc') or '').strip()
    sn = f.get('scheme_name') or ''
    sc = f.get('scheme_code') or '?'
    if not amc:
        corrupted.append({'sc': sc, 'sn': sn, 'amc': amc, 'type': 'EMPTY'})
        continue
    if is_clean(amc):
        clean_amcs.add(amc)
        good.append(f)
    else:
        # Determine corruption type
        lower = amc.lower()
        # Check if it's a fund-name parsing error (AMC contains scheme tokens)
        scheme_tokens = ['fund', 'growth', 'plan', 'idcw', 'bond', 'liquid', 'equity',
                         'hybrid', 'cap', 'mid', 'small', 'large', 'gilt', 'money',
                         'savings', 'income', 'short', 'ultra', 'duration', 'arbitrage',
                         'overnight', 'dynamic', 'opportunities', 'infrastructure', 'mnc',
                         'technology', 'consumption', 'banking', 'contra', 'comma', 'dividend']
        found_tokens = [t for t in scheme_tokens if t in lower]
        # Check for the pattern: scheme_name starts with wrong AMC
        # e.g., "SBI OVERNIGHT FUND" → AMC = "ITI Overnight Fund"
        sn_lower = sn.lower()
        amc_words = set(lower.replace('-', ' ').split())
        sn_words = set(sn_lower.replace('&', ' ').replace('-', ' ').split())
        wrong_scheme_words = amc_words - sn_words
        # Determine type
        if 'it' in lower or 'iti' in lower:
            ctype = 'ITI_CORRUPTION'
        elif len(found_tokens) >= 2:
            ctype = 'NAME_LEAKAGE'
        else:
            ctype = 'UNKNOWN'
        corrupted.append({'sc': sc, 'sn': sn, 'amc': amc, 'type': ctype,
                          'tokens': found_tokens})

print(f"Total funds: {len(all_funds)}")
print(f"Clean AMCs: {len(good)} ({len(good)/len(all_funds)*100:.1f}%)")
print(f"Corrupted AMCs: {len(corrupted)} ({len(corrupted)/len(all_funds)*100:.1f}%)")
print(f"Unique clean AMC values: {len(clean_amcs)}")

# Show corruption types
from collections import Counter
type_counts = Counter(c['type'] for c in corrupted)
print(f"\nCorruption types:")
for t, cnt in type_counts.most_common():
    print(f"  {t}: {cnt}")

# Show ALL corrupted AMCs with their scheme names
print(f"\n=== ALL CORRUPTED AMCS ===")
for c in corrupted:
    print(f"  {c['sc']:>10s} | AMC=[{c['amc']:40s}] | {c['type']:15s} | {c['sn'][:60]}")

# Count how many unique wrong AMC values
wrong_amc_set = Counter(c['amc'] for c in corrupted)
print(f"\n=== UNIQUE WRONG AMC VALUES ===")
for amc, cnt in wrong_amc_set.most_common():
    print(f"  [{amc:45s}] x {cnt:4d}")

# Check if recommendation_universe is a view or table
print(f"\n=== Checking view definition ===")
r = requests.get(f'{SUPABASE_URL}/rest/v1/', headers=HEADERS, timeout=30)
print(f"Schema response status: {r.status_code}")
# Try to get the view definition
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/rpc/get_view_definition', headers=HEADERS,
                  params={'view_name': 'recommendation_universe'}, timeout=30)
print(f"RPC response: {r2.status_code} - {r2.text[:200]}" if r2.status_code != 200 else f"RPC: {r2.text[:500]}")
