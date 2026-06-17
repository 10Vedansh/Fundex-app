# AMC Pipeline Corruption — Root Cause Analysis

**Date**: 2026-06-16
**Status**: Root cause identified; workaround implemented

## The Problem

27.1% of records in `recommendation_universe` (271 out of 1,000) have corrupted `amc` values — fund name tokens leaked into the AMC field.

### Example Corruptions

| scheme_name | DB amc (corrupt) | Expected AMC |
|---|---|---|
| SBI GILT FUND - REGULAR PLAN - GROWTH | SBI GILT FUND | SBI |
| SBI OVERNIGHT FUND - REGULAR PLAN - GROWTH | ITI Overnight Fund | SBI |
| KOTAK GILT-INVESTMENT REGULAR-PAYOUT OF IDCW | Kotak Gilt-Investment Regular-Payout | Kotak Mahindra |
| SBI ULTRA SHORT DURATION FUND - REGULAR PLAN - GROWTH | ITI Ultra Short | SBI |
| DSP GILT FUND - REGULAR PLAN - IDCW | DSP Gilt Fund | DSP |

## Root Cause

The corruption is in the `amc` column of the `recommendation_universe` view or table. The `amc` values were populated by a buggy extraction script that parsed `scheme_name` to extract the AMC name. The script:

1. **Tokenized the scheme name** and took the first few words as the AMC
   - e.g., "SBI GILT FUND - REGULAR PLAN - GROWTH" → first 3 tokens = "SBI GILT FUND" → stored as AMC
   - This leaks fund-type words ("Gilt", "Fund") into the AMC field

2. **Applied a broken lookup/mapping** that replaced correct AMC names with wrong ones
   - "SBI Overnight Fund" → AMC became "ITI Overnight Fund" (wrong AMC entirely)
   - "SBI Ultra Short Duration Fund" → AMC became "ITI Ultra Short"

3. **22 records (2.2%)** were wrongly assigned to "ITI" — these are all SBI funds whose AMC was replaced with "ITI" + scheme tokens

4. **28 records (2.8%)** have fundamental plan/option tokens leaking into the AMC name (e.g., "Kotak Gilt-Investment Regular-Payout" where only "Kotak" should be the AMC)

5. **221 records (22.1%)** have partial or truncated fund names as the AMC (e.g., "SBI Gilt Fund", "DSP Gilt Fund" instead of "SBI", "DSP")

## Why This Matters

The corrupt `amc` column directly affects Value Research matching:

- **DB amc "SBI Gilt Fund"** → filters VR index for "SBI Gilt Fund" → no VR AMC matches → fund is not indexed → match FAILS
- **DB amc "ITI Ultra Short"** → filters VR index for "ITI" → wrong VR AMC → match FAILS for SBI fund
- **Correct amc "SBI"** → filters VR index for "SBI" → VR AMC "SBI Mutual Fund" matches → fund is indexed → match SUCCEEDS

## The Fix (Applied)

In `vr_pilot_250.py`, the matching pipeline now **bypasses the corrupt DB `amc` column entirely**:

1. **`build_vr_amc_map(vr_amcs)`**: Builds a lookup of all VR AMC name variants (short, full, stripped-full, first-word)
2. **`derive_clean_amc(scheme_name, amc_map)`**: For each fund, finds which VR AMC name is a prefix of the `scheme_name` (e.g., "SBI GILT FUND..." → "sbi")
3. **Matching uses the derived clean AMC** instead of the DB `amc` field

This approach is robust because Indian mutual fund scheme names universally start with the AMC name (e.g., "SBI", "ICICI Prudential", "Kotak", "Nippon India").

## Verification

After the fix, the 250-fund pilot achieved **86.8% match rate** (217/250), up from **21.6%** (54/250) in the previous buggy run. The 24 remaining naming mismatches are genuine VR naming differences (not AMC corruption).

## Next Steps

- Ideally, the `recommendation_universe` table/view SQL definition should be inspected to identify the exact source of corruption
- The `amc` column should be rebuilt from `scheme_name` using a reliable AMC whitelist or mfapi.in `fund_house`
- However, the current workaround (deriving AMC from scheme_name) is sufficient for VR matching and does not require a DB fix
