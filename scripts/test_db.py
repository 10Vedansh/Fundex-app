#!/usr/bin/env python3
"""Check recommendation_universe schema and data."""
import requests, os, json

SUPABASE_URL = 'https://skvvltawshbphrgnqjzf.supabase.co'
SERVICE_ROLE = os.environ['SUPABASE_SERVICE_ROLE_KEY']
HEADERS = {'apikey': SERVICE_ROLE, 'Authorization': f'Bearer {SERVICE_ROLE}'}

# Get distinct amc values
r = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe',
    headers=HEADERS, params={'select': 'amc', 'order': 'amc', 'limit': 30}, timeout=15)

if r.status_code == 200:
    amcs = list(set(x.get('amc','') for x in r.json() if x.get('amc')))
    print(f'AMCs found ({len(amcs)}):')
    for a in sorted(amcs):
        print(f'  {a}')
else:
    print(f'Error: {r.text[:200]}')

# Count total rows
r2 = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe',
    headers=HEADERS, params={'select': 'count', 'limit': 0}, timeout=15)
if r2.status_code == 200:
    print(f'\nTotal rows: {r2.json()[0]}')
else:
    print(f'Count error: {r2.text[:200]}')
