#!/usr/bin/env python3
"""Probe VR API for fund data fields."""
import requests, json

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Check API response structure
r = session.get('https://www.valueresearchonline.com/api/funds/15787/', timeout=20)
data = r.json()
print(f'Status: {data.get("status")}')
print(f'Top-level keys: {list(data.keys())}')

d = data.get('data', {})
print(f'\ndata keys: {list(d.keys())}')
print(f'\ndata fields:')

# Extract key-value pairs
for k, v in d.items():
    if isinstance(v, dict):
        print(f'\n{k} (dict):')
        for k2, v2 in v.items():
            v2s = str(v2)[:100]
            print(f'  {k2}: {v2s}')
    elif isinstance(v, list):
        print(f'\n{k} (list[{len(v)}]):')
        for item in v[:3]:
            if isinstance(item, dict):
                print(f'  {json.dumps(item)[:150]}')
            else:
                print(f'  {str(item)[:100]}')
    else:
        print(f'\n{k}: {str(v)[:150]}')

# Check tracking_info
ti = data.get('tracking_info', {})
print(f'\ntracking_info keys: {list(ti.keys())}')

# Check page_info
pi = data.get('page_info', {})
print(f'\npage_info keys: {list(pi.keys())}')
for k, v in pi.items():
    print(f'  {k}: {str(v)[:100]}')

# Try to find fund_id -> scheme_code mapping
# Check if the API accepts other identifiers
print('\n--- Checking fund ID search ---')
# The fund listing page might have the fund ID
r2 = session.get('https://www.valueresearchonline.com/funds/selector/fund-house/327/mirae-asset-mutual-fund/', timeout=20)
funds = {}
# Find all /funds/<id>/<slug> patterns
matches = re.findall(r'/funds/(\d+)/([a-z0-9-]+)', r2.text)
print(f'Funds on Mirae page: {len(set(matches))}')
for fid, slug in list(set(matches))[:5]:
    print(f'  {fid}: {slug}')
