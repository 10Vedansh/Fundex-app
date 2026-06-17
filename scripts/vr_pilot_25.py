#!/usr/bin/env python3
"""
VR API Pilot — prove VR JSON API works on 25 recommendation_universe funds.

Pipeline:
  1. Fetch 25 funds from recommendation_universe (stratified by AMC)
  2. Build VR fund ID index by crawling AMC listing pages
  3. Match fund names → VR fund IDs (normalized name matching)
  4. Fetch VR /api/funds/{id}/ → expense_ratio + AUM
  5. Save results to CSV, print match rate + coverage

Does NOT write to database.
"""

import os, sys, json, re, csv, time
from datetime import datetime, timezone
from typing import Optional
import requests

sys.stdout.reconfigure(encoding='utf-8')

SUPABASE_URL = 'https://skvvltawshbphrgnqjzf.supabase.co'
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
if not SERVICE_ROLE:
    print("FATAL: SUPABASE_SERVICE_ROLE_KEY not set")
    sys.exit(1)

HEADERS = {"apikey": SERVICE_ROLE, "Authorization": f"Bearer {SERVICE_ROLE}"}
VR_BASE = 'https://www.valueresearchonline.com'
VR_DELAY = 3.5   # seconds between VR page requests
VR_API_DELAY = 2.5  # seconds between VR API calls

RESULTS_FILE = 'reports/phase5/vr_api_pilot_25.csv'
PILOT_SIZE = 25

_SESSION = requests.Session()
_SESSION.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
})

def http_get(url: str, timeout: int = 20) -> Optional[dict]:
    for attempt in range(3):
        try:
            r = _SESSION.get(url, timeout=timeout)
            body = r.text
            if r.status_code == 403 and attempt < 2:
                wait = 10 * (attempt + 1)
                print(f'    ⚠ 403 on {url[:80]}..., retry {attempt+1} in {wait}s')
                time.sleep(wait)
                continue
            return {'status': r.status_code, 'body': body, 'url': url}
        except Exception as e:
            if attempt < 2:
                time.sleep(5)
                continue
            return {'status': 0, 'body': '', 'url': url, 'error': str(e)}
    return {'status': 0, 'body': '', 'url': url, 'error': 'Max retries'}

# ── Step 1: Fetch 25 sample funds ─────────────────────────────────────
def get_sample_funds(n: int) -> list:
    r = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe', headers=HEADERS,
                     params={'select': 'scheme_code,scheme_name,amc,expense_ratio,aum,fund_manager',
                             'order': 'scheme_code', 'limit': 2000}, timeout=30)
    all_funds = r.json()
    
    # Group by AMC, take 1-2 per AMC up to n
    amc_groups = {}
    for f in all_funds:
        amc = f.get('amc', '') or 'Unknown'
        if amc not in amc_groups:
            amc_groups[amc] = []
        amc_groups[amc].append(f)
    
    sample = []
    # Prioritize larger AMCs
    sorted_amcs = sorted(amc_groups.items(), key=lambda x: -len(x[1]))
    
    # Take 2 from each of the top 12 AMCs, 1 from the next one
    for amc, funds in sorted_amcs:
        if len(sample) >= n:
            break
        if len(amc) < 3 or 'CRISIL' in amc or 'NIFTY' in amc:
            continue
        take = min(2, n - len(sample))
        sample.extend(funds[:take])
    
    # Fill remaining with any funds
    if len(sample) < n:
        remaining = [f for f in all_funds if f not in sample]
        sample.extend(remaining[:n - len(sample)])
    
    return sample[:n]

# ── Step 2: Build VR AMC list ────────────────────────────────────────
def get_vr_amc_list() -> list:
    print('  Fetching VR AMC list...')
    result = http_get(f'{VR_BASE}/api/funds/')
    if result and result['body']:
        try:
            data = json.loads(result['body'])
            amcs = data.get('amc-list', [])
            if amcs:
                print(f'  Found {len(amcs)} AMCs')
                return amcs
        except:
            pass
    # Fallback: check for amc-list in raw body
    if result and result['body'] and 'amc-list' in result['body']:
        import re
        match = re.search(r'"amc-list"\s*:\s*(\[[\s\S]*?\])', result['body'])
        if match:
            try:
                return json.loads(match.group(1))
            except:
                pass
    print(f'  AMC fetch failed: status={result["status"] if result else "?"}, body_len={len(result.get("body","")) if result else 0}')
    return []

