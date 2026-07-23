## Plan: Automated Supabase Production Backup via GitHub Actions (Free Plan)

Establish a low-cost, repeatable backup process for production Supabase data using scheduled GitHub Actions. The plan prioritizes database recoverability, secret safety, and restore confidence while staying compatible with Free plan constraints.

**Objective**

1. Create automated daily production database backups.
1. Store backups outside Supabase for durability.
1. Ensure backups are encrypted at rest.
1. Prove recoverability with a recurring restore rehearsal.

**Scope**

1. In scope:
1. GitHub Actions workflow for scheduled Postgres dumps.
1. Secret management in GitHub repository settings.
1. Backup retention policy and naming convention.
1. Monthly restore drill workflow and checklist.
1. Out of scope:
1. Real-time replication/disaster recovery architecture.
1. Continuous WAL archiving pipeline.
1. Supabase Storage object backup automation (tracked as follow-up if required).

**Constraints**

1. Supabase Free plan (no managed PITR assumptions).
1. Use only GitHub Actions plus external object storage.
1. Keep implementation simple enough to maintain by one team.

**Target Validation**

1. Backup job succeeds on schedule for 7 consecutive days.
1. Encrypted backup artifact exists for each run with expected file size.
1. Restore drill succeeds at least once per month.
1. Key table row counts and core queries match expected post-restore health checks.

**Backup Strategy**

1. Primary data source: Supabase production Postgres via direct connection string.
1. Dump format: `pg_dump --format=custom` for flexible restore with `pg_restore`.
1. Compression: `gzip -9`.
1. Encryption: `openssl aes-256-cbc` with PBKDF2 and repository secret passphrase.
1. Retention:
1. Daily backups retained for 30 days.
1. Weekly backups retained for 12 weeks.
1. Monthly backup retained for 12 months.
1. Storage target preference order:
1. S3-compatible bucket (AWS S3, Cloudflare R2, or Backblaze B2).
1. GitHub artifact as temporary fallback only.

**Phased Implementation**

1. Phase 1 - Access and secret preparation
1. Generate a dedicated database credential with least required read permissions for backup.
1. Capture production DB connection string with `sslmode=require`.
1. Add GitHub secrets:
1. `SUPABASE_DB_URL`
1. `BACKUP_PASSPHRASE`
1. Storage credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, bucket name) or provider equivalent.
1. Define action-level permissions as `contents: read` only.
1. Phase 2 - Daily backup workflow
1. Add scheduled and manual-dispatch workflow at `.github/workflows/prod-supabase-backup.yml`.
1. Install Postgres client in runner.
1. Run dump, compress, encrypt, and generate deterministic timestamped filename.
1. Upload encrypted artifact to object storage path partitioned by year/month/day.
1. Add run summary output including file name, byte size, and destination URI (no secrets).
1. Phase 3 - Retention and lifecycle controls
1. Enforce retention with bucket lifecycle rules when possible.
1. If lifecycle rules are unavailable, add scheduled cleanup step to remove objects older than retention limits.
1. Keep GitHub artifact retention short (7-30 days) when fallback is enabled.
1. Phase 4 - Restore drill automation
1. Add `.github/workflows/prod-supabase-restore-drill.yml` scheduled monthly plus manual dispatch.
1. Download latest encrypted backup from object storage.
1. Decrypt and restore into isolated Postgres target (local runner service container or dedicated staging DB).
1. Execute verification SQL checks (critical table existence, row-count sanity, sample query pass).
1. Publish restore report in workflow summary and fail the run on any mismatch.
1. Phase 5 - Operational hardening
1. Add alerting via GitHub notifications for failed scheduled runs.
1. Add runbook section in docs with incident response steps.
1. Rotate backup credentials and passphrase on a fixed schedule (for example quarterly).

**Workflow Design Notes**

1. Use UTC timestamp naming: `supabase-prod-YYYYMMDDTHHMMSSZ.dump.gz.enc`.
1. Prefer `set -euo pipefail` in workflow shell scripts.
1. Never print connection strings, tokens, or passphrases.
1. Keep restore target isolated from production networks and credentials.
1. Include a backup manifest JSON per run with checksum (`sha256`) and metadata.

**Restore Drill Checklist**

1. Fetch latest backup and checksum manifest.
1. Validate checksum before decryption.
1. Decrypt and decompress successfully.
1. Restore with `pg_restore` to empty target database.
1. Validate:
1. Expected schemas/tables exist.
1. Critical row counts are non-zero and in expected ranges.
1. Core query smoke tests pass.
1. Record drill result and next action items.

**Risks and Mitigations**

1. Risk: backup credential compromise.
1. Mitigation: least-privilege role, secret rotation, encrypted payload, no plaintext dumps persisted.
1. Risk: silent backup corruption.
1. Mitigation: checksum manifest plus monthly restore validation.
1. Risk: retention misconfiguration causing data loss.
1. Mitigation: dual-layer retention checks (bucket policy + periodic audit workflow).
1. Risk: storage outage during backup window.
1. Mitigation: retry with exponential backoff and optional short-lived GitHub artifact fallback.

**Deliverables**

1. `prod-supabase-backup.yml` workflow.
1. `prod-supabase-restore-drill.yml` workflow.
1. Backup runbook section in `README.md` or `docs/` with restore procedure.
1. Secrets checklist for repository administrators.

**Definition of Done**

1. Daily backup workflow exists and has two successful consecutive scheduled runs.
1. Backup files are encrypted and stored in external object storage.
1. Monthly restore drill workflow exists and has one successful run.
1. Team can execute restore runbook end-to-end without tribal knowledge.

**Follow-Up (Optional)**

1. Add Supabase Storage bucket backup (if object files are business critical).
1. Add immutable object lock policy for ransomware resistance.
1. Add dashboard metrics for backup age, size drift, and restore success trend.
