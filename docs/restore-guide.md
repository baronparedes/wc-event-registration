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

## Method 2: Manual Restore via Command Line (Local Machine)

Use this method if you wish to run the restore locally or from an administrative server.

### Required Tools

- `aws-cli` (or `rclone` / Cloudflare Dashboard download)
- `gpg` (GnuPG)
- `gzip` / `gunzip`
- `psql` (PostgreSQL client)

### Step-by-Step CLI Instructions:

#### Step 1: Download Backup Archive from Cloudflare R2

You can download the file directly from the Cloudflare R2 dashboard UI or using AWS CLI:

```bash
aws s3 cp "s3://<CF_R2_BUCKET_NAME>/supabase-backup-YYYYMMDD-HHMMSS.sql.gz.gpg" ./backup.sql.gz.gpg \
  --endpoint-url "https://<CF_R2_ACCOUNT_ID>.r2.cloudflarestorage.com" \
  --region auto
```

#### Step 2: Decrypt the Backup Archive

Decrypt the `.gpg` file using GPG:

```bash
gpg --decrypt --batch --yes --passphrase "<YOUR_BACKUP_ENCRYPTION_PASSPHRASE>" backup.sql.gz.gpg > backup.sql.gz
```

#### Step 3: Decompress the Backup SQL File

Decompress the `.sql.gz` file:

```bash
gunzip backup.sql.gz
```

#### Step 4: Apply SQL Dump to Target Supabase Postgres Instance

Execute `psql` against your target Supabase connection string:

```bash
psql "<TARGET_SUPABASE_DB_URL>" -f backup.sql
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
