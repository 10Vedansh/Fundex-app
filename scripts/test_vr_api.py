#!/usr/bin/env python3
"""Test VR API fund endpoint directly."""
import requests, time, json

s = requests.Session()
s.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json, text/html, */*',
    'Referer': 'https://www.valueresearchonline.com/funds/',
    'Origin': 'https://www.valueresearchonline.com',
})

# First, get a known good AMC page to establish cookies
print("1. Getting selector-data page for cookies...")
time.sleep(2)
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/', timeout=30)
print(f'   Status: {r.status_code}, Cookies: {len(s.cookies)}')
time.sleep(3)

# Try the /api/funds/{id}/ endpoint directly
print("\n2. Testing /api/funds/15697/...")
r = s.get('https://www.valueresearchonline.com/api/funds/15697/', timeout=30)
print(f'   Status: {r.status_code}')
print(f'   Headers: {dict(r.headers)}')
print(f'   Body preview: {r.text[:300]}')

time.sleep(3)

# Try /api/funds/ without trailing slash
print("\n3. Testing /api/funds/15697 (no trailing slash)...")
r = s.get('https://www.valueresearchonline.com/api/funds/15697', timeout=30)
print(f'   Status: {r.status_code}')
print(f'   Body preview: {r.text[:300]}')

time.sleep(3)

# Try different User-Agent
print("\n4. Testing with different headers...")
s.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'})
r = s.get('https://www.valueresearchonline.com/api/funds/15697/', timeout=30)
print(f'   Status: {r.status_code}')
print(f'   Body preview: {r.text[:300]}')

time.sleep(3)

# Try the overview page since that's what the original enrichment used
print("\n5. Testing /funds/15697/ (HTML page)...")
r = s.get('https://www.valueresearchonline.com/funds/15697/', timeout=30)
print(f'   Status: {r.status_code}')
# Find expense ratio in HTML
if 'expense' in r.text.lower():
    idx = r.text.lower().find('expense')
    print(f'   "expense" found at byte {idx}')
    print(f'   Context: {r.text[idx:idx+200]}')
if 'aum' in r.text.lower():
    idx = r.text.lower().find('aum')
    print(f'   "aum" found at byte {idx}')
    print(f'   Context: r.text[idx:idx+200]')
print(f'   Body length: {len(r.text)}')
