#!/usr/bin/env python3
"""Test VR fund page scraping and find API."""

import requests, re, json, time

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
})

# Try known fund pages
funds_to_try = [
    '/funds/15787/sbi-small-cap-fund-direct-plan/',
    '/funds/16182/nippon-india-small-cap-fund-direct-plan/',
    '/funds/15682/axis-large-cap-fund-direct-plan/',
]

for path in funds_to_try:
    url = f'https://www.valueresearchonline.com{path}'
    r = session.get(url, timeout=20)
    print(f'\n{path}: {r.status_code}, size={len(r.text)}')

    if r.status_code == 200:
        # Check for captcha/block
        if 'captcha' in r.text.lower() or len(r.text) < 1000:
            print('  BLOCKED/CAPTCHA')
            continue

        exp = re.search(r'[Ee]xpense\s*[Rr]atio[:\s]*([\d.]+)\s*%', r.text)
        print(f'  Expense: {exp.group(1) if exp else "NOT FOUND"}')

        aum = re.search(r'AUM[:\s]*[RupeeRs]*\s*([\d,]+[\d.]*)\s*Cr', r.text)
        print(f'  AUM: {aum.group(1) if aum else "NOT FOUND"}')

        fm = re.search(r'Fund\s*(?:Manager|House)[:\s]*([A-Za-z\s.&]+?)(?:<|\n|\r)', r.text)
        print(f'  Fund House: {fm.group(1).strip() if fm else "NOT FOUND"}')

        # Check for JSON-LD
        jd = re.search(r'<script type="application/ld\+json">(.*?)</script>', r.text, re.DOTALL)
        if jd:
            try:
                data = json.loads(jd.group(1))
                name = data.get('name', 'N/A') if isinstance(data, dict) else 'N/A'
                print(f'  JSON-LD name: {name}')
                if isinstance(data, dict):
                    for k, v in data.items():
                        if isinstance(v, (str, int, float)):
                            print(f'    {k}: {v}')
                        elif isinstance(v, dict):
                            print(f'    {k}: {json.dumps(v)[:150]}')
            except Exception as e:
                print(f'  JSON-LD error: {e}')

# Check for API calls
print('\n--- Testing VR API ---')
api_patterns = [
    '/api/v1/funds/search?q=SBI',
    '/api/funds/search?q=SBI',
    '/api/search?q=SBI',
    '/funds/api/search?q=SBI',
    '/api/v1/search?q=SBI',
]
for path in api_patterns:
    url = f'https://www.valueresearchonline.com{path}'
    r = session.get(url, timeout=15,
                     headers={'Accept': 'application/json, text/plain, */*',
                              'X-Requested-With': 'XMLHttpRequest'})
    print(f'{path}: {r.status_code}, size={len(r.text)}')
    if r.status_code == 200 and len(r.text) > 10:
        try:
            data = r.json()
            print(f'  JSON response: {json.dumps(data)[:200]}')
        except:
            print(f'  Not JSON, starts: {r.text[:100]}')

# Try fund house selector page (has fund list)
print('\n--- Fetching fund house page ---')
r_fh = session.get('https://www.valueresearchonline.com/funds/selector/fund-house/327/mirae-asset-mutual-fund/', timeout=20)
if r_fh.status_code == 200:
    fund_ids = re.findall(r'/funds/(\d+)/([^/]+)', r_fh.text)
    print(f'Funds listed: {len(fund_ids)}')
    for fid, slug in fund_ids[:5]:
        print(f'  /funds/{fid}/{slug}')

    # Check if there are script tags with fund data
    scripts = re.findall(r'<script[^>]*>(.*?)</script>', r_fh.text, re.DOTALL)
    for s in scripts:
        if 'fund' in s.lower() and ('data' in s.lower() or 'json' in s.lower()):
            print(f'  Script with fund data: {len(s)} chars')
            print(f'  First 200: {s[:200]}')
