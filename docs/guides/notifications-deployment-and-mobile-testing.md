# Notifications Deployment & Mobile Setup/Testing Guide

This guide details the end-to-end procedure for deploying **In-App Notifications & Web Push** to production, including pre-deployment prerequisites, post-deployment validation, and step-by-step testing instructions for **iPhone (iOS)** and **Android** devices.

---

## 📑 Table of Contents

1. [Pre-Deployment Checklist & Prerequisites](#1-pre-deployment-checklist--prerequisites)
2. [Platform-Specific Mobile Requirements](#2-platform-specific-mobile-requirements)
3. [Deployment Procedure](#3-deployment-procedure)
4. [Post-Deployment Verification](#4-post-deployment-verification)
5. [iPhone (iOS) Setup & Testing Walkthrough](#5-iphone-ios-setup--testing-walkthrough)
6. [Android Setup & Testing Walkthrough](#6-android-setup--testing-walkthrough)
7. [Troubleshooting & Common Pitfalls](#7-troubleshooting--common-pitfalls)

---

## 1. Pre-Deployment Checklist & Prerequisites

Ensure the following prerequisites and credentials are ready before deploying:

### A. Environment & SSL Requirements

- [ ] **HTTPS Mandatory**: The Web Push API (`PushManager`, Service Workers) strictly requires an HTTPS origin in production. Verify your production domain has a valid SSL certificate.
- [ ] **Node.js**: Installed locally to generate VAPID keys.
- [ ] **Supabase CLI**: Authenticated and linked to your production project (`supabase link --project-ref <production-ref>`).

### B. Generate Production VAPID Keypair

Web Push relies on the VAPID (Voluntary Application Server Identification) protocol.

1. Run the key generator:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Note the generated keys:
   - **Public Key**: Exposed in frontend client code.
   - **Private Key**: Sensitive secret; only stored in Supabase Edge Function secrets.

### C. Environment Variables & Secrets Reference

| Target Location                    | Variable / Secret Name      | Purpose                                          | Value Example             |
| :--------------------------------- | :-------------------------- | :----------------------------------------------- | :------------------------ |
| **Frontend Hosting** (e.g. Vercel) | `VITE_VAPID_PUBLIC_KEY`     | Used by browser `pushManager.subscribe()`        | `BGv...65 chars...`       |
| **Supabase Edge Function Secrets** | `VAPID_PUBLIC_KEY`          | Used by `send-app-notification` to sign payloads | `BGv...65 chars...`       |
| **Supabase Edge Function Secrets** | `VAPID_PRIVATE_KEY`         | Used by `send-app-notification` to sign payloads | `3K...43 chars...`        |
| **Supabase Edge Function Secrets** | `SUPABASE_URL`              | Auto-provided in Supabase runtime                | `https://xyz.supabase.co` |
| **Supabase Edge Function Secrets** | `SUPABASE_SERVICE_ROLE_KEY` | Auto-provided in Supabase runtime                | Service role JWT          |

---

## 2. Platform-Specific Mobile Requirements

### 🍎 Apple iOS (iPhone & iPad)

- **Minimum OS Version**: **iOS 16.4 or later** (earlier iOS versions do **not** support Web Push).
- **Home Screen PWA Requirement (CRITICAL)**:
  > **Note**: Safari on iOS does **not** allow web push subscriptions inside ordinary browser tabs. Users **MUST install the web app to their Home Screen** ("Add to Home Screen") and launch the app in standalone PWA mode to enable push notifications and permission prompts.

### 🤖 Google Android

- **Supported Browsers**: Google Chrome, Samsung Internet, Firefox, Microsoft Edge on Android 8.0+.
- **Browser Tab & PWA Support**: Android supports Web Push both inside browser tabs and when installed as a PWA.
- **Android 13+ Notification Permissions**: On Android 13 and later, a native OS notification permission dialog is displayed alongside the browser's origin permission prompt.

---

## 3. Deployment Procedure

Follow these steps in sequence:

### Step 1: Execute Database Migration

Apply the database migration containing the notification tables, RLS policies, indexes, and atomic broadcast function `broadcast_app_notification`:

```bash
supabase db push
```

_Alternatively, copy and run the contents of [`supabase/migrations/20260927212000_add_app_notifications.sql`](../../supabase/migrations/20260927212000_add_app_notifications.sql) directly in the Supabase Dashboard SQL Editor._

### Step 2: Configure Supabase Edge Function Secrets

Set the VAPID keys in your Supabase backend:

```bash
supabase secrets set VAPID_PUBLIC_KEY="<YOUR_VAPID_PUBLIC_KEY>"
supabase secrets set VAPID_PRIVATE_KEY="<YOUR_VAPID_PRIVATE_KEY>"
```

_Or configure under Project Settings > Edge Functions > Secrets in the Supabase Dashboard._

### Step 3: Deploy Edge Functions

Deploy both notification functions with `--no-verify-jwt` (JWT authentication and admin checks are enforced in code by `useEdgeHook`):

```bash
supabase functions deploy send-app-notification --no-verify-jwt
supabase functions deploy manage-push-subscription --no-verify-jwt
```

### Step 4: Configure Frontend Environment Variables

In your Vercel/hosting dashboard:

1. Add `VITE_VAPID_PUBLIC_KEY` = `<YOUR_VAPID_PUBLIC_KEY>`.
2. Apply to both **Production** and **Preview** environments.

### Step 5: Build & Deploy Frontend

Push the latest code to your deployment branch:

```bash
git add .
git commit -m "feat(notifications): add in-app notifications and web push support"
git push origin main
```

---

## 4. Post-Deployment Verification

Verify database and infrastructure state:

1. **Database Tables & Publication**:
   - Check Supabase Dashboard > Table Editor for `public.app_notifications`, `public.app_notification_recipients`, and `public.user_push_subscriptions`.
   - Check Database > Replication: Verify `app_notification_recipients` is checked for `supabase_realtime`.
2. **Edge Function Health**:
   - Verify `send-app-notification` and `manage-push-subscription` status is `ACTIVE` in the Supabase Dashboard.
3. **PWA Service Worker**:
   - Open your production URL in desktop Chrome.
   - Open DevTools > **Application** > **Service Workers**.
   - Verify `sw.js` is active and running. Verify `push-worker.js` was imported successfully.

---

## 5. iPhone (iOS) Setup & Testing Walkthrough

Follow these steps to set up and test push notifications on an iPhone:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          iPhone Setup Flow                              │
│                                                                         │
│  1. Open Safari ──► 2. "Add to Home Screen" ──► 3. Launch from Home    │
│                                                              Screen     │
│                                                                │        │
│  6. Receive Push ◄── 5. Allow Notifications ◄── 4. Sign In &           │
│     on Lock Screen        System Prompt            Subscribe Device     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Step 1: Verify iOS Version

1. Open iPhone **Settings > General > About > iOS Version**.
2. Confirm the version is **iOS 16.4 or higher**.

### Step 2: Open Safari and Add to Home Screen

1. Open **Safari** on your iPhone.
2. Navigate to your production application URL (e.g. `https://your-domain.com`).
3. Tap the **Share** button in the bottom bar (the square icon with the arrow pointing upward).
4. Scroll down and tap **"Add to Home Screen"**.
5. Tap **"Add"** in the top right corner.
6. Close Safari.

### Step 3: Launch PWA and Sign In

1. Locate the app icon on your iPhone Home Screen and tap it to launch in standalone mode.
2. Sign in with your admin or member account.

### Step 4: Subscribe Device

Users (both members and admins) can subscribe/unsubscribe their device from either of the following user-facing locations:

1. **Notification Bell Popover (Available in Header on all pages)**:
   - Tap the **Notification Bell** icon in the header.
   - At the bottom of the popover, tap **Enable** next to _"Get alerts on this device"_.
2. **Profile Page (`/profile`)**:
   - Go to `/profile` (or tap your profile avatar/name in the menu).
   - Under the **Push Notifications** card, tap **Subscribe Device**.

_(Note: The Admin Notifications page `/admin/notifications` is exclusively dedicated to composing and broadcasting announcements to users)._

iOS will present a system-level permission dialog:

> **"‘[App Name]’ Would Like to Send You Notifications"**
> _Notifications may include alerts, sounds, and icon badges._

Tap **Allow**. The UI will update to confirm: _"Push alerts active on this device."_

### Step 5: Test Background / Lock Screen Delivery

1. **Lock your iPhone** or press the Home bar to switch to another app.
2. On a second device/desktop browser logged into `/admin/notifications`:
   - Enter **Title**: `Production Test Notification`
   - Enter **Message**: `Testing lock screen push delivery on iPhone.`
   - Set **Target Audience**: `All Users`
   - Set **Destination URL**: `/profile`
   - Click **Send Broadcast**.
3. **Verify on iPhone**:
   - The lock screen lights up with a native notification banner showing the title, message, and app icon.
   - Tap the banner: the app opens directly to the destination URL (`/profile`).
   - The **Notification Bell** in the header displays the unread badge (`1 New`).

---

## 6. Android Setup & Testing Walkthrough

### Step 1: Open Chrome on Android

1. Open **Google Chrome** (or Samsung Internet).
2. Navigate to your production HTTPS URL.
3. Sign in to your account.

### Step 2: (Optional) Install App to Home Screen

- Tap the Chrome menu (`⋮`) > **"Install app"** or **"Add to Home screen"**. (Notifications work in both browser and installed PWA on Android).

### Step 3: Subscribe Device

1. Tap the **Notification Bell** icon in the header (or navigate to `/profile`).
2. Tap **Enable** (or **Subscribe Device**).
3. Chrome will display the browser permission prompt:
   > _"your-domain.com wants to send you notifications"_ → Tap **Allow**.
4. If Android 13+ displays the system notification permission dialog, tap **Allow**.

### Step 4: Test Delivery

1. Lock the Android phone or switch apps.
2. Send a broadcast from the admin dashboard.
3. **Verify on Android**:
   - The device vibrates/rings, the app icon appears in the Android status bar, and a heads-up banner is displayed.
   - Expanding the notification drawer shows the message.
   - Tapping the notification brings the app into focus and navigates to the target URL.

---

## 7. Troubleshooting & Common Pitfalls

| Issue                                             | Cause                                                                                                                | Solution                                                                                                                                                                         |
| :------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Subscribe Device" does nothing on iPhone**     | Running inside Safari browser tab instead of installed Home Screen PWA                                               | Tap Share > "Add to Home Screen", then open from the Home Screen.                                                                                                                |
| **Notification permission denied**                | User previously clicked "Don't Allow" or blocked in browser settings                                                 | **iOS**: Go to iPhone Settings > Notifications > [App Name] > Enable "Allow Notifications".<br>**Android**: Tap URL lock icon in Chrome > Site Settings > Notifications > Allow. |
| **Notifications show in Bell but no Push Banner** | Push subscription failed, or device was not subscribed                                                               | Verify row exists in `user_push_subscriptions` in Supabase table editor; check Edge Function logs for `send-app-notification`.                                                   |
| **401 Unauthorized / VAPID mismatch**             | `VITE_VAPID_PUBLIC_KEY` in frontend does not match `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in Edge Function secrets | Ensure the exact same public key string is used in frontend and backend secrets.                                                                                                 |
| **Expired / Uninstalled device subscriptions**    | Browser revoked push endpoint or app was uninstalled                                                                 | Expected behavior. Push service endpoints return HTTP 410 (Gone) or 404. `send-app-notification` automatically cleans up dead subscription rows.                                 |
