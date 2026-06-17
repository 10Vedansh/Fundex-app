#!/usr/bin/env python3
"""Find the VR fund listing AJAX endpoint."""
import requests, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

# Load SBI AMC page and find where fund data comes from
url = 'https://www.valueresearchonline.com/funds/selector/fund-house/25/sbi-mutual-fund/'
r = session.get(url, timeout=20)

# Search for JSON data embedded in the page
# Look for fund-related data attributes
datasets = re.findall(r'data-(\w+)=["\']([^"\']+)["\']', r.text)
print(f'Data attributes with fund info:')
for key, val in datasets:
    if 'fund' in key.lower() or 'select' in key.lower() or 'amc' in key.lower():
        print(f'  data-{key} = {val[:80]}')

# Look for <select> elements
selects = re.findall(r'<select[^>]*id=["\']([^"\']+)["\'][^>]*>(.*?)</select>', r.text, re.DOTALL)
print(f'\nSelect elements:')
for sid, content in selects:
    if 'fund' in sid.lower():
        print(f'  #{sid}: {len(content)} chars')

# Look for JSON in <script> tags  
scripts = re.findall(r'<script[^>]*>(.*?)</script>', r.text, re.DOTALL)
for i, s in enumerate(scripts):
    s_clean = s.strip()
    if s_clean.startswith('{') or s_clean.startswith('['):
        try:
            d = json.loads(s_clean)
            if isinstance(d, dict):
                if 'data' in d or 'funds' in d or 'list' in d:
                    print(f'\nJSON script #{i}: keys={list(d.keys())[:10]}')
                    if 'funds' in d:
                        print(f'  funds count: {len(d["funds"])}')
                    if 'data' in d and isinstance(d['data'], list):
                        print(f'  data count: {len(d["data"])}')
        except:
            pass

# Check for any URL that lists funds for AMC
api_urls = re.findall(r'["\']([^"\']*fund[^"\']*)["\']', r.text)
print(f'\nAPI URLs with "fund": {len(set(api_urls))}')
for u in sorted(set(api_urls))[:15]:
    print(f'  {u[:120]}')

# Check for the specific JS file
js_url = '/assets/js/script-v2__slash__funds__slash__selector__slash__.js?ver=3665&ln=en&bsa=0'
r_js = session.get(f'https://www.valueresearchonline.com{js_url}', timeout=15)
print(f'\nJS file: {r_js.status_code}, {len(r_js.text)} chars')
# Find API endpoints in JS
api_in_js = re.findall(r'["\'](/api/[^"\']+)["\']', r_js.text)
print(f'API endpoints in JS: {len(set(api_in_js))}')
for u in sorted(set(api_in_js))[:20]:
    print(f'  {u}')
# Find fetch/ajax calls
fetch_calls = re.findall(r'(fetch|ajax|getJSON|axios)\s*\(["\']([^"\']+)["\']', r_js.text, re.I)
print(f'\nFetch/AJAX calls: {len(fetch_calls)}')
for method, url in fetch_calls[:20]:
    print(f'  {method}: {url}')
