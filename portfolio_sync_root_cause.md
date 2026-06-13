# Portfolio Sync Root Cause

## Status Summary

| Check | Result | Evidence |
|-------|--------|----------|
| `public.portfolio_holdings` exists? | ✅ Yes | Migration applied successfully. Query returns `PGRST205` no more; direct `SELECT` works. |
| `SELECT COUNT(*)` | `0` | No rows. Inserts never complete. |
| Supabase API insert test | ❌ **401 — RLS blocks** | `POST /rest/v1/portfolio_holdings` → `{"code":"42501","message":"new row violates row-level security policy for table \"portfolio_holdings\""}` |
| Frontend targeting correct table? | ✅ Yes | `supabase.from('portfolio_holdings')` → `public.portfolio_holdings` (default schema). |
| localStorage fallback | ✅ Working | `cams_holdings_cache` key in localStorage holds the data; page reload restores it. |

---

## 1. Complete Flow Trace

```
CAMSUpload.tsx:99    processPDF()           — user clicks upload
CAMSUpload.tsx:114   supabase.functions.invoke('parse-cams', …)
                     → edge function responds with { holdings: […], … }
CAMSUpload.tsx:129   onSave?.(data.holdings)
                     ↓
Index.tsx:629        onSave={(holdings) => saveCamsHoldings(holdings.map(…))}
                     ↓
useCamsHoldings.tsx:102  saveHoldings(items)
useCamsHoldings.tsx:103  if (!user) → PASSES (user exists)
useCamsHoldings.tsx:108–126  Build local records & save to localStorage  ← THIS WORKS
useCamsHoldings.tsx:129   try {
useCamsHoldings.tsx:130–133   DELETE FROM portfolio_holdings WHERE user_id = $1
useCamsHoldings.tsx:135     if (deleteError) throw deleteError;       ← FAILS HERE
useCamsHoldings.tsx:159–164 } catch (err) { toast.error(“…”) }
```

## 2. Where Local Save Happens

**File:** `src/hooks/useCamsHoldings.tsx`  
**Lines:** 108–126

```ts
const localRecords = items.map((item, i) => ({
  id: `local_${Date.now()}_${i}`,
  user_id: user.id,
  fund_name: item.fund_name,
  // … all fields …
}));

setHoldings(localRecords);       // line 125 — React state
saveLocal(localRecords);         // line 126 — localStorage
```

This runs **before** the Supabase block. It always succeeds, which is why:
- Holdings display in the UI immediately
- Data survives page reload (reads from `cams_holdings_cache` in localStorage)

## 3. Why Inserts Never Occur — Exact Failure Point

**File:** `src/hooks/useCamsHoldings.tsx`  
**Failure line:** **135** — `if (deleteError) throw deleteError;`  
**Or line:** **154** — `if (insertError) throw insertError;`

### Proven: RLS blocks both DELETE and INSERT

Direct API test against the live project with the anon key:

```
POST https://skvvltawshbphrgnqjzf.supabase.co/rest/v1/portfolio_holdings
Content-Type: application/json
apikey: sb_publishable_nQmkXoF3DbHyYg2SNSGGtA_JaNoDFj7
Authorization: Bearer sb_publishable_nQmkXoF3DbHyYg2SNSGGtA_JaNoDFj7

{"user_id": "00000000-…", "fund_name": "test"}

→ 401
{"code":"42501","message":"new row violates row-level security policy for table \"portfolio_holdings\""}
```

**RLS policy evaluated against this request:**

```sql
CREATE POLICY "Users can insert their own portfolio holdings"
  ON portfolio_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

When the request carries only the **anon key** without a valid user JWT, `auth.uid()` returns `NULL`. The check `NULL = user_id` is always `false`, so every row is rejected.

### The same applies to DELETE:

```sql
CREATE POLICY "Users can delete their own portfolio holdings"
  ON portfolio_holdings FOR DELETE
  USING (auth.uid() = user_id);
