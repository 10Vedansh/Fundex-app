#!/usr/bin/env python3
"""Debug: check if L&T AMC exists in VR, and verify specific fund slug patterns."""
import requests, time, json, sys

sys.stdout.reconfigure(encoding='utf-8')

s = requests.Session()
s.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json',
    'Referer': 'https://www.valueresearchonline.com/funds/',
})

time.sleep(2)
r = s.get('https://www.valueresearchonline.com/api/funds/', timeout=30)
amcs = json.loads(r.text[3:]).get('amc-list', [])

# Find L&T or HSBC in AMC list
print("=== Search for L&T, HSBC in VR AMC list ===")
for a in amcs:
    name = (a.get('amc_short_name', '') + ' ' + a.get('amc_full_name', '')).lower()
    if 'l&t' in name or 'hsbc' in name or 'lt' == a.get('amc_short_name','').lower():
        print(f"  FOUND: {a}")

time.sleep(3)

# Check for Principal in VR
print("\n=== Search for Principal in VR AMC list ===")
for a in amcs:
    name = (a.get('amc_short_name', '') + ' ' + a.get('amc_full_name', '')).lower()
    if 'principal' in name:
        print(f"  FOUND: {a}")

time.sleep(3)

# Get SBI fund slugs to see pattern
print("\n=== SBI fund slugs (first 15) ===")
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/', timeout=30)
data = json.loads(r.text)
html = data['html_data']
slugs = list(set(re.findall(r'/funds/\d+/([a-z0-9-]+)', html)))
for slug in sorted(slugs)[:15]:
    print(f"  {slug}")
print(f"  ... total unique slugs: {len(slugs)}")

# Check if any SBI slug ends with -regular-plan
regular = [s for s in slugs if 'regular' in s]
direct = [s for s in slugs if 'direct' in s]
print(f"\n  Regular plan slugs: {len(regular)}")
print(f"  Direct plan slugs: {len(direct)}")
if regular:
    print(f"  Sample regular: {regular[:3]}")
if direct:
    print(f"  Sample direct: {direct[:3]}")

import re
