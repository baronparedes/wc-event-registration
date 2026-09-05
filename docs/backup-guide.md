# Supabase Automated Backup & Restoration Guide

This guide details the automated database backup and manual restoration architecture using **GitHub Actions**, **GPG Encryption**, and **Cloudflare R2 Object Storage**, along with step-by-step setup instructions.

---

## Overview

- **Schedule**: Every Monday at 01:00 AM PHT (Sunday 17:00 UTC) or manually on-demand via `workflow_dispatch`.
- **Pipeline**:
  1. Dumps full database schema and data from Supabase Postgres using `pg_dump`.
  2. Compresses the dump using `gzip`.
  3. Encrypts the compressed file using `gpg` symmetric AES256 encryption.
  4. Securely uploads the resulting archive (`supabase-backup-YYYYMMDD-HHMMSS.sql.gz.gpg`) to a Cloudflare R2 bucket.

---

## 1. Cloudflare R2 Setup

1. Log into your **Cloudflare Dashboard**.
2. Navigate to **R2 Object Storage** from the left navigation menu.
3. Click **Create bucket** and name your bucket (e.g., `wc-supabase-backups`).
4. Note your Cloudflare **Account ID** (found on the right sidebar of the R2 Overview page or in your dashboard URL).
5. Generate R2 API Credentials:
   - Click **Manage R2 API Tokens** on the right side of the R2 Overview page.
   - Click **Create API Token**.
   - Give the token **Admin Read & Write** permissions (or Object Read & Write scoped to your backup bucket).
   - Click **Create API Token** and safely copy:
     - **Access Key ID**
     - **Secret Access Key**

---

## 2. GitHub Secrets Configuration

In your GitHub repository, navigate to **Settings** > **Secrets and variables** > **Actions** and add the following repository secrets:

| Secret Name | Description | Example / Format |
| :--- | :--- | :--- |
| `SUPABASE_DB_URL` | Direct PostgreSQL connection string to your Supabase instance. | `postgres://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres` |
| `BACKUP_ENCRYPTION_PASSPHRASE` | Secure passphrase used by GPG for AES256 symmetric encryption. | A strong random string (e.g. 32+ chars) |
| `CF_R2_ACCOUNT_ID` | Cloudflare Account ID for your R2 endpoint URL. | `abc123def4567890ghijkl1234567890` |
| `CF_R2_BUCKET_NAME` | Name of the Cloudflare R2 bucket. | `wc-supabase-backups` |
| `CF_R2_ACCESS_KEY_ID` | Cloudflare R2 API Access Key ID. | `1234567890abcdef1234567890abcdef` |
| `CF_R2_SECRET_ACCESS_KEY` | Cloudflare R2 API Secret Access Key. | `abcdef1234567890...` |

> ⚠️ **Note on Supabase Connection String**: Make sure you use the Direct Connection String or Session Pooler connection string (Port 5432 or 6543) with the `postgres` user credentials.

---

## 3. Triggering Manual Backups

You can manually trigger a backup at any time:
1. Go to the **Actions** tab in your GitHub repository.
2. Select **Supabase Database Backup** from the left sidebar.
3. Click **Run workflow** > **Run workflow**.

---

## 4. Restoration Guide

### Option A: Restore via GitHub Actions (Recommended)

You can trigger a restoration directly from GitHub Actions without needing local command line tools:

1. Go to the **Actions** tab in your GitHub repository.
2. Select **Restore Supabase Database Backup** from the left sidebar.
3. Click **Run workflow**.
4. Enter the required parameters:
   - **`backup_filename`**: The filename in your Cloudflare R2 bucket (e.g., `supabase-backup-20250101-000000.sql.gz.gpg`).
   - **`confirm_restore`**: Type `RESTORE` to confirm the operation.
5. Click **Run workflow**.

The workflow will download the file from Cloudflare R2, decrypt it using your secret passphrase, uncompress it, and apply it to your database via `psql`.

---

### Option B: Restore via Local CLI

To restore your Supabase database locally or from your own machine:

#### Step 1: Download the Backup File from Cloudflare R2
Download the file from Cloudflare R2 Dashboard or using AWS CLI:

```bash
aws s3 cp s3://<CF_R2_BUCKET_NAME>/<BACKUP_FILE_NAME>.sql.gz.gpg ./ \
  --endpoint-url https://<CF_R2_ACCOUNT_ID>.r2.cloudflarestorage.com
```

#### Step 2: Decrypt the Backup
Decrypt the encrypted archive using `gpg` with your encryption passphrase:

```bash
gpg --decrypt --batch --passphrase "<YOUR_BACKUP_ENCRYPTION_PASSPHRASE>" <BACKUP_FILE_NAME>.sql.gz.gpg > backup.sql.gz
```

#### Step 3: Uncompress the Backup
Uncompress the `.gz` file to retrieve the raw `.sql` file:

```bash
gunzip backup.sql.gz
```

#### Step 4: Restore to Supabase Postgres
Restore the SQL dump to your target Supabase PostgreSQL instance:

```bash
psql "<TARGET_SUPABASE_DB_URL>" -f backup.sql
```

> ⚠️ **Warning**: Restoring a full SQL dump will overwrite or modify existing database tables and schema according to the `--clean --if-exists` flags in the backup dump. Ensure you are restoring to the correct database environment.
