#!/usr/bin/env python3
"""Test fund_manager update via Supabase Python client."""
import os
import json
from supabase import create_client

SUPABASE_URL = 'https://skvvltawshbphrgnqjzf.supabase.co'
SERVICE_ROLE = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
sup = create_client(SUPABASE_URL, SERVICE_ROLE)

# 1. Find a row with empty fund_manager
rows = sup.from_('recommendation_universe').select('scheme_code,scheme_name,fund_manager').eq('fund_manager', '').limit(1).execute()
target = rows.data[0] if rows.data else None
if not target:
    print("No rows with empty fund_manager found")
    exit(1)

sc = target['scheme_code']
before_val = target['fund_manager']
print(f"=== Target row ===")
print(f"scheme_code: {sc}")
print(f"scheme_name: {target['scheme_name'][:60]}")
print(f"fund_manager BEFORE: {repr(before_val)}")
print()

# 2. Update via upsert with correct syntax
new_manager = "Test Fund Manager"
resp = sup.from_('recommendation_universe').update({
    "fund_manager": new_manager,
}).eq("scheme_code", sc).execute()
print(f"=== Update response ===")
print(json.dumps(resp, indent=2, default=str)[:500])
print()

# 3. Verify after value
after = sup.from_('recommendation_universe').select('scheme_code,fund_manager').eq('scheme_code', sc).limit(1).execute()
after_row = after.data[0]
print(f"=== After update ===")
print(f"fund_manager AFTER: {repr(after_row['fund_manager'])}")
print()

changed = after_row['fund_manager'] == new_manager
print(f"FUND_MANAGER CHANGED: {changed}")
if not changed:
    print("ERROR: Update did not persist!")
    exit(1)

# 4. Restore original value
sup.from_('recommendation_universe').update({
    "fund_manager": "",
}).eq("scheme_code", sc).execute()
print("Original value restored")
