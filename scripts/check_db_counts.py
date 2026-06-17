#!/usr/bin/env python3
"""Check recommendation_universe stats."""
import os, requests, sys, json
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://skvvltawshbphrgnqjzf.supabase.co'
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
HEADERS = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}

# Count total
r = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe', headers=HEADERS,
                 params={'select': 'count', 'head': 'true'}, timeout=30)
print(f'Content-Range: {r.headers.get("content-range")}')

# Get all records
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe', headers=HEADERS,
                  params={'select': 'amc', 'order': 'scheme_code', 'limit': 5000}, timeout=30)
allf = r2.json()
print(f'Records returned: {len(allf)}')

amcs = {}
for f in allf:
    a = f.get('amc', '') or ''
    if a:
        a = a.strip()
        amcs[a] = amcs.get(a, 0) + 1

# Also count those with null amc
null_count = sum(1 for f in allf if not f.get('amc'))
print(f'Null AMC: {null_count}')

print(f'Unique AMCs: {len(amcs)}')
print(f'\nTop AMCs by fund count:')
for amc, cnt in sorted(amcs.items(), key=lambda x: -x[1])[:30]:
    print(f'  {amc:35s} {cnt:4d} funds')

print(f'\nAMCs with short names:')
for amc in sorted(amcs):
    if len(amc) <= 3:
        print(f'  [{amc}] len={len(amc)}')
