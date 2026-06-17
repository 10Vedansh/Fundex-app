#!/usr/bin/env python3
"""Get full VR API response to find expense_ratio and AUM paths."""
import requests, time, json

s = requests.Session()
s.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json, text/html, */*',
    'Referer': 'https://www.valueresearchonline.com/funds/',
})

# Establish cookies
time.sleep(2)
s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/', timeout=30)
time.sleep(3)

# Get full API response
r = s.get('https://www.valueresearchonline.com/api/funds/15697/', timeout=30)
data = r.json()

# Print all top-level keys
print("=== Top-level keys ===")
for k, v in data.get('data', {}).items():
    if isinstance(v, dict):
        print(f"  data.{k}: dict with keys {list(v.keys())[:20]}")
    elif isinstance(v, list):
        print(f"  data.{k}: list of length {len(v)}")
    else:
        print(f"  data.{k}: {type(v).__name__} = {str(v)[:80]}")

# Check fund_details
d = data.get('data', {})
if 'fund_details' in d:
    print("\n=== fund_details ===")
    for k, v in d['fund_details'].items():
        print(f"  {k}: {type(v).__name__} = {str(v)[:100]}")

# Check active_fund_metrics
if 'active_fund_metrics' in d:
    fd = d['active_fund_metrics']
    if isinstance(fd, dict):
        print("\n=== active_fund_metrics ===")
        for k, v in fd.items():
            if isinstance(v, dict):
                print(f"  {k}: dict with keys {list(v.keys())[:10]}")
            else:
                print(f"  {k}: {type(v).__name__} = {str(v)[:80]}")
    elif isinstance(fd, list):
        print(f"\n=== active_fund_metrics: list of {len(fd)} ===")
        for item in fd[:2]:
            print(f"  {json.dumps(item, indent=2)[:300]}")

# Search for expense_ratio in entire JSON
raw = r.text
if 'expense' in raw.lower():
    # Find all contexts
    import re
    positions = [(m.start(), m.group()) for m in re.finditer(r'.{0,50}expense.{0,50}', raw, re.I)]
    print(f"\n=== 'expense' occurrences ({len(positions)}) ===")
    for pos, match in positions[:10]:
        print(f"  at {pos}: ...{match}...")

if 'aum' in raw.lower():
    positions = [(m.start(), m.group()) for m in re.finditer(r'.{0,30}aum.{0,30}', raw, re.I)]
    print(f"\n=== 'aum' occurrences ({len(positions)}) ===")
    for pos, match in positions[:5]:
        print(f"  at {pos}: ...{match}...")

if 'Assets' in raw:
    positions = [(m.start(), m.group()) for m in re.finditer(r'.{0,20}Assets.{0,50}', raw)]
    print(f"\n=== 'Assets' occurrences ({len(positions)}) ===")
    for pos, match in positions[:5]:
        print(f"  at {pos}: ...{match}...")
