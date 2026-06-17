#!/usr/bin/env python3
"""Check alternative MF data sources for expense_ratio and AUM."""
import requests, json

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})

# NSE India Mutual Fund API
print('=== NSE India MF API ===')
nse_urls = [
    'https://www.nseindia.com/api/mf-data',
    'https://www.nseindia.com/api/mf-details',
    'https://www.nseindia.com/api/mf-list',
]
for url in nse_urls:
    try:
        r = session.get(url, timeout=15, headers={'Referer': 'https://www.nseindia.com/'})
        print(f'{url}: {r.status_code}, {len(r.text)} chars')
        if r.status_code == 200 and r.text.strip().startswith('{'):
            j = r.json()
            print(f'  keys: {list(j.keys())[:10]}')
    except Exception as e:
        print(f'{url}: ERROR {type(e).__name__}: {str(e)[:60]}')

# Moneycontrol API
print('\n=== Moneycontrol API ===')
mc_urls = [
    'https://api.moneycontrol.com/mcapi/v1/mutual-funds/search',
    'https://api.moneycontrol.com/mcapi/v1/mutual-fund/nav',
]
for url in mc_urls:
    try:
        r = session.get(url, timeout=15)
        print(f'{url}: {r.status_code}, {len(r.text)} chars')
        if r.status_code == 200:
            print(f'  {r.text[:200]}')
    except Exception as e:
        print(f'{url}: ERROR {type(e).__name__}: {str(e)[:60]}')

# ET Money / Groww / other aggregators
print('\n=== Other Aggregators ===')
other_urls = [
    'https://groww.in/api/mutual-fund/v1/funds',
    'https://api.etmoney.com/mf/v1/funds',
]
for url in other_urls:
    try:
        r = session.get(url, timeout=15)
        print(f'{url}: {r.status_code}, {len(r.text)} chars')
    except Exception as e:
        print(f'{url}: ERROR {type(e).__name__}: {str(e)[:60]}')

# Check the MFAPI listing endpoint for scheme metadata
print('\n=== mfapi.in metadata check ===')
r = session.get('https://api.mfapi.in/mf', timeout=30)
if r.status_code == 200:
    schemes = r.json()
    print(f'mfapi.in total schemes: {len(schemes)}')
    sample = schemes[:3]
    for s in sample:
        print(f'  {s}')
    # Check all keys across schemes
    all_keys = set()
    for s in schemes[:100]:
        all_keys.update(s.keys())
    print(f'All keys in first 100: {sorted(all_keys)}')
