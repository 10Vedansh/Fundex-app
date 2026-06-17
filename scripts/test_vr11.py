#!/usr/bin/env python3
"""Find VR fund listing API and fund ID mapping."""
import requests, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
})

# The /api/funds/ with 404 actually returns AMC list in body
print('=== Getting AMC list ===')
r = session.get('https://www.valueresearchonline.com/api/funds/', timeout=15)
amc_list = r.json().get('amc-list', [])
print(f'Total AMCs: {len(amc_list)}')
# Create mapping from AMC short name to ID
for amc in amc_list[:5]:
    print(f'  {amc["amc_id"]}: {amc["amc_short_name"]} ({amc["amc_full_name"]})')

# Save all AMC IDs
amc_map = {a['amc_short_name'].lower(): a['amc_id'] for a in amc_list}
with open('reports/phase5/vr_amc_list.json', 'w') as f:
    json.dump(amc_list, f, indent=2)
print(f'\nSaved AMC list to reports/phase5/vr_amc_list.json')

# Test: fetch one AMC's fund list page and check if fund IDs can be extracted
print('\n=== Testing AMC fund page extraction ===')
test_amc_id = '327'  # Mirae Asset
r2 = session.get(f'https://www.valueresearchonline.com/funds/selector/fund-house/{test_amc_id}/mirae-asset-mutual-fund/', timeout=20)
# Find all fund URL patterns
all_fund_ids = re.findall(r'/funds/(\d+)/([^/"\'\\s]+)', r2.text)
print(f'Total fund URL mentions: {len(set(all_fund_ids))}')

# Check if there's a form or AJAX call for the fund listing
form_actions = re.findall(r'<form[^>]*action=["\']([^"\']+)["\']', r2.text, re.I)
print(f'Form actions: {form_actions[:5]}')

# Check for load-more / pagination / infinite scroll
load_more = re.findall(r'(load-more|load_more|pagination|page-number|page_num)', r2.text, re.I)
print(f'Load more references: {len(load_more)}')

# Check for any API calls in scripts
scripts = re.findall(r'<script[^>]*src=["\']([^"\']+)["\']', r2.text)
api_scripts = [s for s in scripts if 'api' in s.lower() or 'fund' in s.lower()]
print(f'API/fund scripts: {len(api_scripts)}')
for s in api_scripts[:5]:
    print(f'  {s}')

# Check for JS config/data
js_configs = re.findall(r'(var|let|const)\s+(\w+)\s*=\s*({[^;]+})', r2.text)
for decl, name, val in js_configs:
    if len(val) > 50:
        print(f'  {name}: {val[:100]}...')

# Check XHR/fetch patterns
fetch_urls = re.findall(r'["\'](/api/[^"\']+)["\']', r2.text)
print(f'\nAPI URLs in page: {len(set(fetch_urls))}')
for u in sorted(set(fetch_urls))[:15]:
    print(f'  {u}')

# Check if there's a /api/funds/list endpoint
print('\n=== Probing fund listing API ===')
r3 = session.get('https://www.valueresearchonline.com/funds/', timeout=15)
# Find fund IDs on main funds page
fund_ids_main = re.findall(r'/funds/(\d+)/([^/"\'\\s]+)', r3.text)
print(f'Fund IDs on main funds page: {len(set(fund_ids_main))}')
for fid, slug in list(set(fund_ids_main))[:5]:
    print(f'  {fid}: {slug}')
