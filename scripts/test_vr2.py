#!/usr/bin/env python3
"""Test Value Research with proper requests session."""

import requests
import re
import ssl

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
})

# Test VR homepage first
r = session.get('https://www.valueresearchonline.com', timeout=15)
print(f'VR Homepage: {r.status_code}, size={len(r.content)}')

# Now test search with various fund names
fund_names = [
    'SBI Nifty 50 Equal Weight Index Fund Direct Plan',
    'HDFC Mid-Cap Opportunities Fund Direct Plan Growth',
    'Axis Bluechip Fund Direct Plan Growth',
    'Kotak Emerging Equity Fund Direct Plan Growth',
]

for name in fund_names:
    r2 = session.get('https://www.valueresearchonline.com/search/', params={'q': name[:80]}, timeout=20)
    print(f'\nSearch "{name[:40]}...": {r2.status_code}, size={len(r2.text)}, captcha={"captcha" in r2.text.lower()}')

    fund_urls = re.findall(r'/funds/(\d+)/([a-z0-9-]+)', r2.text)
    print(f'  Fund URLs: {len(fund_urls)}')
    for fid, slug in fund_urls[:2]:
        print(f'    /funds/{fid}/{slug}')

    exp = re.search(r'[Ee]xpense\s*[Rr]atio[:\s]*([\d.]+)\s*%', r2.text)
    print(f'  Expense: {exp.group(1) if exp else "NOT FOUND"}')

    # Check JSON-LD data
    import json
    jd = re.search(r'<script type="application/ld\+json">(.*?)</script>', r2.text, re.DOTALL)
    if jd:
        try:
            data = json.loads(jd.group(1))
            if isinstance(data, dict):
                print(f'  JSON-LD: {data.get("name", "N/A")}')
        except:
            pass

print('\n--- Trying direct fund page for first match ---')
for name in fund_names[:1]:
    r2 = session.get('https://www.valueresearchonline.com/search/', params={'q': name[:80]}, timeout=20)
    fund_urls = re.findall(r'/funds/(\d+)/([a-z0-9-]+)', r2.text)
    if fund_urls:
        fid, slug = fund_urls[0]
        fund_url = f'https://www.valueresearchonline.com/funds/{fid}/{slug}'
        import time
        time.sleep(0.5)
        r3 = session.get(fund_url, timeout=20)
        print(f'Fund page: {r3.status_code}, size={len(r3.text)}')

        if r3.status_code == 200:
            exp3 = re.search(r'[Ee]xpense\s*[Rr]atio[:\s]*([\d.]+)\s*%', r3.text)
            print(f'  Expense: {exp3.group(1) if exp3 else "NOT FOUND"}')

            aum3 = re.search(r'AUM[:\s]*[RupeeRs]*\s*([\d,]+[\d.]*)\s*Cr', r3.text)
            print(f'  AUM: {aum3.group(1) if aum3 else "NOT FOUND"}')

            # Try to find Fund Manager / Fund House
            fm = re.search(r'Fund\s*(?:Manager|House)[:\s]*([A-Za-z\s.&]+?)(?:<|\n|\r)', r3.text)
            print(f'  Fund House: {fm.group(1).strip() if fm else "NOT FOUND"}')

            # Save the page for analysis
            with open('reports/phase5/vr_fund_page.html', 'w', encoding='utf-8') as f:
                f.write(r3.text)
            print('  Saved to reports/phase5/vr_fund_page.html')
