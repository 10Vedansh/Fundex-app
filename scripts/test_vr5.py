#!/usr/bin/env python3
"""Find VR API endpoints and embedded data."""

import requests, re, json

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

r = session.get('https://www.valueresearchonline.com/funds/15787/sbi-small-cap-fund-direct-plan/', timeout=20)

# Search for __NEXT_DATA__
nd = re.search(r'__NEXT_DATA__\s*=\s*({.*?});', r.text, re.DOTALL)
if nd:
    data = json.loads(nd.group(1))
    print('__NEXT_DATA__ found')
    props = data.get('props', {}).get('pageProps', {})
    print(f'pageProps keys: {list(props.keys())[:15]}')
    for k in props:
        v = props[k]
        if isinstance(v, dict):
            print(f'  {k}: dict keys={list(v.keys())[:5]}')
            if 'expense' in str(v).lower() or 'aum' in str(v).lower():
                print(f'    HAS EXPENSE/AUM: {json.dumps(v)[:300]}')
        elif isinstance(v, list):
            print(f'  {k}: list[{len(v)}]')
        else:
            vstr = str(v)
            print(f'  {k}: {vstr[:100]}')
            if 'expense' in vstr.lower() or 'aum' in vstr.lower():
                print(f'    MATCH: {vstr[:300]}')
else:
    print('No __NEXT_DATA__')

# Search for window.__INITIAL_STATE__
is_state = re.search(r'window\.__INITIAL_STATE__\s*=\s*({.*?});', r.text, re.DOTALL)
if is_state:
    print('\n__INITIAL_STATE__ found')
    data = json.loads(is_state.group(1))
    print(f'Keys: {list(data.keys())[:10]}')
else:
    print('\nNo __INITIAL_STATE__')

# Search for any JSON in named script tags
scripts = re.findall(r'<script[^>]+id=["\']([^"\'>]+)["\'][^>]*>(.*?)</script>', r.text, re.DOTALL)
for sid, content in scripts:
    content = content.strip()
    if len(content) > 200 and len(content) < 100000:
        try:
            data = json.loads(content)
            dt = type(data).__name__
            keys = list(data.keys())[:8] if isinstance(data, dict) else f'list[{len(data)}]'
            print(f'\nScript #{sid}: JSON {dt} keys={keys}')
            # Check for our fields
            s = json.dumps(data).lower()
            if 'expense' in s:
                print(f'  CONTAINS EXPENSE DATA')
            if 'aum' in s:
                print(f'  CONTAINS AUM DATA')
        except json.JSONDecodeError:
            pass

# Look for API endpoints
apis = re.findall(r'["\'](/api/[^"\']+)["\']', r.text)
print(f'\nAPI endpoints: {len(set(apis))}')
for ap in sorted(set(apis))[:15]:
    print(f'  {ap}')

# Try some API patterns
print('\n--- Probing VR API ---')
attempts = [
    '/api/funds/15787/',
    '/api/v1/funds/15787/',
    '/funds/15787/api/',
    '/api/funds/15787',
    '/api/v1/funds/15787',
]

for path in attempts:
    url = f'https://www.valueresearchonline.com{path}'
    hdrs = {'Accept': 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest'}
    r2 = session.get(url, headers=hdrs, timeout=15)
    info = ''
    if r2.status_code == 200 and len(r2.text) > 10:
        try:
            data = r2.json()
            info = f'JSON keys={list(data.keys())[:5]}' if isinstance(data, dict) else f'list[{len(data)}]'
        except:
            info = f'HTML {len(r2.text)} chars'
    print(f'{path}: {r2.status_code} {info}')
