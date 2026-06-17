#!/usr/bin/env python3
"""Debug NO MATCH funds: check if expected VR slugs exist and if core matching works."""
import requests, time, json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

# Core slug function (copied from vr_pilot_25.py)
def core_slug_of(name_slug):
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
        r'-?half[- ]?yearly\b',
        r'-quarterly\b',
        r'-weekly\b',
        r'-daily\b',
        r'-monthly\b',
        r'-annual\b',
        r'-?direct[- ]plan\b',
        r'-?regular[- ]plan\b',
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

def name_to_slug(name):
    if not name: return ''
    n = name.lower().strip()
    n = re.sub(r'[^a-z0-9\s-]', '', n)
    n = re.sub(r'\s+', '-', n).strip('-')
    return n

# NO MATCH funds from the output
nomatch = [
    ('100378', 'Nippon India Vision Large & Midcap Fund - IDCW Option', 'Nippon India'),
    ('100619', 'Sundaram Money Fund Retail Plan - Quarterly Reinvestment of Income Distribution', 'Sundaram'),
    ('100033', 'Aditya Birla Sun Life Large & Mid Cap Fund - Regular Growth', 'Aditya Birla SL'),
    ('100042', 'Aditya Birla Sun Life Liquid Fund-Retail (Growth)', 'Aditya Birla SL'),
    ('100968', 'SBI Conservative Hybrid Fund - Regular Plan - Growth', 'SBI'),
    ('102205', 'SBI Dynamic Bond Fund - REGULAR PLAN - Growth', 'SBI'),
    ('100152', 'Principal Nifty 100 Equal Weight Fund-Income Distribution Cum Capital Withdrawal', 'Principal'),
    ('100895', 'Principal Cash Management Fund - Daily Income Distribution Cum Capital Withdrawal', 'Principal'),
    ('112414', 'L&T Triple Ace Bond Fund - Regular Plan - Quarterly IDCW', 'L&T'),
    ('112416', 'L&T Triple Ace Bond Fund -Regular Plan - Semi Annual IDCW', 'L&T'),
]

for sc, name, amc in nomatch:
    slug = name_to_slug(name)
    core = core_slug_of(slug)
    print(f"{sc}: name={name[:50]}")
    print(f"   slug={slug}")
    print(f"   core={core} (len={len(core)})")
    
    # Expected VR slug pattern
    # The VR fund for regular/dis plans would be something like this without the triple dash
    # VR strips out plan suffixes entirely
    expected_vr = core + '-direct-plan'
    expected_vr_core = core_slug_of(expected_vr)
    print(f"   expected VR slug (direct): {expected_vr}")
    print(f"   expected VR core (direct): {expected_vr_core}")
    print()
