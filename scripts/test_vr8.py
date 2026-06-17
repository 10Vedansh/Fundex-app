#!/usr/bin/env python3
"""Deep-dive into VR API for expense_ratio and AUM fields."""
import requests, json, sys
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

fund_id = '15787'
r = session.get(f'https://www.valueresearchonline.com/api/funds/{fund_id}/', timeout=20)
data = r.json()
d = data.get('data', {})

# Check more_details_data.data array - might have expense info
mdd = d.get('more_details_data', {})
print('=== More Details Data ===')
for item in mdd.get('data', []):
    title = item.get('title', '')
    val = item.get('data', '')
    val_fmt = item.get('data_fmt', '')
    print(f'  {title}: {val} (fmt: {val_fmt})')

for item in mdd.get('single_grid_data', []):
    title = item.get('title', '')
    val = item.get('data', '')
    print(f'  [single] {title}: {val}')

# Check plan_data for fee/expense info
pd = d.get('plan_data', {})
print(f'\n=== Plan Data keys: {list(pd.keys())} ===')
# Print all simple fields
for k, v in pd.items():
    if not isinstance(v, (dict, list)):
        print(f'  {k}: {v}')

# Check fund_manager_data for manager names
fmd = d.get('fund_manager_data', {})
print(f'\n=== Fund Manager ===')
for m in fmd.get('managers', []):
    print(f'  {m.get("person_name", "")} ({m.get("managed_date_from_fmt", "")})')

# Check premium_coverage_data
pcd = d.get('premium_coverage_data', {})
print(f'\n=== Premium Coverage ===')
if pcd:
    print(f'  keys: {list(pcd.keys())[:10]}')

# Try to find additional API endpoints for charges/fees
# Check if there's a /api/funds/{id}/charges/ endpoint
print('\n=== Checking charges API ===')
for ep in ['/api/funds/{}/charges/', '/api/funds/{}/fees/', '/api/funds/{}/expense/']:
    url = f'https://www.valueresearchonline.com{ep.format(fund_id)}'
    r2 = session.get(url, timeout=15, headers={'Accept': 'application/json'})
    if r2.status_code == 200:
        try:
            j = r2.json()
            print(f'{ep}: {json.dumps(j, ensure_ascii=False)[:300]}')
        except:
            print(f'{ep}: {r2.status_code} (not JSON)')
    else:
        print(f'{ep}: {r2.status_code}')

# Try searching for fund by scheme code (external identifier)
# Check if VR has any identifier mapping
print('\n=== Checking identifier search ===')
for ep in ['/api/search/fund?q=120505', '/api/funds/search/?scheme_code=120505',
           '/api/v1/funds/search?q=120505', '/api/search?type=fund&q=SBI+Small+Cap']:
    url = f'https://www.valueresearchonline.com{ep}'
    r2 = session.get(url, timeout=15, headers={'Accept': 'application/json'})
    try:
        j = r2.json()
        print(f'{ep}: {json.dumps(j, ensure_ascii=False)[:200]}')
    except:
        print(f'{ep}: {r2.status_code} ({len(r2.text)} chars, not JSON)')
