#!/usr/bin/env python3
"""Extract VR fund names and IDs from selector-data for matching."""
import requests, json, sys, re
sys.stdout.reconfigure(encoding='utf-8')

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

url = 'https://www.valueresearchonline.com/funds/selector-data/fund-house/25/sbi-mutual-fund/'
r = session.get(url, timeout=30)
data = r.json()
html = data['html_data']

# Extract fund info from HTML rows
# Each row: <a href="/funds/<id>/<slug>/" class='custom-fund-name'>Name</a>
funds = []
for match in re.finditer(r'href=["\']/funds/(\d+)/([^"\'/]+)["\'][^>]*class=["\']custom-fund-name["\'][^>]*>\s*([^<]+)\s*<', html):
    fid = match.group(1)
    fslug = match.group(2)
    fname = match.group(3).strip()
    funds.append((fid, fname, fslug))

print(f'Funds extracted: {len(funds)}')
for fid, fname, fslug in funds[:20]:
    print(f'  {fid}: {fname} [{fslug}]')

# Check for tooltip/title for full name
full_names = re.findall(r'href=["\']/funds/(\d+)/[^"\'/]+["\'][^>]*title=["\']([^"\']+)["\']', html)
print(f'\nFull names found: {len(full_names)}')
for fid, title in full_names[:10]:
    print(f'  {fid}: {title}')

# Save all fund IDs for this AMC
print(f'\nTotal unique fund IDs: {len(set(f[0] for f in funds))}')
print(f'RecordsTotal: {data.get("recordsTotal", "?")}')

# Now test: what does mfapi.in return for SBI fund names?
print('\n=== Sample from mfapi.in ===')
r2 = session.get('https://api.mfapi.in/mf', timeout=15)
if r2.status_code == 200:
    all_schemes = r2.json()
    # Filter SBI funds 
    sbi_schemes = [s for s in all_schemes if 'SBI' in s.get('schemeName', '').upper()]
    print(f'SBI schemes in mfapi.in: {len(sbi_schemes)}')
    for s in sbi_schemes[:10]:
        print(f'  {s["schemeCode"]}: {s["schemeName"][:70]}')
