#!/usr/bin/env python3
"""Extract expense_ratio, AUM, fund_manager from VR API."""
import requests, json, sys

# Force UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Check multiple funds
fund_ids = ['15787', '16182', '15682', '15688', '16198']

for fid in fund_ids:
    r = session.get(f'https://www.valueresearchonline.com/api/funds/{fid}/', timeout=20)
    data = r.json()
    d = data.get('data', {})

    print(f'\n=== Fund {fid} ===')
    pd = d.get('plan_data', {})
    print(f'Name: {pd.get("basic_name", "N/A")}')

    # Risk data - likely has expense_ratio
    rd = d.get('risk_data', {})
    if rd:
        print(f'risk_data keys: {list(rd.keys())}')
        for k, v in rd.items():
            if isinstance(v, dict):
                sv = json.dumps(v, ensure_ascii=False)[:200]
            elif isinstance(v, list):
                sv = json.dumps(v, ensure_ascii=False)[:200]
            else:
                sv = str(v)[:100]
            print(f'  {k}: {sv}')

    # Fund manager data
    fmd = d.get('fund_manager_data', {})
    if fmd:
        print(f'fund_manager_data: {json.dumps(fmd, ensure_ascii=False)[:300]}')

    # More details data
    mdd = d.get('more_details_data', {})
    if mdd:
        print(f'more_details_data keys: {list(mdd.keys())[:10]}')
        for k, v in mdd.items():
            sv = str(v)[:100]
            print(f'  {k}: {sv}')

    # Portfolio data
    pfd = d.get('portfolio_data', {})
    if pfd:
        print(f'portfolio_data keys: {list(pfd.keys())[:10]}')
        for k, v in pfd.items():
            sv = str(v)[:100]
            print(f'  {k}: {sv}')

    # Returns data
    retd = d.get('returns_data', {})
    if retd:
        print(f'returns_data keys: {list(retd.keys())[:10]}')
