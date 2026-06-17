#!/usr/bin/env python3
"""Check VR search API and expense/charges API detail."""
import requests, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Check search API
print('=== Search API ===')
r = session.get('https://www.valueresearchonline.com/api/search?q=SBI+Small+Cap', timeout=15)
try:
    j = r.json()
    print(json.dumps(j, ensure_ascii=False)[:500])
except:
    print(f'{r.status_code}: {r.text[:200]}')

# Try fund search with type filter
r = session.get('https://www.valueresearchonline.com/api/funds/search/', params={'q': 'SBI Small Cap'}, timeout=15)
print(f'\n/api/funds/search/?q=SBI+Small+Cap: {r.status_code}')
if r.status_code == 200 and len(r.text) < 20000:
    try:
        j = r.json()
        print(json.dumps(j, ensure_ascii=False)[:500])
    except:
        print(r.text[:300])

# Check the charges API detail
print('\n=== Charges API ===')
r = session.get('https://www.valueresearchonline.com/api/funds/15787/charges/', timeout=15)
j = r.json()
d = j.get('data', {})
print(f'Top keys: {list(d.keys())}')
# Find expense ratio
for k, v in d.items():
    if isinstance(v, dict):
        sk = list(v.keys())[:5]
        sv = json.dumps(v, ensure_ascii=False)[:200]
        print(f'{k} (dict, keys={sk}): {sv}')
    elif isinstance(v, list):
        print(f'{k} (list[{len(v)}]): {json.dumps(v[0], ensure_ascii=False)[:200] if v else "[]"}')
    else:
        print(f'{k}: {str(v)[:100]}')

# Premium coverage data
r2 = session.get(f'https://www.valueresearchonline.com/api/funds/15787/', timeout=15)
d2 = r2.json().get('data', {})
pcd = d2.get('premium_coverage_data', {})
print(f'\nPremium coverage: {json.dumps(pcd, ensure_ascii=False)[:500]}')

# Check more_details for ALL fund IDs
print('\n=== Bulk checking more_details for expense/AUM ===')
fund_ids = ['15787', '16182', '15682', '15688', '16198', '16083']
for fid in fund_ids:
    r = session.get(f'https://www.valueresearchonline.com/api/funds/{fid}/', timeout=15)
    d = r.json().get('data', {})
    mdd = d.get('more_details_data', {})
    items = mdd.get('data', [])
    expense = None
    aum = None
    for item in items:
        title = item.get('title', '')
        data_val = item.get('data', '')
        if 'expense' in title.lower():
            expense = data_val
        if 'asset' in title.lower() or 'aum' in title.lower():
            aum = data_val
    fm = d.get('fund_manager_data', {}).get('managers', [{}])[0].get('person_name', 'N/A') if d.get('fund_manager_data', {}).get('managers') else 'N/A'
    name = d.get('plan_data', {}).get('basic_name', 'N/A')
    print(f'{fid}: {name[:50]} | expense={expense} | aum={aum} | manager={fm}')

# Find VR fund ID from scheme code using AMC listing pages
print('\n=== Attempting to find fund by scheme name ===')
# The AMC listing pages contain fund IDs for all funds of that AMC
# We need to get the AMC ID for the fund's AMC
# Try searching for a fund by name using VR internal search
r3 = session.get('https://www.valueresearchonline.com/api/funds/search/', params={'q': 'HDFC Mid-Cap Opportunities'}, timeout=15)
if r3.status_code == 200:
    try:
        j3 = r3.json()
        print(f'Search response keys: {list(j3.keys())}')
        print(json.dumps(j3, ensure_ascii=False)[:500])
    except:
        print(f'Not JSON: {r3.text[:300]}')
else:
    print(f'Search: {r3.status_code}')