```

Without a valid JWT, `auth.uid()` is `NULL`, and `USING (NULL = user_id)` filters out all rows → DELETE silently deletes 0 rows (or returns 401 depending on configuration).

## 4. Why RLS Fails in the App

### Root cause chain:

1. Supabase client is created with the **anon key** (`sb_publishable_…`)
2. The anon key alone does **not** authenticate a specific user
3. For RLS to pass, every request **must** also carry a valid **user JWT** in the `Authorization: Bearer <jwt>` header
4. The Supabase JS client (`@supabase/supabase-js`) automatically attaches the JWT **only if** it has an active session

### Two possible scenarios:

#### Scenario A — Token expired / refresh failed (most likely)
- User logged in previously; the Supabase client restored the session from `localStorage` (`sb-…-auth-token`)
- The access token expired (default: 1 hour)
- `autoRefreshToken: true` tried the refresh, but the refresh token also expired, or the refresh endpoint returned an error
- The client still returns `user` from the stored session metadata (it doesn't clear the user object on token failure)
- `saveHoldings` passes `if (!user)` — proceeds
- API call goes out with an expired JWT → PostgREST returns 401 → RLS blocks

#### Scenario B — Auth session never loaded (race condition)
- The `useAuth` hook's `onAuthStateChange` fires with `event: 'INITIAL_SESSION'` and provides the session
- But `saveHoldings` runs **before** this event fires (unlikely in practice, since the user has to click upload after the page loads)

## 5. Error Swallowing Analysis

**File:** `src/hooks/useCamsHoldings.tsx`  
**Lines:** 159–164

```ts
} catch (err: any) {
  const message = err?.message || err?.error_description || 'Unknown error';
  console.error('Error saving CAMS holdings to Supabase:', err);
  toast.error(`Saved locally. Could not sync to cloud: ${message}`);
  return false;
}
```

The error is **not** fully swallowed — `err.message` is shown in the toast. However:

| Issue | Impact |
|-------|--------|
| `err.message` exposed | ✅ The actual PostgREST error IS visible to the user |
| No re-throw / no caller check | ❌ `saveHoldings` returns `false` but **no caller uses the return value** |
| Three `onSave` handlers in Index.tsx | ❌ All three ignore the promise: `onSave={(holdings) => { saveCamsHoldings(…) }}` — no `await`, no `.then()`, no `.catch()` |

The toast the user sees is:
```
Saved locally. Could not sync to cloud: new row violates row-level security policy for table "portfolio_holdings"
```

## 6. Summary: Exact Failure

| What | File | Line(s) |
|------|------|---------|
| localStorage save (succeeds) | `src/hooks/useCamsHoldings.tsx` | 108–126 |
| Supabase DELETE (blocked by RLS) | `src/hooks/useCamsHoldings.tsx` | 130–133 |
| Delete error thrown | `src/hooks/useCamsHoldings.tsx` | **135** |
| Supabase INSERT (never reached if DELETE fails) | `src/hooks/useCamsHoldings.tsx` | 138–154 |
| Error caught, toast shown | `src/hooks/useCamsHoldings.tsx` | 159–164 |
| Return value ignored by caller | `src/pages/Index.tsx` | **629, 641, 650** (all three `onSave` handlers) |

**Root cause:** The Supabase client either lacks a valid user JWT or the JWT is expired when the DELETE/INSERT calls execute. Without a valid user JWT, `auth.uid()` returns `NULL` in the RLS policy, causing every row-level operation to fail.

**Blocking fix needed:** Regenerate or refresh the Supabase auth session before making the API calls. See `useAuth.tsx` lines 60–62 — verify that `session?.access_token` is available and non-expired before calling `saveHoldings`.

---

## Appendix: RLS Policy Definition (from migration)

```sql
CREATE POLICY "Users can insert their own portfolio holdings"
  ON portfolio_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own portfolio holdings"
  ON portfolio_holdings FOR DELETE
  USING (auth.uid() = user_id);
```
