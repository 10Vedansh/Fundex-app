#!/usr/bin/env python3
"""Find VR fund ID mapping approach."""
import requests, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Check if /api/funds/ returns a fund list
print('=== Checking /api/funds/ ===')
for path in ['/api/funds/', '/api/funds?page=1', '/api/funds?per_page=100']:
    r = session.get(f'https://www.valueresearchonline.com{path}', timeout=15)
    try:
        j = r.json()
        print(f'{path}: {r.status_code} keys={list(j.keys())[:5]} {json.dumps(j, ensure_ascii=False)[:300]}')
    except:
        print(f'{path}: {r.status_code} ({len(r.text)} chars)')

# Check for AMC listing API
print('\n=== Checking AMC API ===')
for path in ['/api/amc/', '/api/funds/amc/', '/api/fund-houses/']:
    r = session.get(f'https://www.valueresearchonline.com{path}', timeout=15)
    try:
        j = r.json()
        print(f'{path}: {r.status_code} {json.dumps(j, ensure_ascii=False)[:300]}')
    except:
        print(f'{path}: {r.status_code} ({len(r.text)} chars)')

# Check fund house selector page for AMC IDs
print('\n=== AMC IDs from fund selector ===')
r = session.get('https://www.valueresearchonline.com/funds/', timeout=15)
amc_links = re.findall(r'/funds/selector/fund-house/(\d+)/([^/]+)', r.text)
print(f'AMC links found: {len(set(amc_links))}')
for amc_id, amc_slug in sorted(set(amc_links))[:10]:
    print(f'  {amc_id}: {amc_slug}')

# Check one AMC page structure for fund listing
print('\n=== Fund listing from AMC page ===')
r = session.get('https://www.valueresearchonline.com/funds/selector/fund-house/327/mirae-asset-mutual-fund/', timeout=15)
fund_ids = re.findall(r'/funds/(\d+)/([^/]+)', r.text)
print(f'Mirae funds: {len(set(fund_ids))}')
for fid, slug in sorted(set(fund_ids))[:10]:
    print(f'  {fid}: {slug}')

# Check if there's an API to get fund list for an AMC
print('\n=== AMC fund list API ===')
for path in [f'/api/funds?amc_id=327', f'/api/funds/327/', f'/api/funds/list/327/']:
    r = session.get(f'https://www.valueresearchonline.com{path}', timeout=15)
    if r.status_code == 200 and len(r.text) < 50000:
        try:
            j = r.json()
            print(f'{path}: {r.status_code} {json.dumps(j, ensure_ascii=False)[:500]}')
        except:
            print(f'{path}: {r.status_code} HTML {len(r.text)} chars')
    else:
        print(f'{path}: {r.status_code} ({len(r.text)} chars)')

# Try the AMC selector page API (it's loaded dynamically)
print('\n=== Dynamic AMC page check ===')
r = session.get('https://www.valueresearchonline.com/funds/selector/fund-house/327/mirae-asset-mutual-fund/', timeout=15)
# Check for pagination or AJAX script
load_more = re.findall(r'data-[^=]+=["\']([^"\']+)["\']', r.text)
print(f'data-* attributes: {len(set(load_more))}')
for attr in sorted(set(load_more))[:20]:
    print(f'  {attr}')

# Check for JSON in scripts
scripts = re.findall(r'<script[^>]*>(.*?)</script>', r.text, re.DOTALL)
for s in scripts:
    if 'fund' in s.lower() and len(s) > 500:
        try:
            d = json.loads(s)
            if isinstance(d, dict) and 'data' in d:
                print(f'  JSON script with fund data: keys={list(d.keys())}')
        except:
            pass
