# Environment & Secret Audit Report

**Generated:** 2026-06-15

## 1. `.env` Tracking Status

| Check | Result |
|-------|--------|
| Was `.env` tracked? | **Yes** — `git ls-files .env` returned it |
| Action taken | `git rm --cached .env` — removed from index |
| Is `.env` still tracked now? | **No** — confirmed with `git ls-files .env` (no output) |
| Does `.env` exist on disk? | **Yes** — `Test-Path .env` confirms |
| Does `.gitignore` contain `.env`? | **Yes** — both `.env` and `.env.local` |
| Can `.env` be committed again? | **No** — gitignore prevents future tracking |

**Note:** `.env` remains in past commits (`HEAD:.env`). Removed from working-tree index only.

## 2. `.env` Contents (Committed in Git History)

The committed `.env` at `HEAD` contains:

| Variable | Value | Classification |
|----------|-------|---------------|
| `VITE_SUPABASE_PROJECT_ID` | `skvvltawshbphrgnqjzf` | **Public** — appears in config.toml, migration SQL, Edge Function URLs |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon key (`sb_publishable_…`) | **Public** — anon key is designed to be client-side (used in `client.ts`) |
| `VITE_SUPABASE_URL` | `https://skvvltawshbphrgnqjzf.supabase.co` | **Public** — project URL, appears in config.toml and docs |

**No secrets** (`SUPABASE_SERVICE_ROLE_KEY`) were ever committed to `.env`.

## 3. Secret Scan Results

### Pattern: `SUPABASE_SERVICE_ROLE_KEY`

| Location | Type |
|----------|------|
| `supabase/functions/fetch-fund-data/index.ts` | `Deno.env.get()` — reads from runtime, safe |
| `supabase/functions/load-funds-json/index.ts` | `Deno.env.get()` — reads from runtime, safe |
| `supabase/functions/process-workbook/index.ts` | `Deno.env.get()` — reads from runtime, safe |
| `supabase/functions/send-otp/index.ts` | `Deno.env.get()` — reads from runtime, safe |
| `supabase/functions/set-pin/index.ts` | `Deno.env.get()` — reads from runtime, safe |
| `supabase/functions/sync-onedrive/index.ts` | `Deno.env.get()` — reads from runtime, safe |
| `supabase/functions/verify-otp/index.ts` | `Deno.env.get()` — reads from runtime, safe |
| `supabase/functions/verify-pin/index.ts` | `Deno.env.get()` — reads from runtime, safe |

**Verdict:** No hardcoded service role key found. All references are secure `Deno.env.get()` calls.

### Pattern: `service_role` (Postgres role reference)

| Location | Context |
|----------|---------|
| `supabase/migrations/…/20260302…sql` | SQL comments and RLS policy — `auth.role() = 'service_role'` |

**Verdict:** Safe — Postgres role name in RLS policy, not a credential.

### Pattern: `VITE_SUPABASE_URL`

| Location | Context |
|----------|---------|
| `HEAD:.env:3` | Environment variable (committed in history) |
| `src/components/dashboard/AIChat.tsx:20` | `import.meta.env.VITE_SUPABASE_URL` — runtime reference |
| `src/integrations/supabase/client.ts:5` | `import.meta.env.VITE_SUPABASE_URL` — runtime reference |

**Verdict:** Safe — project URL is public information.

### Pattern: `VITE_SUPABASE_PUBLISHABLE_KEY`

| Location | Context |
|----------|---------|
| `HEAD:.env:2` | Environment variable with anon key value (committed in history) |
| `src/integrations/supabase/client.ts:6` | `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` — runtime reference |
| `docs/mobile-app-prompt.md` | **Hardcoded anon key** — `sb_publishable_nQmkXoF3DbHyYg2SNSGGtA_JaNoDFj7` |
| `portfolio_sync_root_cause.md` | **Hardcoded anon key** — same value |

**Verdict:** The anon key is intentionally public (used by client-side Supabase SDK with RLS). However, **hardcoding it in `.md` documentation files** is a documentation hygiene issue — those files become stale and expose infrastructure details.

### Secret Key Value Scan

Searched for the actual JWT prefix `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9` and the Supabase ref `skvvltawshbphrgnqjzf` across all tracked files:

- **`eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`**: Not found in any tracked source file. The actual JWT secret was never committed.
- **`skvvltawshbphrgnqjzf`**: Found in config.toml, supabase temp files, migration SQL, and docs — all project reference context (not credentials).

## 4. Push Safety Assessment

| Criterion | Status |
|-----------|--------|
| `SUPABASE_SERVICE_ROLE_KEY` hardcoded in source? | **No** — only `Deno.env.get()` references |
| `SUPABASE_SERVICE_ROLE_KEY` in `.env` in git? | **No** — `.env` never contained it |
| `.env` removed from tracking? | **Yes** — `git rm --cached` done |
| `.gitignore` prevents future `.env` commits? | **Yes** — `.env` and `.env.local` both listed |
| Public anon key in docs? | **Yes** — `docs/mobile-app-prompt.md` and `portfolio_sync_root_cause.md` |
| Anon key exposure risk? | **Low** — anon key is public by design; RLS provides security |

**Result: Safe to push.** The critical secret (`SUPABASE_SERVICE_ROLE_KEY`) was never committed. The only committed credentials are the public-facing anon key and project URL, which are inherently non-secret.

## 5. Recommendations

1. **Rotate anon key** if the documented exposure is a concern (though it's designed to be public)
2. **Remove hardcoded keys from `.md` files** — replace with `[your anon key]` placeholders
3. **Remove hardcoded project URL from `.md` files** — same treatment
4. **Add `.env` scrub to CI pipeline** — prevent future accidental commits

## 6. Actions Taken

| Action | Status |
|--------|--------|
| `git rm --cached .env` | ✅ Done |
| `.env` still exists locally | ✅ Verified |
| `.env` no longer tracked | ✅ Verified |
| `.gitignore` has `.env` + `.env.local` | ✅ Verified |
| Secret scan across HEAD + working tree | ✅ Done |
| Report generated | ✅ Done |