# ── Step 2b: Get fund IDs for one AMC ────────────────────────────────
def get_amc_funds(amc_id: str, slug: str) -> list:
    url = f'{VR_BASE}/funds/selector-data/fund-house/{amc_id}/{slug}/'
    result = http_get(url)
    if not result:
        print(f'  [no response]', end='', flush=True)
        return []
    
    if result['status'] != 200:
        print(f'  [{result["status"]}]', end='', flush=True)
        html_url = f'{VR_BASE}/funds/selector/fund-house/{amc_id}/{slug}/'
        print(f'tryHTML...', end='', flush=True)
        time.sleep(VR_DELAY + 2)
        result = http_get(html_url)
        if not result or result['status'] != 200:
            print(f' {result["status"]}', end='', flush=True)
            return []
    else:
        print(f'  [200]', end='', flush=True)
    
    html = ''
    try:
        parsed = json.loads(result['body'])
        html = parsed.get('html_data', '') if isinstance(parsed, dict) else result['body']
    except:
        html = result['body']
    
    if not html:
        return []
    
    # Extract fund IDs and slugs from /funds/<id>/<slug> URL pattern
    # The slug IS the normalized fund name — use it for matching
    fund_map = {}  # id -> slug (deduplicate)
    for m in re.finditer(r'/funds/(\d+)/([a-z0-9-]+)', html):
        fid = m.group(1)
        fslug = m.group(2)
        if fid not in fund_map:
            fund_map[fid] = {'slug': fslug, 'short_name': ''}
    
    # Try to get display names from <a> tags
    for fid, finfo in fund_map.items():
        nm = re.search(
            r'<a[^>]*href=["\']/funds/' + fid + r'/' + re.escape(finfo['slug']) + r'["\'][^>]*>\s*([^<]+)\s*<',
            html, re.I)
        if nm:
            finfo['short_name'] = nm.group(1).strip()
    
    return [{'vr_fund_id': k, **v} for k, v in fund_map.items()]

# ── Step 2c: Build VR fund index ─────────────────────────────────────
def build_vr_index(amcs: list, target_amcs: set) -> dict:
    print(f'  Building VR fund index for {len(target_amcs)} target AMCs...')
    index = {}
    for a in amcs:
        aname = (a.get('amc_short_name', '') or '').lower()
        afull = (a.get('amc_full_name', '') or '').lower()
        amatched = False
        for ta in target_amcs:
            tl = ta.lower()
            if tl in aname or tl in afull or aname in tl or afull in tl:
                amatched = True
                break
        if not amatched:
            continue
        print(f'    {a.get("amc_short_name")} (id={a["amc_id"]})...', end=' ', flush=True)
        funds = get_amc_funds(a['amc_id'], a['slug'])
        for f in funds:
            # Use full_name for broader AMC matching (DB may use long form like "Aditya Birla Sun Life")
            f['amc'] = a.get('amc_full_name', a.get('amc_short_name', ''))
            index[f['vr_fund_id']] = f
        print(f'{len(funds)} funds')
        # Longer delay between AMC pages to avoid Cloudflare
        time.sleep(VR_DELAY + 1)
    print(f'  Total VR funds indexed: {len(index)}')
    # Debug: show a few VR fund names
    print(f'  Sample VR funds:')
    for fid in list(index.keys())[:5]:
        f = index[fid]
        print(f'    ID={fid}: slug={f["slug"]}, name="{f["short_name"]}"')
    return index

# ── Step 3: Name matching ────────────────────────────────────────────
def normalize(name: str) -> str:
    if not name: return ''
    n = name.lower()
    for s in ['- direct plan', '- regular plan', ' - growth', ' - dividend',
              ' - idcw', ' - bonus', ' fund', ' direct', ' regular',
              ' - direct', ' - regular']:
        n = n.replace(s, '')
    n = re.sub(r'[^a-z0-9\s-]', '', n)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def name_to_slug(name: str) -> str:
    if not name: return ''
    n = name.lower().strip()
    n = re.sub(r'[^a-z0-9\s-]', '', n)
    n = re.sub(r'\s+', '-', n).strip('-')
    return n

