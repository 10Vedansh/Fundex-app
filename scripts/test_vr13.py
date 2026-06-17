#!/usr/bin/env python3
"""Final VR fund ID mapping - scrape all AMC pages."""
import requests, json, sys, re, time
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Get AMC list
r = session.get('https://www.valueresearchonline.com/api/funds/', timeout=15)
amcs = r.json().get('amc-list', [])
print(f'Total AMCs: {len(amcs)}')

# Test with correct AMC IDs
test_cases = [
    ('25', 'sbi-mutual-fund'),
    ('302', 'hdfc-mutual-fund'),
    ('14', 'icici-prudential-mutual-fund'),
    ('327', 'mirae-asset-mutual-fund'),
]
for amc_id, slug in test_cases:
    url = f'https://www.valueresearchonline.com/funds/selector/fund-house/{amc_id}/{slug}/'
    r = session.get(url, timeout=20)
    fund_ids = set(re.findall(r'/funds/(\d+)/([^/"\'\\s>]+)', r.text))
    print(f'{slug} (id={amc_id}): {len(fund_ids)} fund IDs, page={len(r.text)} chars')
    for fid, fslug in list(fund_ids)[:3]:
        # Also extract fund name from HTML
        name_match = re.search(r'<a[^>]*href=["\']/funds/' + fid + r'/[^"\']*["\'][^>]*>([^<]+)', r.text)
        name = name_match.group(1).strip() if name_match else '?'
        print(f'  {fid}: {fslug} -> {name}')
    time.sleep(1)
