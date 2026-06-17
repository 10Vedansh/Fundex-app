#!/usr/bin/env python3
"""Check fund_metrics and recommendation_universe coverage for expense_ratio/aum."""
import os
from supabase import create_client

SUPABASE_URL = 'https://skvvltawshbphrgnqjzf.supabase.co'
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
sup = create_client(SUPABASE_URL, SERVICE_ROLE)

# Check fund_metrics
r = sup.from_('fund_metrics').select('scheme_code', count='exact').limit(1).execute()
total = int(r.count)
print(f'fund_metrics total rows: {total}')

r2 = sup.from_('fund_metrics').select('scheme_code', count='exact').not_.is_('expense_ratio', 'null').limit(1).execute()
exp = int(r2.count)
print(f'fund_metrics with expense_ratio: {exp} ({exp/total*100:.1f}%)')

r3 = sup.from_('fund_metrics').select('scheme_code', count='exact').not_.is_('net_assets', 'null').limit(1).execute()
na = int(r3.count)
print(f'fund_metrics with net_assets: {na} ({na/total*100:.1f}%)')

# Check recommendation_universe
r4 = sup.from_('recommendation_universe').select('scheme_code', count='exact').limit(1).execute()
ru_total = int(r4.count)
print(f'\nrecommendation_universe total: {ru_total}')

r5 = sup.from_('recommendation_universe').select('scheme_code', count='exact').not_.is_('aum', 'null').limit(1).execute()
ru_aum = int(r5.count)
print(f'with aum: {ru_aum} ({ru_aum/ru_total*100:.1f}%)')

r6 = sup.from_('recommendation_universe').select('scheme_code', count='exact').not_.is_('expense_ratio', 'null').limit(1).execute()
ru_exp = int(r6.count)
print(f'with expense_ratio: {ru_exp} ({ru_exp/ru_total*100:.1f}%)')

r7 = sup.from_('recommendation_universe').select('scheme_code', count='exact').not_.is_('aum', 'null').not_.is_('expense_ratio', 'null').limit(1).execute()
both = int(r7.count)
print(f'with both: {both}')

# Check the net_assets gap — how many funds have net_assets but no aum?
r8 = sup.from_('recommendation_universe').select('scheme_code', count='exact').is_('aum', 'null').limit(1).execute()
no_aum = int(r8.count)
print(f'\nwithout aum: {no_aum}')

# Check fund_master aum coverage
r9 = sup.from_('fund_master').select('scheme_code', count='exact').limit(1).execute()
fm_total = int(r9.count)
r10 = sup.from_('fund_master').select('scheme_code', count='exact').not_.is_('expense_ratio', 'null').limit(1).execute()
fm_exp = int(r10.count)
r11 = sup.from_('fund_master').select('scheme_code', count='exact').not_.is_('aum', 'null').limit(1).execute()
fm_aum = int(r11.count)
print(f'\nfund_master total: {fm_total}')
print(f'fund_master with expense_ratio: {fm_exp} ({fm_exp/fm_total*100:.1f}%)')
print(f'fund_master with aum: {fm_aum} ({fm_aum/fm_total*100:.1f}%)')

# Are there funds in fund_master that have aum but AREN'T in recommendation_universe?
r12 = sup.from_('fund_master').select('scheme_code').not_.is_('aum', 'null').limit(20).execute()
codes_with_aum = [r['scheme_code'] for r in r12.data]
print(f'\nSample fund_master with aum: {codes_with_aum[:5]}')
