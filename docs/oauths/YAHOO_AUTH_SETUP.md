# Yahoo OAuth Setup Guide

This guide explains how to configure Yahoo Sign-In for the application via Supabase Auth.

---

## Prerequisites

- A Supabase Project (local or hosted)
- A Yahoo Developer Network account with access to create OAuth 2.0 applications

---

## Step 1: Create Yahoo OAuth Credentials

1. Go to the [Yahoo Developer Network](https://developer.yahoo.com/apps/).
2. Click on **Create an App**.
3. Fill in the required details (App Name, Description).
4. Set the **App URL** to your application's domain (e.g., `http://localhost:5173`).
5. Under **Callback Domain**, enter your Supabase Auth OAuth Callback URL domain (e.g., `<YOUR_SUPABASE_PROJECT_REF>.supabase.co`).
6. Set **API Permissions** to include **OpenID Connect** (Email and Profile scopes).
7. Click **Create App**.
8. Note down the generated **Client ID** and **Client Secret**.

---

## Step 2: Configure Yahoo Provider in Supabase

### Option A: Hosted Supabase Dashboard

1. Open your **Supabase Dashboard** for your project.
2. Go to **Authentication** > **Providers**.
3. Locate **Yahoo** in the list of OAuth providers and enable it.
4. Paste your **Client ID** and **Client Secret** into the respective fields and save changes.

### Option B: Local Supabase CLI Setup

When using local Supabase CLI, provider settings are managed via `supabase/config.toml` or environment variables:

1. In `supabase/config.toml`, add or update the `[auth.external.yahoo]` section:
   ```toml
   [auth.external.yahoo]
   enabled = true
   client_id = "env(SUPABASE_AUTH_EXTERNAL_YAHOO_CLIENT_ID)"
   secret = "env(SUPABASE_AUTH_EXTERNAL_YAHOO_SECRET)"
   redirect_uri = "http://127.0.0.1:54321/auth/v1/callback"
   ```
2. Set `SUPABASE_AUTH_EXTERNAL_YAHOO_CLIENT_ID` and `SUPABASE_AUTH_EXTERNAL_YAHOO_SECRET` in your `.env` / `.env.local` file or export them in your terminal before running `supabase start`.

---

## Step 3: Configure Redirect URLs in Supabase

1. In Supabase Dashboard, go to **Authentication** > **URL Configuration**.
2. Set **Site URL** (e.g., `http://localhost:5173` or your production frontend domain).
3. Under **Redirect URLs**, ensure your frontend application URLs are added:
   - `http://localhost:5173/**`
   - `https://your-production-domain.com/**`
4. Save changes.

---

## Step 4: Admin Access Control

Yahoo OAuth allows users to authenticate, but for Admin access, the user must also be listed in the `admins` table.

To grant an authenticated Yahoo user Admin privileges:

```sql
INSERT INTO
  admins (auth_user_id, role)
VALUES
  ('<SUPABASE_USER_UUID>', 'admin') ON CONFLICT (auth_user_id) DO NOTHING;
```

If a user signs in with Yahoo without being present in the `admins` table, the application will automatically sign them out and display "This account is not authorized".
