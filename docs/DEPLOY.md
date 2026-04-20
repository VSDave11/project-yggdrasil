# Deploy — Yggdrasil v1.1.0 (Google Auth)

Follow in order. Each step is independent; you can pause between them.

## 0. Prerequisites
- Supabase project admin access
- Render service admin access (for env vars)
- Google OAuth Client ID + Secret in hand (see `GOOGLE_OAUTH_SETUP.md`)

---

## 1. Supabase — SQL migration

Dashboard → **SQL Editor** → New query → paste the contents of `migrations/001_auth_rls.sql` → **Run**.

You should see `Success. No rows returned.` RLS is now enabled.

⚠️  From this moment until step 3 is finished, **editing the site is disabled** (reads still work). Plan accordingly.

---

## 2. Supabase — Google provider

Dashboard → **Authentication → Providers → Google** → toggle ON.

Fill in:
- **Client ID**: *(from Google Cloud)*
- **Client Secret**: *(from Google Cloud)*
- **Authorized Client IDs**: *(leave empty)*

Save.

Then: **Authentication → URL Configuration**

- **Site URL**: `https://project-yggdrasil-com.onrender.com`
- **Redirect URLs** (add): `https://project-yggdrasil-com.onrender.com/**`

Save.

---

## 3. Render — environment variables

Render Dashboard → your service → **Environment** → add:

| Key | Value |
|---|---|
| `SUPABASE_URL` | `https://tyjdelvkwqdzwinevrbo.supabase.co` |
| `SUPABASE_KEY` | *(anon key from Supabase → API)* |
| `SUPABASE_JWT_SECRET` | *(JWT Secret from Supabase → API → JWT Settings)* |

Save. Render will auto-redeploy with the new env.

---

## 4. Merge the PR
Once Render reports `🌳 Yggdrasil server running on port …` and `JWT verification: ENABLED ✓` in the logs, you're live.

Open the site → click **Sign in with Google** → the Google popup only accepts `@oddin.gg` → after redirect you'll see your name in the nav chip → editing works.

---

## Rollback
If anything goes wrong: `git revert` the merge commit. The old server.js has no auth middleware and the old `index.html` uses localStorage, so everything keeps working — you'll just lose the Google login until you sort out the issue.

## Troubleshooting

**"Only @oddin.gg accounts may edit" despite signing in correctly**
Token was issued to a different email. Sign out and back in. If it persists, your Google account is in a different Workspace than the OAuth client — verify with your admin.

**Login succeeds but writes fail with 403**
SQL migration (step 1) hasn't run — RLS policies are missing the `is_oddin_user()` check.

**Login succeeds but server returns 500 on edits**
`SUPABASE_JWT_SECRET` env var not set on Render. Check service logs — they'll say `JWT verification: DISABLED`.
