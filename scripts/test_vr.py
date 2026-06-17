#!/usr/bin/env python3
"""Test Value Research Online search and scraping."""
import urllib.request, urllib.parse, ssl, re

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

fund_name = 'SBI Nifty 50 Equal Weight Index Fund Direct Plan'
url = f'https://www.valueresearchonline.com/search/?q={urllib.parse.quote(fund_name[:80])}'

req = urllib.request.Request(
    url,
    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
)
resp = urllib.request.urlopen(req, timeout=20, context=ctx)
html = resp.read().decode('utf-8', errors='replace')

print(f'Response size: {len(html)} bytes')
print(f'Is captcha: {"captcha" in html.lower() or "blocked" in html.lower()}')
print(f'Has /funds/: {"/funds/" in html}')

# Find all /funds/ URLs
fund_urls = re.findall(r'/funds/(\d+)/([a-z0-9-]+)', html)
print(f'Fund URLs found: {len(fund_urls)}')
for fid, slug in fund_urls[:5]:
    print(f'  /funds/{fid}/{slug}')

# Try to find expense ratio
exp = re.search(r'[Ee]xpense\s*[Rr]atio[:\s]*([\d.]+)\s*%', html)
print(f'Expense ratio in search page: {exp.group(1) if exp else "NOT FOUND"}')

aum = re.search(r'AUM[:\s]*[Rupee]*\s*([\d,]+[\d.]*)\s*Cr', html)
print(f'AUM in search page: {aum.group(1) if aum else "NOT FOUND"}')

# If fund URLs found, try the first fund page directly
if fund_urls:
    fid, slug = fund_urls[0]
    fund_url = f'https://www.valueresearchonline.com/funds/{fid}/{slug}'
    print(f'\nFetching fund page: {fund_url}')
    import time
    time.sleep(0.5)
    req2 = urllib.request.Request(fund_url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})
    resp2 = urllib.request.urlopen(req2, timeout=20, context=ctx)
    html2 = resp2.read().decode('utf-8', errors='replace')
    print(f'Fund page size: {len(html2)} bytes')
    
    exp2 = re.search(r'[Ee]xpense\s*[Rr]atio[:\s]*([\d.]+)\s*%', html2)
    print(f'Expense ratio: {exp2.group(1) if exp2 else "NOT FOUND"}')
    
    aum2 = re.search(r'AUM[:\s]*[Rupee]*\s*([\d,]+[\d.]*)\s*Cr', html2)
    print(f'AUM: {aum2.group(1) if aum2 else "NOT FOUND"}')
    
    fm2 = re.search(r'Fund\s*House[:\s]*([A-Za-z\s.&]+?)(?:<|\n|\r)', html2)
    print(f'Fund House: {fm2.group(1).strip() if fm2 else "NOT FOUND"}')
    
    # Also look for JSON-LD data
    import json
    jd = re.search(r'<script type="application/ld\+json">(.*?)</script>', html2, re.DOTALL)
    if jd:
        try:
            data = json.loads(jd.group(1))
            print(f'JSON-LD data: {json.dumps(data, indent=2)[:500]}')
        except:
            pass
    
    # Save HTML for analysis
    with open('reports/phase5/vr_fund_page_sample.html', 'w', encoding='utf-8') as f:
        f.write(html2[:50000])
    print(f'Saved first 50K chars of fund page to reports/phase5/vr_fund_page_sample.html')
