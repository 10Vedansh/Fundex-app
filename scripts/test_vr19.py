#!/usr/bin/env python3
"""Verify VR fund name and plan type from API."""
import requests, json, sys
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Test with a known fund ID and extract fund name
fid = 15787
r = session.get(f'https://www.valueresearchonline.com/api/funds/{fid}/', timeout=15)
data = r.json()

print('=== Fund Name ===')
print(f'keys: {list(data.keys())}')

# Look for fund name in various places
if 'more_details_data' in data and 'data' in data['more_details_data']:
    for item in data['more_details_data']['data']:
        if 'Fund Name' in item or 'fund_name' in item or 'scheme' in item:
            print(f'Fund Name match: {json.dumps(item, ensure_ascii=False)[:200]}')

# Check all keys in more_details_data
mdd = data.get('more_details_data', {})
if isinstance(mdd, dict):
    print(f'\nmore_details_data keys: {list(mdd.keys())[:10]}')
    if 'data' in mdd and isinstance(mdd['data'], list) and len(mdd['data']) > 0:
        item = mdd['data'][0]
        print(f'\nFirst item keys: {list(item.keys())[:20]}')
        for k in ['Fund Name', 'fund_name', 'name', 'scheme', 'fund', 'Base Expense Ratio', 'Assets']:
            if k in item:
                print(f'  {k}: {item[k]}')

# Check the page URL slug for name info
print(f'\nPage URL slug: sbi-small-cap-fund-direct-plan')

# Also check plan_data for plan type
pd = data.get('plan_data', {})
if isinstance(pd, dict):
    print(f'\nplan_data keys: {list(pd.keys())}')
    if 'data' in pd and isinstance(pd['data'], list) and len(pd['data']) > 0:
        plan_item = pd['data'][0]
        print(f'Plan data keys: {list(plan_item.keys())[:10]}')
        if 'sub_plan_code' in plan_item:
            print(f'  sub_plan_code: {plan_item["sub_plan_code"]}')
        if 'plan' in plan_item:
            print(f'  plan: {plan_item["plan"]}')
