# Supabase Database Restore Guide

This guide provides step-by-step instructions for restoring a Supabase PostgreSQL database from an encrypted backup archive stored in Cloudflare R2.

---

## Prerequisites

Before attempting a restore, ensure you have:

1. Access to the Cloudflare R2 bucket containing your encrypted backup files (`supabase-backup-YYYYMMDD-HHMMSS.sql.gz.gpg`).
2. The `BACKUP_ENCRYPTION_PASSPHRASE` used during the backup creation.
3. The target database PostgreSQL connection string (`SUPABASE_DB_URL`).

> ⚠️ **IMPORTANT WARNING**: Restoring a database backup replaces or modifies existing tables and data based on the `--clean --if-exists` flags generated during the export. Perform restores with caution and verify you are pointing to the intended database instance.

---

## Method 1: Restore via GitHub Actions Workflow (Recommended)

The automated restoration workflow allows you to restore directly from GitHub without needing local database or CLI tools installed.

### Steps:

1. Go to the **Actions** tab in your GitHub repository.
2. Select **Restore Supabase Database Backup** from the workflows list on the left.
3. Click **Run workflow** on the right.
4. Fill in the required inputs:
   - **`backup_filename`**: Enter the exact filename stored in your Cloudflare R2 bucket (e.g., `supabase-backup-20250330-170000.sql.gz.gpg`).
   - **`confirm_restore`**: Type `RESTORE` (all uppercase) to satisfy the safety guard.
5. Click **Run workflow**.

### What happens during execution:

- The workflow authenticates with Cloudflare R2 and downloads the requested file.
- It decrypts the file using `gpg` with `BACKUP_ENCRYPTION_PASSPHRASE`.
- It uncompresses the `.gz` archive.
- It restores the raw SQL file directly into the database specified by `SUPABASE_DB_URL`.

---

## Method 2: One-Command Restore to Local Supabase (Recommended for Local Dev)

To restore a production backup onto your local machine (`supabase start`), use the built-in npm script. It automatically handles decryption, decompression, clean schema reset (`supabase db reset --no-seed`), `auth.users`/`auth.identities` + `public` data loading, disabling local `pg_cron` jobs, and cleaning up temporary unencrypted files.

### From a local backup file (`.sql.gz.gpg`, `.sql.gz`, or `.sql`)

```bash
npm run supabase:db:restore -- ./supabase-backup-YYYYMMDD-HHMMSS.sql.gz.gpg
```

### Directly from Cloudflare R2

```bash
# Restore the latest backup in R2
npm run supabase:db:restore -- --latest

# Or restore a specific backup file from R2
npm run supabase:db:restore -- --r2 supabase-backup-YYYYMMDD-HHMMSS.sql.gz.gpg
```

> **Tip:** For `--latest` / `--r2`, you can save `CF_R2_ACCOUNT_ID`, `CF_R2_BUCKET_NAME`, `CF_R2_ACCESS_KEY_ID`, `CF_R2_SECRET_ACCESS_KEY`, and optionally `BACKUP_ENCRYPTION_PASSPHRASE` in your gitignored `.env`, `.env.local`, or `.env.backup.local` file in the project root.

---

## Method 3: Manual Restore via Command Line (Remote / Custom Postgres)

Use this method if you wish to restore directly to a remote Postgres instance from the CLI.

### Required Tools

- `aws-cli` (or `rclone` / Cloudflare Dashboard download)
- `gpg` (GnuPG)
- `gzip` / `gunzip`
- `psql` (PostgreSQL 17 client)

### Step-by-Step CLI Instructions:

#### Step 1: Download Backup Archive from Cloudflare R2

You can download the file directly from the Cloudflare R2 dashboard UI or using AWS CLI:

```bash
aws s3 cp "s3://<CF_R2_BUCKET_NAME>/supabase-backup-YYYYMMDD-HHMMSS.sql.gz.gpg" ./backup.sql.gz.gpg \
  --endpoint-url "https://<CF_R2_ACCOUNT_ID>.r2.cloudflarestorage.com" \
  --region auto
```

#### Step 2: Decrypt & Decompress the Backup Archive

```bash
gpg --decrypt backup.sql.gz.gpg | gunzip -c > backup.sql
```

#### Step 3: Strip PostgreSQL 17.6+ `\restrict` Guards & Apply SQL Dump

```bash
grep -vE '^\\(un)?restrict ' backup.sql | psql "<TARGET_SUPABASE_DB_URL>"
```

Example connection string format:
`postgres://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres`

---

## Verification & Post-Restore Steps

1. **Verify Table Structure & Row Counts**: Connect to your Supabase dashboard or use `psql` to verify key tables (`users`, `events`, `registrations`, etc.).
2. **Check Application Functionality**: Verify that the web application connects properly and reflects the restored data state.
3. **Clean Up Local Files**: If performing a local restore, remove unencrypted `.sql` and `.sql.gz` files from your machine once done:
   ```bash
   rm -f backup.sql backup.sql.gz backup.sql.gz.gpg
   ```