def core_slug_of(name_slug: str) -> str:
    """Strip plan/option/distribution suffixes from a slug to get the core fund name."""
    # Order matters: remove longer/more specific patterns first
    patterns = [
        r'-?daily[- ]idcw[- ]?reinvestment\b',
        r'-?weekly[- ]idcw[- ]?reinvestment\b',
        r'-?quarterly[- ]idcw[- ]?reinvestment\b',
        r'-?half[- ]yearly[- ]idcw[- ]?reinvestment\b',
        r'-?annual[- ]idcw[- ]?reinvestment\b',
        r'-?monthly[- ]idcw[- ]?reinvestment\b',
        r'-?daily[- ]income[- ]distribution[- ]?cum[- ]?capital[- ]?withdrawal\b',
        r'-?income[- ]distribution[- ]?cum[- ]?capital[- ]?withdrawal\b',
        r'-?income[- ]distribution[- ]?cum[- ]?withdrawal\b',
        r'-?payout[- ]of[- ]idcw[- ]?option\b',
        r'-?idcw[- ]?option\b',
        r'-?growth[- ]?plan[- ]?growth[- ]?option\b',
        r'-?growth[- ]?option\b',
        r'-?quarterly[- ]reinvestment\b',
        r'-?semi[- ]annual[- ]idcw\b',
        r'-semi[- ]annual\b',
        r'-?half[- ]?yearly\b',
        r'-quarterly\b',
        r'-weekly\b',
        r'-daily\b',
        r'-monthly\b',
        r'-annual\b',
        r'-?direct[- ]plan\b',
        r'-?regular[- ]plan\b',
        r'-?regular\b',
        r'-?retail[- ]plan\b',
        r'-?retail\b',
        r'-?growth\b',
        r'-?dividend\b',
        r'-?idcw\b',
        r'-?bonus\b',
        r'-?payout\b',
        r'-?reinvestment\b',
        r'-?income\b',
        r'-?distribution\b',
        r'-?cum\b',
        r'-?of\b',
        r'-?the\b',
        r'-?capital\b',
        r'-?withdrawal\b',
        r'-?plan\b',
        r'-?option\b',
        r'-?mini\b',
    ]
    core = name_slug
    for p in patterns:
        core = re.sub(p, '', core)
    core = re.sub(r'[-]+', '-', core).strip('-')
    return core


def match_fund(scheme_name: str, fund_house: str, vr_index: dict) -> Optional[str]:
    if not scheme_name:
        return None
    
    slug = re.sub(r'-+', '-', name_to_slug(scheme_name)).strip('-')
    core = core_slug_of(slug)
    fh = (fund_house or '').lower().strip()
    fh = re.sub(r'\s+', ' ', fh)
    
    debug_list = []
    
    for fid, finfo in vr_index.items():
        vamc = (finfo.get('amc', '') or '').lower().strip()
        if fh and vamc:
            if fh not in vamc and vamc not in fh:
                continue
        
        vslug = re.sub(r'-+', '-', finfo.get('slug', '').lower()).strip('-')
        if not vslug:
            continue
        vcore = core_slug_of(vslug)
        
        # 1. Exact slug match
        if vslug == slug:
            return fid
        
        # 2. Core name match (exact or hyphenation-tolerant)
        if len(core) >= 10:
            if core == vcore:
                return fid
            # Hyphen-agnostic: midcap vs mid-cap → both normalize same
            if core.replace('-', '') == vcore.replace('-', ''):
                return fid
        
        # 3. Slug containment (one way)
        if len(slug) >= 15 and len(vslug) >= 15:
            if slug in vslug or vslug in slug:
                return fid
        
        # Track candidate
        c1, c2 = set(core.split('-')), set(vcore.split('-'))
        common = c1 & c2
        if len(common) >= 3 and len(c1) >= 3 and len(c2) >= 3:
            ratio = len(common) / min(len(c1), len(c2))
            debug_list.append((ratio, fid, vslug, vcore, vamc))
    
    if debug_list:
        best_ratio, best_fid, best_vslug, best_vcore, best_vamc = max(debug_list, key=lambda x: x[0])
        if best_ratio >= 0.85:
            return best_fid
        # Debug: print top 5 candidates
        sys.stderr.write(f'\n   [DEBUG] core="{core[:50]}" fh="{fh}" best_ratio={best_ratio:.2f} best_vcore="{best_vcore[:40]}" best_vamc="{best_vamc}" best_slug="{best_vslug[:50]}"\n')
    
    return None

