#!/usr/bin/env python3
"""Find VR fund listing data endpoint."""
import requests, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Test the selector-data endpoint
print('=== selector-data endpoint ===')
amc_id, slug = '25', 'sbi-mutual-fund'
url = f'https://www.valueresearchonline.com/funds/selector-data/fund-house/{amc_id}/{slug}/'
r = session.get(url, timeout=20, allow_redirects=True)
print(f'{url}: {r.status_code}, final URL: {r.url}, size: {len(r.text)}')
print(f'Content-Type: {r.headers.get("Content-Type", "?")}')
if 'text/html' in r.headers.get('Content-Type', '') or len(r.text) < 50000:
    if r.url != url:
        print(f'  Redirected to: {r.url}')
    print(f'  First 500 chars: {r.text[:500]}')

# Try the XLS download endpoint
print('\n=== XLS download endpoint ===')
url2 = f'https://www.valueresearchonline.com/downloads/fund-selector-xls/?source_url=%2Ffunds%2Fselector-data%2Ffund-house%2F{amc_id}%2F{slug}%2F'
r2 = session.get(url2, timeout=20, allow_redirects=True)
print(f'{url2}: {r2.status_code}, size: {len(r2.text)}')
print(f'Content-Type: {r2.headers.get("Content-Type", "?")}')
print(f'First 100 bytes: {r2.text[:100]}')

# Try the selector page with AJAX headers
print('\n=== AJAX-styled request ===')
headers = {
    'Accept': 'text/html, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
}
r3 = session.get(f'https://www.valueresearchonline.com/funds/selector/fund-house/{amc_id}/{slug}/',
    headers=headers, timeout=20)
print(f'AJAX headers: {r3.status_code}, size: {len(r3.text)}')

# Try data-slot approach - maybe the fund list loads via a POST to an API
print('\n=== POST to selector-data ===')
r4 = session.post(
    f'https://www.valueresearchonline.com/funds/selector-data/fund-house/{amc_id}/{slug}/',
    data={'format': 'json'},
    timeout=20
)
print(f'POST selector-data: {r4.status_code}, size: {len(r4.text)}')
print(f'First 200: {r4.text[:200]}')

# Check #fundHouse element - maybe it's loaded from a static JSON
print('\n=== Static data check ===')
# Check for json/static/funds/ directories
for path in [f'/static/funds/{amc_id}.json', f'/json/funds/{amc_id}.json', 
             f'/data/funds/{amc_id}.json', f'/api/funds/amc/{amc_id}/']:
    r5 = session.get(f'https://www.valueresearchonline.com{path}', timeout=15)
    print(f'{path}: {r5.status_code}, size: {len(r5.text)}')
    if r5.status_code == 200 and r5.text.strip().startswith('{'):
        try:
            j = r5.json()
            print(f'  JSON keys: {list(j.keys())[:5]}')
        except:
            pass

# Get the AMC page and look for the data attributes that feed the fund list
print('\n=== AMC page analysis ===')
r6 = session.get(f'https://www.valueresearchonline.com/funds/selector/fund-house/{amc_id}/{slug}/', timeout=20)
# Find the main content area
main = re.search(r'<div[^>]*id=["\']fundHouse["\'][^>]*>(.*?)</div>\s*</div>', r6.text, re.DOTALL)
if main:
    print(f'#fundHouse content: {len(main.group(1))} chars')
else:
    print('No #fundHouse found')
    
# Find fund-* CSS classes
fund_classes = re.findall(r'fund-[\w-]+', r6.text)
print(f'fund-* classes: {len(set(fund_classes))}')
for c in sorted(set(fund_classes))[:20]:
    print(f'  .{c}')
