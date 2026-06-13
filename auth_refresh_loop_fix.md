# Auth Refresh Loop Fix

## What Caused the 429 Loop

The `ensureSession()` function from the previous fix called `supabase.auth.refreshSession()` on **every** Supabase operation — including `fetchHoldings()`, which runs on page load.

### Loop Trace

```
Page load
  → useEffect runs fetchHoldings()
  → fetchHoldings() calls ensureSession()
  → ensureSession() calls supabase.auth.refreshSession()
  → POST /auth/v1/token?grant_type=refresh_token     ← HTTP call
  → Supabase returns new session
  → onAuthStateChange fires (event: "TOKEN_REFRESHED")
  → useAuth: setSession(newSession) + setUser()
  → React re-renders
  → fetchHoldings has [user] dependency
  → new fetchHoldings created → useEffect fires again
  → fetchHoldings() calls ensureSession() again      ← LOOP
  → POST /auth/v1/token?grant_type=refresh_token     ← 429 after N iterations
```

### Call Count Before Fix

| Function | File | Line | Trigger | Frequency |
|----------|------|------|---------|-----------|
| `ensureSession()` → `refreshSession()` | `useCamsHoldings.tsx` | 112 | `fetchHoldings()` — page load, re-render | **Every render** |
| `ensureSession()` → `refreshSession()` | `useCamsHoldings.tsx` | 164 | `saveHoldings()` — user upload | Every upload |
| `ensureSession()` → `refreshSession()` | `useCamsHoldings.tsx` | 211 | `clearHoldings()` — user action | Every clear |

The first call (`fetchHoldings`) created a **persistent loop** because refreshing the session triggered a re-render, which re-ran `fetchHoldings`, which refreshed again.

## Fix Applied

### 1. Removed `ensureSession()` entirely — `src/hooks/useCamsHoldings.tsx`

The function was deleted. All three call sites now use `user.id` directly:

| Method | Before | After |
|--------|--------|-------|
| `fetchHoldings()` | `const sessionUserId = await ensureSession();` <br>`.eq('user_id', sessionUserId)` | `.eq('user_id', user.id)` |
| `saveHoldings()` | `const sessionUserId = await ensureSession();` <br>`.eq('user_id', sessionUserId)` | `.eq('user_id', user.id)` |
| `clearHoldings()` | `const sessionUserId = await ensureSession();` <br>`.eq('user_id', sessionUserId)` | `.eq('user_id', user.id)` |

### 2. Removed `signOut()` call — `src/hooks/useCamsHoldings.tsx`

The `signOut()` call inside `ensureSession()`'s fallback path was deleted along with the function. No automatic logout occurs on session failure.

### 3. Removed `toast.success('Portfolio saved to cloud')`

Reverted — no success toast during transition.

### 4. Kept the Google OAuth fix — `src/hooks/useAuth.tsx`

The `access_type=offline` + `prompt=consent` remains. This is **necessary** to ensure Google returns a `refresh_token` on sign-in. The Supabase client's built-in `autoRefreshToken: true` uses this `refresh_token` to silently refresh the access token when it expires — without any manual refresh calls.

## How Token Refresh Works Now

```
User signs in via Google
  → lovable.auth gets tokens (including refresh_token due to access_type=offline)
  → supabase.auth.setSession(result.tokens)
  → Session stored in localStorage (with refresh_token)
  → Supabase client auto-refresh (autoRefreshToken: true)
  → When access_token expires, client calls POST /auth/v1/token?grant_type=refresh_token
  → Uses stored refresh_token → gets new access_token
  → All subsequent PostgREST requests include valid JWT
  → RLS policy auth.uid() = user_id → PASSES
```

No manual `refreshSession()` calls needed at any point.

## Call Count After Fix

| Function | Refresh Calls | Reason |
|----------|---------------|--------|
| `fetchHoldings()` | 0 (uses `user.id` directly) | Supabase client sends JWT automatically |
| `saveHoldings()` | 0 (uses `user.id` directly) | Auto-refresh handles expired tokens |
| `clearHoldings()` | 0 (uses `user.id` directly) | Auto-refresh handles expired tokens |
| Supabase internal | As-needed by `autoRefreshToken` | Only when token is actually expiring |

The only `refreshSession()` calls that occur are the ones initiated internally by the Supabase client when the access token is near expiry — not on every page load or render.