# ── Step 4: Fetch VR API for a fund ──────────────────────────────────
def fetch_vr_metadata(vr_fund_id: str) -> dict:
    url = f'{VR_BASE}/api/funds/{vr_fund_id}/'
    raw = {'status': None, 'body_preview': ''}
    
    # Retry up to 3 times for transient failures
    result = None
    for attempt in range(3):
        result = http_get(url)
        if result and result['status'] == 200:
            break
        if result and result['status'] == 403 and attempt < 2:
            print(f'[403, retry {attempt+1}]', end='', flush=True)
            raw['status'] = 403
            time.sleep(10 * (attempt + 1))
        else:
            break
    
    if not result or result['status'] != 200:
        raw['status'] = result.get('status') if result else 0
        raw['body_preview'] = (result.get('body', '')[:500] if result else '') or str(result.get('error', ''))[:500]
        return {'expense_ratio': None, 'aum': None, 'fund_manager': None, 'raw_response': raw}
    
    raw['status'] = 200
    raw['body_preview'] = result['body'][:500]
    
    try:
        data = json.loads(result['body'])
    except:
        raw['body_preview'] = result['body'][:500]
        return {'expense_ratio': None, 'aum': None, 'fund_manager': None, 'raw_response': raw}
    
    out = {'expense_ratio': None, 'aum': None, 'fund_manager': None, 'raw_response': raw}
    
    # Navigate to data.more_details_data.data[]
    d = data.get('data', {}) if isinstance(data, dict) else data
    mdd = d.get('more_details_data', {}) if isinstance(d, dict) else {}
    if isinstance(mdd, dict):
        items = mdd.get('data', [])
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    title = (item.get('title') or '').lower()
                    val_raw = item.get('data')
                    if not val_raw or str(val_raw).strip() in ('', 'N/A', 'n/a'):
                        continue
                    if title == 'base expense ratio':
                        try:
                            out['expense_ratio'] = float(str(val_raw).replace(',', '').replace('%', ''))
                        except: pass
                    elif title == 'assets':
                        try:
                            out['aum'] = float(str(val_raw).replace(',', '').replace('Cr', '').strip())
                        except: pass
    
    # Fund manager
    fmd = d.get('fund_manager_data', {}) if isinstance(d, dict) else {}
    if isinstance(fmd, dict):
        mgrs = fmd.get('managers', [])
        if isinstance(mgrs, list) and mgrs:
            names = [m.get('person_name', '') for m in mgrs if isinstance(m, dict) and m.get('person_name')]
            if names:
                out['fund_manager'] = '; '.join(names)
    
    return out

