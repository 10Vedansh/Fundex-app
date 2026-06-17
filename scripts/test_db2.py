#!/usr/bin/env python3
"""Check recommendation_universe data distribution."""
import requests, os, json

SUPABASE_URL = 'https://skvvltawshbphrgnqjzf.supabase.co'
SERVICE_ROLE = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': SERVICE_ROLE, 'Authorization': f'Bearer {SERVICE_ROLE}'}

# Check count with content-range header
r = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe',
    headers={**HEADERS, 'Prefer': 'count=exact'},
    params={'select': 'scheme_code', 'limit': 1}, timeout=15)
if r.status_code == 200:
    count = r.headers.get('content-range', '?').split('/')[-1]
    print(f'Total rows (from header): {count}')
else:
    print(f'Error: {r.status_code} {r.text[:200]}')

# Get all distinct AMC values with counts
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe',
    headers=HEADERS, params={'select': 'amc', 'limit': 1000}, timeout=15)
if r2.status_code == 200:
    data = r2.json()
    amc_counts = {}
    for row in data:
        amc = row.get('amc') or 'NULL'
        amc_counts[amc] = amc_counts.get(amc, 0) + 1
    print(f'\nAMC distribution ({len(amc_counts)} values):')
    for amc, cnt in sorted(amc_counts.items(), key=lambda x: -x[1])[:30]:
        print(f'  {amc}: {cnt}')
else:
    print(f'Error: {r2.status_code} {r2.text[:200]}')

# Check a sample of rows that have amc populated
r3 = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe',
    headers=HEADERS, 
    params={'select': 'scheme_code,scheme_name,amc,expense_ratio,aum,fund_manager',
            'amc': 'not.is.null', 'limit': 5}, timeout=15)
if r3.status_code == 200:
    print(f'\nSample rows with AMC:')
    for row in r3.json():
        print(f'  {row}')
else:
    print(f'Sample error: {r3.status_code}')
