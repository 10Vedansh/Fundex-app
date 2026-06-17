#!/usr/bin/env python3
"""Examine HTML structure for fund links."""
import requests, json, re
s = requests.Session()
s.headers.update({'User-Agent': 'Mozilla/5.0'})
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/', timeout=30)
data = r.json()
html = data['html_data']

# Find all href attributes
hrefs = re.findall(r'href=["\']([^"\']+)["\']', html)
print(f'Total hrefs: {len(hrefs)}')
fund_hrefs = [h for h in hrefs if '/funds/' in h]
print(f'Fund hrefs: {len(fund_hrefs)}')
for h in fund_hrefs[:20]:
    print(h)

# Also show all links around fund IDs
for m in re.finditer(r'<a\s+[^>]*href=["\']/funds/(\d+)/[^"\'/]+["\'][^>]*>', html):
    start = max(0, m.start() - 50)
    end = min(len(html), m.end() + 100)
    snippet = html[start:end]
    print('\n---')
    print(snippet)
    if len(fund_hrefs) > 20:
        break
