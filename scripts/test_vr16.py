#!/usr/bin/env python3
"""Parse VR selector-data endpoint to extract fund IDs."""
import requests, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Get SBI fund listing from selector-data endpoint
url = 'https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/'
r = session.get(url, timeout=30)
data = r.json()

# Show the structure
print(f'Top-level keys: {list(data.keys())}')
print(f'"html_data" length: {len(data["html_data"])}')
print(f'"html_data" first 500 chars:\n{data["html_data"][:500]}')

# Parse HTML table to extract fund data
html = data['html_data']

# Fund URLs: /funds/<id>/<slug>/
fund_links = re.findall(r'href=["\']/funds/(\d+)/([^"\'/]+)["\'][^>]*>([^<]+)', html)
print(f'\nFund links found: {len(fund_links)}')
for fid, fslug, fname in fund_links[:10]:
    print(f'  {fid}: {fslug} -> {fname.strip()}')

# Also find them by <a> tag patterns
fund_ids = set()
for match in re.finditer(r'/funds/(\d+)/([^"\'/]+)', html):
    fund_ids.add(match.group(1))
print(f'\nUnique fund IDs: {len(fund_ids)}')

# Check for other data - maybe categories, returns, etc.
# Look for <td> elements
rows = re.findall(r'<tr[^>]*>(.*?)</tr>', html, re.DOTALL)
print(f'\nHTML rows: {len(rows)}')

# Extract from one complete row
if rows:
    print(f'Sample row: {rows[3][:300]}')

# Check for JSON embedded in html_data
json_embeds = re.findall(r'<script[^>]*type=["\']application/json["\'][^>]*>(.*?)</script>', html, re.DOTALL)
print(f'\nJSON embeds: {len(json_embeds)}')
for j in json_embeds[:2]:
    try:
        d = json.loads(j)
        print(f'  Keys: {list(d.keys())[:10]}')
        if 'data' in d:
            print(f'  Data count: {len(d["data"])}')
    except:
        print(f'  Not JSON: {j[:100]}')
