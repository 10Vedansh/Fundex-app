#!/usr/bin/env python3
"""Check if specific VR slugs exist for NO MATCH funds."""
import requests, time, json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

s = requests.Session()
s.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept': 'application/json',
    'Referer': 'https://www.valueresearchonline.com/funds/',
})

time.sleep(2)
s.get('https://www.valueresearchonline.com/api/funds/', timeout=30)
time.sleep(3)

# Check Nippon India for "vision" 
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/24/nippon-india-mutual-fund/', timeout=30)
data = json.loads(r.text)
html = data['html_data']
slugs = list(set(re.findall(r'/funds/(\d+)/([a-z0-9-]+)', html)))
print(f"Nippon India: {len(slugs)} fund entries")

# Search for "vision" in slugs
for fid, slug in slugs:
    if 'vision' in slug:
        print(f"  FOUND: ID={fid}, slug={slug}")

if not any('vision' in s[1] for s in slugs):
    print("  No 'vision' fund found in Nippon India")

# Search for "large-midcap" in Nippon India
print("\n--- Nippon India funds with 'large' in slug ---")
for fid, slug in slugs:
    if 'large' in slug:
        print(f"  ID={fid}, slug={slug}")

time.sleep(3)

# Check Aditya Birla SL for "liquid" and "large-mid-cap"
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/4/aditya-birla-sun-life-mutual-fund/', timeout=30)
data = json.loads(r.text)
html = data['html_data']
slugs2 = list(set(re.findall(r'/funds/(\d+)/([a-z0-9-]+)', html)))
print(f"\nAditya Birla SL: {len(slugs2)} fund entries")

print("\n--- Aditya Birla SL funds with 'liquid' in slug ---")
for fid, slug in slugs2:
    if 'liquid' in slug:
        print(f"  ID={fid}, slug={slug}")

print("\n--- Aditya Birla SL funds with 'large-mid-cap' in slug ---")
for fid, slug in slugs2:
    if 'large' in slug and 'mid' in slug:
        print(f"  ID={fid}, slug={slug}")

time.sleep(3)

# Check Sundaram for "money-fund"
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/187/sundaram-mutual-fund/', timeout=30)
data = json.loads(r.text)
html = data['html_data']
slugs3 = list(set(re.findall(r'/funds/(\d+)/([a-z0-9-]+)', html)))
print(f"\nSundaram: {len(slugs3)} fund entries")
for fid, slug in slugs3:
    if 'money' in slug:
        print(f"  ID={fid}, slug={slug}")

# Check SBI for "conservative-hybrid" and "dynamic-bond"
print("\n--- SBI: conservative-hybrid and dynamic-bond ---")
time.sleep(3)
r = s.get('https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/', timeout=30)
data = json.loads(r.text)
html = data['html_data']
slugs4 = list(set(re.findall(r'/funds/(\d+)/([a-z0-9-]+)', html)))
for fid, slug in slugs4:
    if 'conservative' in slug or 'dynamic-bond' in slug:
        print(f"  ID={fid}, slug={slug}")
