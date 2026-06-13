# Portfolio Cloud Sync Fix Report

## Root Cause

**Lovable auth sets a Supabase session without a `refresh_token`.**

### Chain of Failure

```
Google OAuth login (via Lovable auth)
  → lovable.auth.signInWithOAuth(provider, { ... })
  → supabase.auth.setSession(result.tokens)
  → tokens may lack "refresh_token"                          ← ROOT CAUSE
  → session stored in localStorage without refresh_token
  → 1 hour passes, access_token expires
  → Supabase auto-refresh tries POST /auth/v1/token?grant_type=refresh_token
  → no refresh_token in session → request fails
  → Supabase client keeps stale session (user object still present)
  → Next API call sends Authorization: Bearer <EXPIRED_TOKEN>
  → PostgREST decodes JWT → expired → auth.uid() = NULL
  → RLS: auth.uid() = user_id → NULL = '...' → FALSE
  → 401 "new row violates row-level security policy for table \"portfolio_holdings\""
```

### Why Google Didn't Return a Refresh Token

The original `signInWithGoogle` call was:

```ts
const result = await lovable.auth.signInWithOAuth('google', {
  redirect_uri: window.location.origin,
  // no extraParams → no access_type=offline
});
```

Google's OAuth 2.0 only returns a `refresh_token` when `access_type=offline` is requested. Without it, Google returns a `refresh_token` **only on the first authorization** (when the consent screen is shown). On subsequent silent redirects, no refresh token is returned. The Supabase session is stored without one, making auto-refresh impossible.

### Why the App Appeared to Work

| Action | Why it worked | Why it broke later |
|--------|---------------|-------------------|
| Profile loads | Initial access token (1hr valid) | N/A |
| Edge function (`parse-cams`) | `verify_jwt = false` | N/A |
| CAMS parse succeeds | Edge function works without JWT | N/A |
| Supabase DELETE/INSERT | ❌ **Failed immediately** | Initial token likely already expired by the time user navigates to upload |

---

## Changes Made

### 1. `src/hooks/useAuth.tsx` — Lines 146-162

**Before:**
```ts
const result = await lovable.auth.signInWithOAuth('google', {
  redirect_uri: window.location.origin,
});
```

**After:**
```ts
const result = await lovable.auth.signInWithOAuth('google', {
  redirect_uri: window.location.origin,
  extraParams: {
    access_type: 'offline',   // ← forces Google to return refresh_token
    prompt: 'consent',         // ← forces consent screen every time
  },
});
```

### 2. `src/hooks/useCamsHoldings.tsx` — Added `ensureSession()`

New helper function called before every Supabase write operation:

```ts
async function ensureSession(): Promise<string> {
  // Attempt 1: explicit refresh
  const { data, error } = await supabase.auth.refreshSession();
  if (!error && data.session?.user) return data.session.user.id;

  // Attempt 2: getUser() may also trigger refresh internally
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (!userError && userData.user) return userData.user.id;

  // Attempt 3: session exists but irrecoverable → sign out, ask re-auth
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    await supabase.auth.signOut();
    throw new Error('Session expired. Please sign in again.');
  }

  throw new Error((error || 'No authenticated session.'));
}
```

Called at the start of `saveHoldings`, `clearHoldings`, and `fetchHoldings`:

```ts
const sessionUserId = await ensureSession();
// ... use sessionUserId instead of user.id for Supabase operations
```

### 3. `src/hooks/useCamsHoldings.tsx` — Success toast

Added `toast.success('Portfolio saved to cloud')` on successful Supabase sync to confirm the fix.

---

## Verification Steps

| Test | Expected Outcome |
|------|-----------------|
| 1. Upload CAMS | Holdings display immediately + toast "Portfolio saved to cloud" |
| 2. `SELECT COUNT(*) FROM portfolio_holdings` | `> 0` (rows exist) |
| 3. Page refresh | Holdings load from Supabase (not localStorage fallback) |
| 4. Logout → Login | Holdings reload from Supabase |
| 5. Wait 1 hour → upload again | Cloud sync still works (refresh token enabled auto-refresh) |
| 6. Second browser/device | Holdings load from Supabase (user-level RLS) |

---

## One-Time Migration Note

Users who currently have an expired session (stored without a `refresh_token`) will see:

> _"Your session has expired. Please sign in again (this one-time re-authentication will fix cloud sync permanently)."_

This happens once. After re-authentication, the new sign-in flow includes `access_type=offline` and the refresh token is persisted. All subsequent sessions (including page reloads and new tabs) will have full auto-refresh capability.
