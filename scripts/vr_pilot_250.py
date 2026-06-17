#!/usr/bin/env python3
"""
VR API Pilot — 250 recommendation_universe funds.

Pipeline:
  1. Fetch up to 4000 funds from Supabase, stratify by AMC, sample 250
  2. Build VR fund ID index (crawl all target AMC pages)
  3. Match fund names → VR fund IDs, fetch /api/funds/{id}/ for each
  4. Save reports/phase5/vr_api_pilot_250.csv
  5. Print categorized stats, coverage estimate, runtime projection

Does NOT write to database.
"""

import os, sys, json, re, csv, time, random
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
VR_DELAY = 3.5
VR_API_DELAY = 2.5
PILOT_SIZE = 250
RESULTS_FILE = 'reports/phase5/vr_api_pilot_250.csv'
SAMPLE_FILE = 'reports/phase5/vr_api_pilot_250_sample_payloads.json'

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
                time.sleep(wait)
                continue
            return {'status': r.status_code, 'body': body, 'url': url}
        except Exception as e:
            if attempt < 2:
                time.sleep(5)
                continue
            return {'status': 0, 'body': '', 'url': url, 'error': str(e)}
    return {'status': 0, 'body': '', 'url': url, 'error': 'Max retries'}


# ── Step 1: Sample ────────────────────────────────────────────────────
def get_samples(n: int) -> list:
    all_funds = []
    offset = 0
    while True:
        r = requests.get(f'{SUPABASE_URL}/rest/v1/recommendation_universe', headers=HEADERS,
            params={'select': 'scheme_code,scheme_name,amc,expense_ratio,aum,fund_manager',
                    'order': 'scheme_code', 'limit': 2000, 'offset': offset}, timeout=30)
        batch = r.json()
        if not batch:
            break
        all_funds.extend(batch)
        offset += len(batch)
        if len(batch) < 2000:
            break

    regular = [f for f in all_funds if f.get('amc')
               and 'CRISIL' not in (f.get('amc') or '') and 'NIFTY' not in (f.get('amc') or '')
               and 'BENCHMARK' not in (f.get('amc') or '')]

    amc_groups = {}
    for f in regular:
        amc = f.get('amc', 'Unknown')
        amc_groups.setdefault(amc, []).append(f)

    sorted_amcs = sorted(amc_groups.items(), key=lambda x: -len(x[1]))
    total_regular = len(regular)

    sample = []
    # Round-robin by AMC: take 1 per AMC per pass
    while len(sample) < n:
        any_added = False
        for amc, funds in sorted_amcs:
            if len(sample) >= n:
                break
            # Take next unused fund from this AMC
            taken = {f['scheme_code'] for f in sample}
            available = [f for f in funds if f['scheme_code'] not in taken]
            if available:
                sample.append(available.pop(0))
                any_added = True
        if not any_added:
            break  # exhausted

    return sample[:n], total_regular


# ── Step 2: VR AMC listing ────────────────────────────────────────────
def get_vr_amc_list() -> list:
    result = http_get(f'{VR_BASE}/api/funds/')
    if result and result['body']:
        try:
            data = json.loads(result['body'])
            amcs = data.get('amc-list', [])
            if amcs:
                return amcs
        except:
            pass
        if 'amc-list' in result['body']:
            m = re.search(r'"amc-list"\s*:\s*(\[[\s\S]*?\])', result['body'])
            if m:
                try:
                    return json.loads(m.group(1))
                except:
                    pass
    return []


# ── Step 2b: Fund IDs for one AMC ─────────────────────────────────────
def get_amc_funds(amc_id: str, slug: str) -> list:
    url = f'{VR_BASE}/funds/selector-data/fund-house/{amc_id}/{slug}/'
    result = http_get(url)
    if not result:
        return []
    if result['status'] != 200:
        html_url = f'{VR_BASE}/funds/selector/fund-house/{amc_id}/{slug}/'
        time.sleep(VR_DELAY + 2)
        result = http_get(html_url)
        if not result or result['status'] != 200:
            return []

    html = ''
    try:
        parsed = json.loads(result['body'])
        html = parsed.get('html_data', '') if isinstance(parsed, dict) else result['body']
    except:
        html = result['body']
    if not html:
        return []

    fund_map = {}
    for m in re.finditer(r'/funds/(\d+)/([a-z0-9-]+)', html):
        fid, fslug = m.group(1), m.group(2)
        if fid not in fund_map:
            fund_map[fid] = {'slug': fslug, 'short_name': ''}

    for fid, finfo in fund_map.items():
        nm = re.search(
            r'<a[^>]*href=["\']/funds/' + fid + r'/' + re.escape(finfo['slug']) +
            r'["\'][^>]*>\s*([^<]+)\s*<', html, re.I)
        if nm:
            finfo['short_name'] = nm.group(1).strip()

    return [{'vr_fund_id': k, **v} for k, v in fund_map.items()]


