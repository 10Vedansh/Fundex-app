#!/usr/bin/env python3
"""Search AMFI for AUM data sources."""
import requests, re

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0'})

# Search AMFI homepage for AUM links
r = session.get('https://www.amfiindia.com/', timeout=20)
aum_links = re.findall(r'href=[\'"]([^\'"]*aum[^\'"]*)[\'"]', r.text, re.I)
print('AUM links on AMFI homepage:')
for link in aum_links[:20]:
    print(f'  {link}')

download_links = re.findall(r'href=[\'"]([^\'"]*download[^\'"]*)[\'"]', r.text, re.I)
print(f'\nDownload links: {len(download_links)}')
for link in download_links[:10]:
    print(f'  {link}')

# Try portal.amfiindia.com AUM download
r2 = session.get('https://portal.amfiindia.com/MFDataDownload/AUMDataDownload.aspx', timeout=20)
print(f'\nAUM portal: {r2.status_code}, {len(r2.text)} chars')
if r2.status_code == 200:
    print(f'  {r2.text[:500]}')

# Check for expense ratio data sources
print('\n--- Expense Ratio Sources ---')
# Try old AMFI expense ratio URL  
urls = [
    'https://www.amfiindia.com/research-information/expense-ratio',
    'https://www.amfiindia.com/expense-ratio',
    'https://portal.amfiindia.com/MFDataDownload/ExpenseDataDownload.aspx',
]
for url in urls:
    r3 = session.get(url, timeout=20)
    print(f'{url}: {r3.status_code}, {len(r3.text)} chars')

# Try the MFAPI expense ratio endpoint if exists
print('\n--- mfapi.in check ---')
r4 = session.get('https://api.mfapi.in/mf/120539', timeout=15)
if r4.status_code == 200:
    data = r4.json()
    print(f'mfapi.in 120539 keys: {list(data.keys())}')
    meta = data.get('meta', {})
    print(f'meta keys: {list(meta.keys())}')
    print(f'meta: {meta}')