# ── Main ─────────────────────────────────────────────────────────────
def main():
    t0 = time.time()
    print('=' * 60)
    print('VR API PILOT — 25 FUNDS')
    print('=' * 60)
    
    # Step 1: Get sample
    print(f'\n[1/4] Fetching {PILOT_SIZE} sample funds...')
    sample = get_sample_funds(PILOT_SIZE)
    print(f'  Got {len(sample)} funds from {len(set(f.get("amc","?") for f in sample))} AMCs')
    for f in sample:
        print(f'    {f["scheme_code"]}: {f["scheme_name"][:60]}')
    
    # Step 2: Build VR index
    print(f'\n[2/4] Building VR fund index...')
    amcs = get_vr_amc_list()
    print(f'  Found {len(amcs)} VR AMCs')
    
    target_amcs = set()
    for f in sample:
        fh = f.get('amc', '') or ''
        if fh:
            target_amcs.add(fh)
    print(f'  Target AMCs: {len(target_amcs)}')
    
    print(f'  Waiting {VR_DELAY}s before first AMC crawl (to avoid Cloudflare rate limit)...')
    time.sleep(VR_DELAY)
    vr_index = build_vr_index(amcs, target_amcs)
    if not vr_index:
        print('  WARNING: No VR funds indexed!')
    
    # Step 3 & 4: Match and fetch
    print(f'\n[3/4] Matching and fetching VR API data...')
    results = []
    matched = 0
    api_calls = 0
    api_ok = 0
    api_403 = 0
    
    for i, fund in enumerate(sample):
        sc = fund['scheme_code']
        sn = fund.get('scheme_name', '') or ''
        fh = fund.get('amc', '') or ''
        
        print(f'  [{i+1}/{len(sample)}] {sc} {sn[:45]}... fh=[{fh}]', end=' ', flush=True)
        
        vr_fid = match_fund(sn, fh, vr_index)
        if not vr_fid:
            # Debug: check if fund_house AMC was indexed at all
            slug_check = name_to_slug(sn)
            print(f'NO MATCH [slug={slug_check[:40]}]', end='', flush=True)
            results.append({
                'scheme_code': sc, 'scheme_name': sn, 'amc': fh,
                'vr_fund_id': '', 'aum': '', 'expense_ratio': '',
                'fund_manager': '', 'match_status': 'NO_MATCH', 'raw_api': ''
            })
            continue
        
        print(f'ID={vr_fid}', end=' ', flush=True)
        matched += 1
        
        # Fetch from VR API
        api_calls += 1
        meta = fetch_vr_metadata(vr_fid)
        if meta['expense_ratio'] is not None or meta['aum'] is not None:
            api_ok += 1
        if meta['raw_response'].get('status') == 403:
            api_403 += 1
        
        er = meta['expense_ratio']
        aum = meta['aum']
        fm = meta.get('fund_manager', '')
        raw_preview = json.dumps(meta['raw_response'])[:200]
        
        print(f'ER={er} AUM={aum}', end='')
        if er is None and aum is None:
            print(' (no data)', end='')
        print()
        
        results.append({
            'scheme_code': sc, 'scheme_name': sn, 'amc': fh,
            'vr_fund_id': vr_fid,
            'aum': str(aum) if aum is not None else '',
            'expense_ratio': str(er) if er is not None else '',
            'fund_manager': fm or '',
            'match_status': 'SUCCESS' if (er is not None or aum is not None) else 'NO_DATA',
            'raw_api': str(meta['raw_response'].get('body_preview', ''))[:300]
        })
        
        time.sleep(VR_API_DELAY)
    
    elapsed = time.time() - t0
    
    # Stats
    er_found = sum(1 for r in results if r['expense_ratio'])
    aum_found = sum(1 for r in results if r['aum'])
    any_found = sum(1 for r in results if r['expense_ratio'] or r['aum'])
    
    print(f'\n{"="*60}')
    print('RESULTS')
    print(f'{"="*60}')
    print(f'  Funds attempted:     {len(results)}')
    print(f'  Matched to VR ID:   {matched} ({matched/len(results)*100:.1f}%)')
    print(f'  API calls:          {api_calls} ({api_ok} ok, {api_403} 403)')
    print(f'  expense_ratio found: {er_found} ({er_found/len(results)*100:.1f}%)')
    print(f'  AUM found:          {aum_found} ({aum_found/len(results)*100:.1f}%)')
    print(f'  Any data found:     {any_found} ({any_found/len(results)*100:.1f}%)')
    print(f'  Total runtime:      {elapsed:.1f}s ({elapsed/60:.1f}min)')
    
    # Save CSV
    os.makedirs('reports/phase5', exist_ok=True)
    with open(RESULTS_FILE, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=[
            'scheme_code', 'scheme_name', 'amc', 'vr_fund_id',
            'aum', 'expense_ratio', 'fund_manager', 'match_status', 'raw_api'
        ])
        w.writeheader()
        w.writerows(results)
    print(f'\n  Results saved to {RESULTS_FILE}')
    
    # Show 3 successful fund JSON responses
    print(f'\n{"="*60}')
    print('SAMPLE API RESPONSES (first 3 successful)')
    print(f'{"="*60}')
    successes = [r for r in results if r['match_status'] == 'SUCCESS']
    for r in successes[:3]:
        print(f'\n--- scheme_code={r["scheme_code"]} VR ID={r["vr_fund_id"]} ---')
        # Re-fetch the raw response
        meta = fetch_vr_metadata(r['vr_fund_id'])
        print(f'Endpoint: GET {VR_BASE}/api/funds/{r["vr_fund_id"]}/')
        print(f'Full JSON:')
        print(json.dumps(meta, indent=2, default=str)[:1500])
        time.sleep(VR_API_DELAY)


if __name__ == '__main__':
    main()
