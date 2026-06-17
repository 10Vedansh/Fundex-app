#!/usr/bin/env python3
"""Debug VR HTML href format."""
import re, requests, time, json

s = requests.Session()
s.headers.update({'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.5'})
time.sleep(3)
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/', timeout=30)
data = r.json()
html = data['html_data']

# Find all hrefs with /funds/ pattern
matches = re.findall(r'href=["\'](/funds/\d+/[^"\'/]+)["\']', html)
print(f'Href matches: {len(matches)}')
for href in matches[:5]:
    print(f'  {href}')

# Also find all /funds/<id>/ patterns
ids = re.findall(r'/funds/(\d+)/', html)
print(f'\nFund IDs found: {len(ids)}')

# Check for the <td> structure
tds = re.findall(r'<td[^>]*>(.*?)</td>', html, re.DOTALL)[:5]
print('\nFirst 5 <td> elements:')
for td in tds:
    print(f'  {td[:150]}')

# Check for <tr> patterns
trs = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)
print(f'\nTotal <tr> elements: {len(trs)}')
if trs:
    print('First <tr>:')
    print(trs[1][:400])
