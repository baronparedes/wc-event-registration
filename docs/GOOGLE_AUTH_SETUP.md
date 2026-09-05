# Google OAuth Setup Guide

This guide explains how to configure Google Sign-In for the application via Supabase Auth.

---

## Prerequisites

- A Supabase Project (local or hosted)
- A Google Cloud Console project with access to create OAuth 2.0 Client IDs

---

## Step 1: Create Google OAuth Credentials in Google Cloud Console

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select an existing project or create a new project.
3. In the left navigation menu, navigate to **APIs & Services** > **OAuth consent screen**.
   - Select **External** (or **Internal** if using Google Workspace for your organization).
   - Fill in mandatory fields (App name, User support email, Developer contact email).
   - Add the necessary scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and `openid`.
   - Save and continue.
4. Navigate to **APIs & Services** > **Credentials**.
5. Click **+ CREATE CREDENTIALS** at the top and select **OAuth client ID**.
6. Select **Web application** as the Application type.
7. Set a Name (e.g., `WC Event Registration`).
8. Under **Authorized redirect URIs**, add your Supabase Auth OAuth Callback URL:
   - For hosted Supabase: `https://<YOUR_SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
   - For local Supabase CLI: `http://localhost:54321/auth/v1/callback` or `http://127.0.0.1:54321/auth/v1/callback`
9. Click **Create**.
10. Note down the generated **Client ID** and **Client Secret**.

---

## Step 2: Configure Google Provider in Supabase

1. Open your **Supabase Dashboard** (or local Supabase Studio at `http://localhost:54323`).
2. Go to **Authentication** > **Providers**.
3. Locate **Google** in the list of OAuth providers and enable it.
4. Paste your **Client ID** and **Client Secret** into the respective fields.
5. Save changes.

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

Google OAuth allows users to authenticate, but for Admin access, the user must also be listed in the `admins` table.

To grant an authenticated Google user Admin privileges:

```sql
INSERT INTO admins (auth_user_id, role)
VALUES ('<SUPABASE_USER_UUID>', 'admin')
ON CONFLICT (auth_user_id) DO NOTHING;
```

If a user signs in with Google without being present in the `admins` table, the application will automatically sign them out and display "This account is not authorized".
