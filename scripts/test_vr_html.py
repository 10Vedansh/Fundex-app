#!/usr/bin/env python3
"""Inspect VR selector-data HTML structure."""
import requests, re, time, json

s = requests.Session()
s.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'en-US,en;q=0.5',
})

time.sleep(3)
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/', timeout=30)
print(f'Status: {r.status_code}')
data = r.json()
html = data['html_data']

# Find fund hrefs - look for the pattern
hrefs = re.findall(r'<a\s+[^>]*href=["\']/funds/(\d+)/([^"\'/]+)', html)
print(f'Fund hrefs found: {len(hrefs)}')

# Show the HTML around fund links to understand the structure
for m in re.finditer(r'<a[^>]*href=["\']/funds/(\d+)/([^"\'/]+)["\'][^>]*>', html):
    start = max(0, m.start())
    end = min(len(html), m.end() + 100)
    snippet = html[start:end]
    print('Link HTML:', repr(snippet))
    break

# Try a different approach - just find all hrefs with /funds/ pattern
fund_links = re.findall(r'href=["\'](/funds/\d+/[^"\'/]+)["\']', html)
print(f'\nFund links (total): {len(fund_links)}')
for link in fund_links[:5]:
    print(f'  {link}')
