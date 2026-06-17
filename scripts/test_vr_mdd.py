#!/usr/bin/env python3
"""Print more_details_data structure."""
import requests, time, json

s = requests.Session()
s.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json',
    'Referer': 'https://www.valueresearchonline.com/funds/',
})

time.sleep(2)
s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/', timeout=30)
time.sleep(3)

r = s.get('https://www.valueresearchonline.com/api/funds/15697/', timeout=30)
d = r.json()

mdd = d['data']['more_details_data']
print("=== more_details_data keys ===")
print(list(mdd.keys()))
print(f"\nheading: {mdd.get('heading')}")
print(f"data type: {type(mdd.get('data')).__name__}")

items = mdd.get('data', [])
print(f"\n=== data array ({len(items)} items) ===")
import sys; sys.stdout.reconfigure(encoding='utf-8')
for item in items:
    sys.stdout.write(f"  title: {item.get('title')}\n")
    sys.stdout.write(f"    data: {item.get('data')}\n")
    sys.stdout.write(f"    sort_key: {item.get('sort_key')}\n")
    sys.stdout.write("\n")

# Also get fund_manager_data
fmd = d['data']['fund_manager_data']
print("=== fund_manager_data ===")
print(json.dumps(fmd, indent=2)[:500])
