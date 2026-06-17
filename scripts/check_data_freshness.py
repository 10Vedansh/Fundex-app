#!/usr/bin/env python3
"""Fetch full VR API JSON payloads for 5 funds and inspect date/freshness fields."""
import os, sys, json, re, time
import requests

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))

VR_BASE = 'https://www.valueresearchonline.com'
VR_API_DELAY = 2.5

_SESSION = requests.Session()
_SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
})

TEST_FUNDS = [
    ('102885', 'SBI Equity Hybrid Fund'),           # large AUM fund
    ('100874', 'HDFC Liquid Fund'),                  # liquid fund (frequent NAV)
    ('100348', 'ICICI Prudential Large & Mid Cap'),  # equity fund
    ('100641', 'SBI Ultra Short Duration Fund'),     # debt fund (was ITI-corrupted)
    ('100618', 'Sundaram Money Fund'),               # money market fund
]

DATE_PATTERNS = re.compile(
    r'(as_on_date|as_on|aum_date|nav_date|expense_ratio_date|'
    r'last_updated|last_update|updated_on|created_on|'
    r'portfolio_date|holding_date|data_as_of|date|'
    r'timestamp|as_at|as_of|effective_date)', re.I
)

def http_get_json(url: str) -> dict:
    for attempt in range(3):
        try:
            r = _SESSION.get(url, timeout=20)
            if r.status_code == 200:
                return r.json()
            if r.status_code == 403 and attempt < 2:
                time.sleep(10 * (attempt + 1))
        except Exception:
            if attempt < 2:
                time.sleep(5)
    return {}

def find_date_fields(obj: dict, path: str = '', results: list = None) -> list:
    if results is None:
        results = []
    for k, v in obj.items():
        k_lower = k.lower()
        current_path = f'{path}.{k}' if path else k
        if DATE_PATTERNS.search(k_lower) and isinstance(v, str):
            results.append((current_path, v))
        if isinstance(v, dict):
            find_date_fields(v, current_path, results)
        elif isinstance(v, list):
            for i, item in enumerate(v):
                if isinstance(item, dict):
                    find_date_fields(item, f'{current_path}[{i}]', results)
    return results

def main():
    print('=' * 80)
    print('VR API DATA FRESHNESS INSPECTION')
    print('=' * 80)
    
    for sc, name in TEST_FUNDS:
        # Get VR fund ID from CSV
        url = f'{VR_BASE}/api/funds/'
        # Just test a known VR fund ID directly using scheme search
        # Use the existing match: the 25-pilot and 250-pilot both used match_fund
        # Let me try a different approach - fetch the API for known VR IDs
        
        time.sleep(VR_API_DELAY)

    # Instead, let's use the fund IDs we already know from the pilot
    known_vr_ids = [16230, 17516, 16780, 16890, 37726]  # SBI Medium, SBI Cons, Invesco Liquid, SBI Ultra Short, Sundaram Money
    
    for vid in known_vr_ids:
        print(f'\n--- VR Fund ID: {vid} ---')
        url = f'{VR_BASE}/api/funds/{vid}/'
        data = http_get_json(url)
        
        if not data:
            print(f'  FAILED to fetch {url}')
            continue
        
        # Print top-level keys with lengths
        print(f'  Top-level keys: {list(data.keys())[:15]}...')
        
        if 'data' in data and isinstance(data['data'], dict):
            d = data['data']
            print(f'  data keys: {list(d.keys())[:15]}...')
            
            date_fields = find_date_fields(d)
            if date_fields:
                print(f'  Date/freshness fields found:')
                for path, val in date_fields[:20]:
                    print(f'    {path}: {val}')
            else:
                print(f'  NO date/freshness fields found in data')
            
            # Check more_details_data for dates
            more = d.get('more_details_data', {})
            print(f'  more_details_data keys: {list(more.keys())[:10]}...')
            if isinstance(more, dict):
                more_dates = find_date_fields(more)
                if more_dates:
                    for path, val in more_dates[:10]:
                        print(f'    {path}: {val}')
            
            # Check plan_navs_data
            navs = d.get('plan_navs_data', {})
            if isinstance(navs, dict) and navs:
                print(f'  plan_navs_data keys: {list(navs.keys())[:10]}...')
                nav_dates = find_date_fields(navs)
                if nav_dates:
                    for path, val in nav_dates[:10]:
                        print(f'    {path}: {val}')
            
            # Print expense_ratio and aum specifically
            print(f'  Expense ratio: {more.get("expense_ratio", "N/A")}')
            
            # Show first 500 chars of raw response for inspection
            raw = json.dumps(data, default=str)
            # Find date-like strings in the raw JSON
            date_matches = re.findall(
                r'"[^"]*(?:date|time|as_on|updated|as_of|as_at|timestamp)[^"]*"\s*:\s*"[^"]*"',
                raw[:5000], re.I
            )
            if date_matches:
                print(f'  Date strings in raw JSON (first 5000 chars):')
                for m in date_matches[:10]:
                    print(f'    {m}')
        
        time.sleep(VR_API_DELAY)

if __name__ == '__main__':
    main()
