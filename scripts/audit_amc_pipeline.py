#!/usr/bin/env python3
"""Audit AMC values in recommendation_universe — check for corruption."""
import os, requests, sys, json
sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://skvvltawshbphrgnqjzf.supabase.co'
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not SERVICE_ROLE:
    print("FATAL: SUPABASE_SERVICE_ROLE_KEY not set")
    sys.exit(1)
HEADERS = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}

# Get all funds with their amc values
all_funds = []
offset = 0
while True:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe', headers=HEADERS,
        params={'select': 'scheme_code,scheme_name,amc', 'order': 'scheme_code',
                'limit': 2000, 'offset': offset}, timeout=30)
    batch = r.json()
    if not batch:
        break
    all_funds.extend(batch)
    offset += len(batch)
    if len(batch) < 2000:
        break

print(f"Total funds: {len(all_funds)}")

# Check for suspicious AMC values (contain words like 'fund', 'growth', 'direct', etc.)
suspicious = []
amc_counts = {}
for f in all_funds:
    amc = (f.get('amc') or '').strip()
    sn = f.get('scheme_name') or ''
    sc = f.get('scheme_code') or '?'
    
    if not amc:
        continue
    
    amc_counts[amc] = amc_counts.get(amc, 0) + 1
    
    # Check if AMC contains fund-name tokens
    lower = amc.lower()
    tokens = ['fund', 'growth', 'direct', 'regular', 'plan', 'idcw', 'option',
              'payout', 'reinvestment', 'dividend', 'bonus', 'income', 'distribution',
              'cum', 'capital', 'withdrawal', 'daily', 'weekly', 'monthly', 'quarterly',
              'half yearly', 'annual', 'semi annual', 'fortnightly']
    for t in tokens:
        if t in lower:
            susp = {'scheme_code': sc, 'scheme_name': sn, 'amc': amc, 'token': t}
            if susp not in suspicious:
                suspicious.append(susp)

print(f"\n=== SUSPICIOUS AMC VALUES (containing fund-plan tokens) ===")
print(f"Count: {len(suspicious)}")
for s in suspicious[:30]:
    print(f"  {s['scheme_code']}: AMC=[{s['amc']}] contains '{s['token']}'")
    print(f"    scheme_name: {s['scheme_name'][:80]}")
    
if len(suspicious) > 30:
    print(f"  ... and {len(suspicious) - 30} more")

# Show top 50 unique AMC values
print(f"\n=== TOP 50 AMC VALUES ===")
for amc, cnt in sorted(amc_counts.items(), key=lambda x: -x[1])[:50]:
    print(f"  [{amc:40s}] x {cnt:4d}")

# Check if AMC contains the fund name as substring
print(f"\n=== FUNDS WHERE AMC MATCHES PART OF SCHEME_NAME ===")
count = 0
for f in all_funds:
    amc = (f.get('amc') or '').strip()
    sn = f.get('scheme_name') or ''
    sc = f.get('scheme_code') or '?'
    if not amc or not sn:
        continue
    # Check if amc appears in scheme_name (excluding the known good AMC names)
    known_good = ['icici prudential', 'nippon india', 'sbi', 'sundaram', 'uti',
                  'aditya birla sun life', 'invesco', 'axis', 'tata', 'bank of india',
                  'hdfc', 'kotak', 'quant', 'quantum', 'hsbc', 'mirae asset',
                  'canara robeco', 'dsp', 'baroda', 'bnp paribas', 'lic', 'lic mf',
                  'principal', 'l&t', 'franklin india', 'franklin templeton',
                  'bandhan', 'idfc', 'edelweiss', 'jm', 'sahara', 'idbi',
                  'union', 'navi', 'groww', 'tata', 'motilal oswal',
                  'nippon india mutual fund', 'sundaram mutual fund',
                  'axis mutual fund', 'invesco india', 'hsbc mutual fund',
                  'bnp paribas mutual fund', 'baroda mutual fund',
                  'aditya birla sun life mutual fund']
    is_known = False
    for kg in known_good:
        if amc.lower() == kg or amc.lower().startswith(kg):
            is_known = True
            break
    if is_known:
        continue
    
    # Check if AMC is a substring of scheme_name (excluding the first word)
    # This indicates AMC was extracted FROM the scheme name rather than being a clean field
    sn_lower = sn.lower()
    amc_lower = amc.lower().strip()
    if amc_lower and amc_lower in sn_lower and count < 20:
        print(f"  {sc}: AMC=[{amc}] appears in scheme_name=[{sn[:60]}]")
        count += 1

print(f"\nTotal with AMC in scheme_name: {count}")
