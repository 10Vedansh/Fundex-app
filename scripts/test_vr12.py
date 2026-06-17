#!/usr/bin/env python3
"""Find VR fund ID from fund name - test approaches."""
import requests, json, sys, re, urllib.parse
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Test 1: Can we access /funds/<slug>/ without the ID?
print('=== Test: slug-based URL ===')
test_slugs = ['sbi-small-cap-fund-direct-plan', 'hdfc-mid-cap-opportunities-fund-direct-plan']
for slug in test_slugs:
    r = session.get(f'https://www.valueresearchonline.com/funds/{slug}/', timeout=15, allow_redirects=True)
    print(f'/funds/{slug}/ -> {r.status_code} -> {r.url} (final)')

# Test 2: Check if VR has an ISIN-based identifier
print('\n=== Test: ISIN/scheme code ===')
# Try the sub_plan_code pattern: <fund_id>_01
r = session.get('https://www.valueresearchonline.com/api/funds/', timeout=15)
amc_list = r.json().get('amc-list', [])
print(f'AMC count: {len(amc_list)}')

# Test 3: Try search with fund name encoded differently
print('\n=== Test: Search variants ===')
searches = [
    ('/api/search/fund', {'q': 'SBI Small Cap Fund'}),
    ('/api/search/fund', {'q': 'sbi-small-cap-fund-direct-plan'}),
    ('/api/v2/search', {'q': 'SBI Small Cap'}),
]
for path, params in searches:
    r = session.get(f'https://www.valueresearchonline.com{path}', params=params, timeout=15)
    try:
        j = r.json()
        print(f'{path} {params}: {r.status_code} {json.dumps(j, ensure_ascii=False)[:300]}')
    except:
        print(f'{path} {params}: {r.status_code} HTML {len(r.text)}')

# Test 4: Use the fund listing page data attributes
print('\n=== Test: AJAX fund loading ===')
# Check if AMC fund page loads via POST
headers = {
    'Accept': 'application/json, text/javascript, */*; q=0.01',
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
}
r_ajax = session.get(
    'https://www.valueresearchonline.com/funds/selector/fund-house/327/mirae-asset-mutual-fund/',
    headers=headers, timeout=15
)
print(f'AJAX request: {r_ajax.status_code}, {len(r_ajax.text)} chars')
# Check if JSON
if r_ajax.text.strip().startswith('{'):
    try:
        j = r_ajax.json()
        print(f'JSON keys: {list(j.keys())[:10]}')
    except:
        pass

# Test 5: Check if there's a sitemap with fund IDs
print('\n=== Test: Sitemap ===')
r_sm = session.get('https://www.valueresearchonline.com/sitemap.xml', timeout=15)
print(f'Sitemap: {r_sm.status_code}, size={len(r_sm.text)}')
fund_urls_in_sm = re.findall(r'valueresearchonline\.com/funds/\d+', r_sm.text)
print(f'Fund URLs in sitemap: {len(set(fund_urls_in_sm))}')
if fund_urls_in_sm:
    print(f'Sample: {list(set(fund_urls_in_sm))[:5]}')

# Test 6: Try the /api/funds/search/ with POST
print('\n=== Test: POST search ===')
r_post = session.post(
    'https://www.valueresearchonline.com/api/funds/search/',
    data={'q': 'SBI Small Cap Fund'},
    headers=headers,
    timeout=15
)
print(f'POST search: {r_post.status_code}, {r_post.text[:200]}')
