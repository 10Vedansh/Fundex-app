#!/usr/bin/env python3
"""Investigate VR URL structure."""

import requests, re, json

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
})

# Try different search URL patterns
patterns = [
    ('/search/', {'q': 'SBI'}),
    ('/search', {'q': 'SBI', 'type': 'funds'}),
    ('/funds/search', {'q': 'SBI'}),
]

for path, params in patterns:
    url = f'https://www.valueresearchonline.com{path}'
    r = session.get(url, params=params, timeout=15)
    print(f'{url} ({params}): {r.status_code}, size={len(r.text)}, captcha={"captcha" in r.text.lower()}')
    if r.status_code == 200:
        with open(f'reports/phase5/vr_path_{path.replace("/","_")}.html', 'w', encoding='utf-8') as f:
            f.write(r.text[:30000])
        # Check for fund mentions
        funds = re.findall(r'/funds/(\d+)', r.text)
        print(f'  Fund IDs: {len(funds)}')
        print(f'  Title tag: {re.search(r"<title>(.*?)</title>", r.text, re.DOTALL).group(1)[:100] if re.search(r"<title>(.*?)</title>", r.text, re.DOTALL) else "N/A"}')

# Try fund category pages directly
print('\n--- Exploring VR fund section ---')
r_home = session.get('https://www.valueresearchonline.com', timeout=15)
# Find fund-related links
fund_links = re.findall(r'href=["\'](https?://www\.valueresearchonline\.com[^"\']*)["\']', r_home.text)
fund_paths = re.findall(r'href=["\'](/funds[^"\']*)["\']', r_home.text)
all_links = fund_links + fund_paths
print(f'Fund links on homepage: {len(all_links)}')
for link in list(set(all_links))[:10]:
    print(f'  {link}')

# Try funds listing page
r_funds = session.get('https://www.valueresearchonline.com/funds/', timeout=15)
print(f'\nFunds listing: {r_funds.status_code}, size={len(r_funds.text)}')
if r_funds.status_code == 200:
    funds_found = re.findall(r'/funds/(\d+)', r_funds.text)
    print(f'Fund IDs found: {len(funds_found)}')
    fund_links = re.findall(r'href=["\'](/funds/\d+/[^"\']*)["\']', r_funds.text)
    print(f'Fund links: {len(fund_links)}')
    for link in fund_links[:5]:
        print(f'  {link}')
