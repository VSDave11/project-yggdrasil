# Google OAuth Setup — Yggdrasil

**For the Google Workspace admin of `oddin.gg`.**
**Time: ~5 minutes. You only need to do this once.**

## Why
Project Yggdrasil lets anyone in the Esims department sign in with their `@oddin.gg` Google account to edit projects. For that to work, you need to register the site as a Google OAuth client under the `oddin.gg` Workspace. This is the only step that requires admin access to the Google Cloud Console.

## Steps

### 1. Open Google Cloud Console
Go to <https://console.cloud.google.com> and make sure you're signed in with your `@oddin.gg` admin account.

### 2. Select or create a project
Top bar → project picker → **New Project** (or reuse an existing one).
- Name: `Yggdrasil`
- Organization: `oddin.gg`

### 3. Configure OAuth consent screen
Sidebar → **APIs & Services → OAuth consent screen**

- User Type: **Internal** ← important. This restricts sign-in to `@oddin.gg` accounts automatically.
- App name: `Yggdrasil`
- User support email: your admin email
- Developer contact: your admin email
- App domain → Application home page: `https://project-yggdrasil-com.onrender.com`
- Scopes: defaults (email, profile, openid) are fine.
- Save.

### 4. Create OAuth Client ID
Sidebar → **APIs & Services → Credentials → Create Credentials → OAuth client ID**

- Application type: **Web application**
- Name: `Yggdrasil – Supabase`
- **Authorized JavaScript origins** (add all):
  - `https://tyjdelvkwqdzwinevrbo.supabase.co`
  - `https://project-yggdrasil-com.onrender.com`
- **Authorized redirect URIs** (add this one exactly):
  - `https://tyjdelvkwqdzwinevrbo.supabase.co/auth/v1/callback`
- Create.

### 5. Hand off
Google shows a popup with **Client ID** and **Client Secret**. Send both (securely — 1Password / Bitwarden / Slack DM) to whoever is configuring Supabase. They'll paste them into Supabase → Authentication → Providers → Google.

## Done
Once Supabase has the secret, `@oddin.gg` accounts can sign in. Accounts outside `oddin.gg` are blocked at two levels:
1. Google's "Internal" consent screen refuses them outright.
2. The Yggdrasil server double-checks the verified email suffix before allowing any edit.