# ── Step 2c: Build index ──────────────────────────────────────────────
def build_vr_index(amcs: list, target_amcs: set) -> dict:
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
        funds = get_amc_funds(a['amc_id'], a['slug'])
        for f in funds:
            f['amc'] = a.get('amc_full_name', a.get('amc_short_name', ''))
            index[f['vr_fund_id']] = f
        time.sleep(VR_DELAY + 1)
    return index


# ── Name matching ─────────────────────────────────────────────────────
def name_to_slug(name: str) -> str:
    if not name: return ''
    n = name.lower().strip()
    n = re.sub(r'[^a-z0-9\s-]', '', n)
    n = re.sub(r'\s+', '-', n).strip('-')
    return n


def core_slug_of(name_slug: str) -> str:
    patterns = [
        r'-?daily[- ]idcw[- ]?reinvestment\b', r'-?weekly[- ]idcw[- ]?reinvestment\b',
        r'-?quarterly[- ]idcw[- ]?reinvestment\b', r'-?half[- ]yearly[- ]idcw[- ]?reinvestment\b',
        r'-?annual[- ]idcw[- ]?reinvestment\b', r'-?monthly[- ]idcw[- ]?reinvestment\b',
        r'-?daily[- ]income[- ]distribution[- ]?cum[- ]?capital[- ]?withdrawal\b',
        r'-?income[- ]distribution[- ]?cum[- ]?capital[- ]?withdrawal\b',
        r'-?income[- ]distribution[- ]?cum[- ]?withdrawal\b',
        r'-?payout[- ]of[- ]idcw[- ]?option\b', r'-?idcw[- ]?option\b',
        r'-?growth[- ]?plan[- ]?growth[- ]?option\b', r'-?growth[- ]?option\b',
        r'-?quarterly[- ]reinvestment\b', r'-?semi[- ]annual[- ]idcw\b',
        r'-semi[- ]annual\b', r'-?half[- ]?yearly\b',
        r'-quarterly\b', r'-weekly\b', r'-daily\b', r'-monthly\b', r'-annual\b',
        r'-?direct[- ]plan\b', r'-?regular[- ]plan\b', r'-?regular\b',
        r'-?retail[- ]plan\b', r'-?retail\b',
        r'-?growth\b', r'-?dividend\b', r'-?idcw\b', r'-?bonus\b', r'-?payout\b',
        r'-?reinvestment\b', r'-?income\b', r'-?distribution\b', r'-?cum\b', r'-?of\b',
        r'-?the\b', r'-?capital\b', r'-?withdrawal\b', r'-?plan\b', r'-?option\b', r'-?mini\b',
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
    fh = re.sub(r'\s+', ' ', (fund_house or '').lower().strip())

    best = None  # (ratio, fid)
    for fid, finfo in vr_index.items():
        vamc = (finfo.get('amc', '') or '').lower().strip()
        if fh and vamc:
            if fh not in vamc and vamc not in fh:
                continue
        vslug = re.sub(r'-+', '-', finfo.get('slug', '').lower()).strip('-')
        if not vslug:
            continue
        vcore = core_slug_of(vslug)

        if vslug == slug:
            return fid
        if len(core) >= 10:
            if core == vcore:
                return fid
            if core.replace('-', '') == vcore.replace('-', ''):
                return fid
        if len(slug) >= 15 and len(vslug) >= 15:
            if slug in vslug or vslug in slug:
                return fid

        c1, c2 = set(core.split('-')), set(vcore.split('-'))
        common = c1 & c2
        if len(common) >= 3 and len(c1) >= 3 and len(c2) >= 3:
            ratio = len(common) / min(len(c1), len(c2))
            if best is None or ratio > best[0]:
                best = (ratio, fid)

    if best and best[0] >= 0.85:
        return best[1]
    return None


# ── Step 4: Fetch VR API ──────────────────────────────────────────────
def fetch_vr_metadata(vr_fund_id: str) -> dict:
    url = f'{VR_BASE}/api/funds/{vr_fund_id}/'
    result = None
    for attempt in range(3):
        result = http_get(url)
        if result and result['status'] == 200:
            break
        if result and result['status'] == 403 and attempt < 2:
            time.sleep(10 * (attempt + 1))
        else:
            break

    raw = {'status': result.get('status') if result else 0, 'body_preview': ''}
    if not result or result['status'] != 200:
        raw['body_preview'] = (result.get('body', '')[:500] if result else '') or ''
        return {'expense_ratio': None, 'aum': None, 'fund_manager': None, 'raw_response': raw}

    raw['body_preview'] = result['body'][:500]
    try:
        data = json.loads(result['body'])
    except:
        return {'expense_ratio': None, 'aum': None, 'fund_manager': None, 'raw_response': raw}

    out = {'expense_ratio': None, 'aum': None, 'fund_manager': None, 'raw_response': raw}
    d = data.get('data', {}) if isinstance(data, dict) else data
    mdd = d.get('more_details_data', {}) if isinstance(d, dict) else {}
    if isinstance(mdd, dict):
        for item in (mdd.get('data', []) or []):
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

    fmd = d.get('fund_manager_data', {}) if isinstance(d, dict) else {}
    if isinstance(fmd, dict):
        mgrs = fmd.get('managers', [])
        if isinstance(mgrs, list) and mgrs:
            names = [m.get('person_name', '') for m in mgrs if isinstance(m, dict) and m.get('person_name')]
            if names:
                out['fund_manager'] = '; '.join(names)

    return out


# ── Unmatched categorization ──────────────────────────────────────────
# AMCs known to be missing or renamed in VR
MERGED_AMCS = {'principal mutual fund', 'principal', 'l&t mutual fund', 'l&t', 'lt',
               'tata mutual fund', 'edelweiss'}
VR_AMC_NAMES_CACHE = []  # populated after get_vr_amc_list


def is_etf(name: str) -> bool:
    n = name.upper()
    return bool(re.search(r'\bETF\b', n) or re.search(r'\bEXCHANGE TRADED', n))


def is_index(name: str) -> bool:
    n = name.upper()
    return bool(re.search(r'\bINDEX\b', n) or re.search(r'\bNIFTY\b', n)
                or re.search(r'\BSENSEX\b', n) or re.search(r'\BBSE\b', n)
                or re.search(r'\BNSE\b', n))


def build_vr_amc_map(vr_amcs: list) -> dict:
    """Map lowercased AMC name variants → VR AMC info dict."""
    amc_map = {}
    suffixes_to_strip = [' mutual fund', ' asset management company', ' asset management',
                         ' investment manager', ' advisors']
    for a in vr_amcs:
        short = (a.get('amc_short_name', '') or '').lower().strip()
        full = (a.get('amc_full_name', '') or '').lower().strip()
        stripped_full = full
        for suf in suffixes_to_strip:
            if stripped_full.endswith(suf):
                stripped_full = stripped_full[:-len(suf)]
                break
        entry = {
            'amc_id': a['amc_id'],
            'slug': a['slug'],
            'short_name': a.get('amc_short_name', ''),
            'full_name': a.get('amc_full_name', ''),
        }
        if short:
            amc_map.setdefault(short, entry)
        if full:
            amc_map.setdefault(full, entry)
        if stripped_full and stripped_full != full:
            amc_map.setdefault(stripped_full, entry)
        # First-word fallback for multi-word AMCs (e.g. "Kotak" → "Kotak Mahindra")
        for name_variant in [short, stripped_full]:
            if name_variant and ' ' in name_variant:
                fw = name_variant.split()[0]
                amc_map.setdefault(fw, entry)
    return amc_map


def derive_clean_amc(scheme_name: str, amc_map: dict) -> Optional[str]:
    """Find the VR AMC name variant that is a prefix of scheme_name."""
    if not scheme_name:
        return None
    sn = scheme_name.lower().strip()
    # Sort by length descending to match longest prefix first
    variants = sorted(amc_map.keys(), key=lambda x: -len(x))
    for variant in variants:
        if sn.startswith(variant):
            return variant
    return None


def categorize_unmatched(fund: dict, vr_amcs: list, clean_amc: str = '') -> str:
    name = fund.get('scheme_name') or ''

    if is_etf(name):
        return 'ETF'
    if is_index(name):
        return 'Index fund'

    amc = (clean_amc or '').lower().strip()
    db_amc = (fund.get('amc') or '').lower().strip()

    if amc:
        for a in vr_amcs:
            aname = (a.get('amc_short_name', '') or '').lower()
            afull = (a.get('amc_full_name', '') or '').lower()
            if amc in aname or amc in afull or aname in amc or afull in amc:
                return 'Naming mismatch'

    if any(ma in db_amc for ma in MERGED_AMCS):
        return 'Merged AMC'
    return 'AMC missing from VR'


# ── Main ──────────────────────────────────────────────────────────────
def main():
    t0 = time.time()
    print('=' * 70)
    print(f'VR API PILOT — {PILOT_SIZE} FUNDS')
    print('=' * 70)

    # Step 1: Sample
    print(f'\n[1/5] Sampling {PILOT_SIZE} funds from recommendation_universe...')
    sample, total_available = get_samples(PILOT_SIZE)
    print(f'  Sampled {len(sample)} funds from {len(set(f.get("amc","?") for f in sample))} AMCs')
    print(f'  (recommendation_universe total: ~{total_available})')

    # Step 2: Build VR index
    print(f'\n[2/5] Building VR fund index...')
    vr_amcs = get_vr_amc_list()
    print(f'  Found {len(vr_amcs)} VR AMCs')

    amc_map = build_vr_amc_map(vr_amcs)

    target_amcs = set()
    clean_amc_count = 0
    for f in sample:
        clean = derive_clean_amc(f.get('scheme_name', ''), amc_map)
        if clean:
            target_amcs.add(clean)
            clean_amc_count += 1
        f['_clean_amc'] = clean or ''
    print(f'  Target AMCs (clean): {len(target_amcs)}')

    print(f'  Waiting {VR_DELAY}s before first crawl...')
    time.sleep(VR_DELAY)
    vr_index = build_vr_index(vr_amcs, target_amcs)
    print(f'  VR index built: {len(vr_index)} funds from {len(target_amcs)} AMCs')
    if not vr_index:
        print('  FATAL: No VR funds indexed')
        sys.exit(1)

    # Step 3 & 4: Match + fetch
    print(f'\n[3/5] Matching and fetching VR API data...')
    results = []
    matched = 0
    api_calls = 0
    api_ok = 0
    api_403 = 0

    for i, fund in enumerate(sample):
        sc = fund['scheme_code']
        sn = fund.get('scheme_name', '') or ''
        clean_amc = fund.get('_clean_amc', '') or ''

        print(f'  [{i+1}/{len(sample)}] {sc} {sn[:40]}...', end=' ', flush=True)

        vr_fid = match_fund(sn, clean_amc, vr_index)
        if not vr_fid:
            cat = categorize_unmatched(fund, vr_amcs, clean_amc)
            print(f'NO_MATCH [{cat}]')
            results.append({
                'scheme_code': sc, 'scheme_name': sn, 'amc': clean_amc,
                'vr_fund_id': '', 'aum': '', 'expense_ratio': '',
                'fund_manager': '', 'match_status': 'NO_MATCH', 'unmatched_category': cat,
                'raw_api': ''
            })
            continue

        print(f'ID={vr_fid}', end=' ', flush=True)
        matched += 1

        api_calls += 1
        meta = fetch_vr_metadata(vr_fid)
        if meta['expense_ratio'] is not None or meta['aum'] is not None:
            api_ok += 1
        if meta['raw_response'].get('status') == 403:
            api_403 += 1

        er = meta['expense_ratio']
        aum = meta['aum']
        fm = meta.get('fund_manager', '')

        print(f'ER={er} AUM={aum}', end='')
        if er is None and aum is None:
            print(' (no data)', end='')
        print()

        results.append({
            'scheme_code': sc, 'scheme_name': sn, 'amc': clean_amc,
            'vr_fund_id': vr_fid,
            'aum': str(aum) if aum is not None else '',
            'expense_ratio': str(er) if er is not None else '',
            'fund_manager': fm or '',
            'match_status': 'SUCCESS' if (er is not None or aum is not None) else 'NO_DATA',
            'unmatched_category': '',
            'raw_api': str(meta['raw_response'].get('body_preview', ''))[:300]
        })

        time.sleep(VR_API_DELAY)

    elapsed = time.time() - t0

    # ── Stats ──────────────────────────────────────────────────────────
    er_found = sum(1 for r in results if r['expense_ratio'])
    aum_found = sum(1 for r in results if r['aum'])
    fm_found = sum(1 for r in results if r['fund_manager'])
    any_found = sum(1 for r in results if r['expense_ratio'] or r['aum'])

    # Unmatched categorization
    unmatched = [r for r in results if r['match_status'] == 'NO_MATCH']
    cat_counts = {}
    for r in unmatched:
        c = r.get('unmatched_category', 'unknown')
        cat_counts[c] = cat_counts.get(c, 0) + 1

    match_pct = matched / len(results) * 100
    er_pct = er_found / len(results) * 100
    aum_pct = aum_found / len(results) * 100
    fm_pct = fm_found / len(results) * 100

    print(f'\n{"="*70}')
    print('RESULTS')
    print(f'{"="*70}')
    print(f'  Attempted:           {len(results)}')
    print(f'  Matched to VR ID:    {matched} ({match_pct:.1f}%)')
    print(f'  Unmatched:           {len(unmatched)} ({100-match_pct:.1f}%)')
    print(f'  API calls:           {api_calls} ({api_ok} ok, {api_403} 403)')
    print(f'  expense_ratio:       {er_found} ({er_pct:.1f}%)')
    print(f'  AUM:                 {aum_found} ({aum_pct:.1f}%)')
    print(f'  fund_manager:        {fm_found} ({fm_pct:.1f}%)')
    print(f'  Any data found:      {any_found} ({any_found/len(results)*100:.1f}%)')
    print(f'  Total runtime:       {elapsed:.0f}s ({elapsed/60:.1f}min)')

    print(f'\n  --- Unmatched categories ---')
    for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1]):
        pct = cnt / len(results) * 100
        print(f'    {cat}: {cnt} ({pct:.1f}%)')

    # Coverage estimate
    print(f'\n  --- Coverage estimate (across ~8,095 funds) ---')
    total_est = 8095
    reachable = matched  # matched funds = VR has these
    # Adjust: naming mismatches could potentially be fixed
    naming_mismatches = cat_counts.get('Naming mismatch', 0)
    fixable = matched + naming_mismatches
    print(f'    Current:    {matched}/{len(results)} = {match_pct:.1f}% across sample')
    print(f'    Estimated:  ~{int(match_pct/100*total_est)}/{total_est} = {match_pct:.1f}% across all funds')
    print(f'    Best-case:  ~{int(fixable/len(results)*total_est)}/{total_est} (if naming fixed)')

    # Expected runtime
    crawl_amcs = len(target_amcs)
    crawl_time = crawl_amcs * (VR_DELAY + 1) + 5
    per_call = VR_API_DELAY

    print(f'\n  --- Expected runtime projections ---')
    for label, count in [('Full crawl (all AMCs)', 50),
                          ('1,000 funds', 1000),
                          ('All 8,095 funds', 8095)]:
        calls_time = count * per_call
        total_proj = crawl_time + calls_time
        h, rem = divmod(total_proj, 3600)
        m, s = divmod(rem, 60)
        print(f'    {label}: {calls_time:.0f}s API + {crawl_time:.0f}s crawl = '
              f'{total_proj:.0f}s ({int(h)}h {int(m)}m {int(s)}s)')

    # Save CSV
    os.makedirs('reports/phase5', exist_ok=True)
    with open(RESULTS_FILE, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=[
            'scheme_code', 'scheme_name', 'amc', 'vr_fund_id',
            'aum', 'expense_ratio', 'fund_manager', 'match_status',
            'unmatched_category', 'raw_api'
        ])
        w.writeheader()
        w.writerows(results)
    print(f'\n  Full results: {RESULTS_FILE}')

    # Show 10 sample payloads
    print(f'\n{"="*70}')
    print('SAMPLE SUCCESSFUL JSON PAYLOADS (first 10)')
    print(f'{"="*70}')
    successes = [r for r in results if r['match_status'] == 'SUCCESS']
    payloads_saved = []
    for r in successes[:10]:
        meta = fetch_vr_metadata(r['vr_fund_id'])
        payloads_saved.append({
            'scheme_code': r['scheme_code'],
            'scheme_name': r['scheme_name'],
            'vr_fund_id': r['vr_fund_id'],
            'response': meta
        })
        print(f'\n--- {r["scheme_code"]} → VR ID={r["vr_fund_id"]} ---')
        print(f'  scheme: {r["scheme_name"]}')
        print(f'  expense_ratio: {meta["expense_ratio"]}')
        print(f'  aum: {meta["aum"]}')
        print(f'  fund_manager: {meta.get("fund_manager","")}')
        print(f'  raw (first 200 chars): {str(meta["raw_response"].get("body_preview",""))[:200]}')
        time.sleep(VR_API_DELAY)

    with open(SAMPLE_FILE, 'w', encoding='utf-8') as f:
        json.dump(payloads_saved, f, indent=2, default=str)
    print(f'\n  Payloads saved: {SAMPLE_FILE}')

    print(f'\n{"="*70}')
    print('DONE')
    print(f'{"="*70}')


if __name__ == '__main__':
    main()
