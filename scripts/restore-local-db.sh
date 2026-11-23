#!/usr/bin/env bash
set -euo pipefail

# One-command local Supabase database restore from a production backup.
# Works with both legacy full pg_dump backups and scoped (auth + public) backups,
# in .sql, .sql.gz, or .sql.gz.gpg format, or directly from Cloudflare R2.

CONTAINER_NAME="${SUPABASE_DB_CONTAINER:-supabase_db_wc-event-registration}"
SKIP_RESET=false
SOURCE_MODE=""
SOURCE_ARG=""

usage() {
  cat <<'EOF'
Usage:
  npm run supabase:db:restore -- <path/to/backup.sql[.gz[.gpg]]>
  npm run supabase:db:restore -- --latest
  npm run supabase:db:restore -- --r2 <backup-filename.sql.gz.gpg>

Options:
  --latest          Download and restore the newest backup from Cloudflare R2
  --r2 <filename>   Download and restore a specific backup file from Cloudflare R2
  --skip-reset      Skip `supabase db reset --no-seed` before loading data
  -h, --help        Show this help message

Environment variables (optional; auto-loaded from .env, .env.local, or .env.backup.local):
  BACKUP_ENCRYPTION_PASSPHRASE  GPG passphrase (if omitted, gpg prompts interactively)
  CF_R2_ACCOUNT_ID              Cloudflare R2 Account ID (for --latest / --r2)
  CF_R2_BUCKET_NAME             Cloudflare R2 Bucket Name (for --latest / --r2)
  CF_R2_ACCESS_KEY_ID           Cloudflare R2 Access Key ID (or AWS_ACCESS_KEY_ID)
  CF_R2_SECRET_ACCESS_KEY       Cloudflare R2 Secret Access Key (or AWS_SECRET_ACCESS_KEY)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --latest)
      SOURCE_MODE="r2_latest"
      shift
      ;;
    --r2)
      if [[ $# -lt 2 ]]; then
        echo "Error: --r2 requires a backup filename." >&2
        exit 1
      fi
      SOURCE_MODE="r2_file"
      SOURCE_ARG="$2"
      shift 2
      ;;
    --skip-reset)
      SKIP_RESET=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Error: Unknown option '$1'" >&2
      usage
      exit 1
      ;;
    *)
      if [[ -n "$SOURCE_MODE" ]]; then
        echo "Error: Multiple backup sources specified." >&2
        usage
        exit 1
      fi
      SOURCE_MODE="local_file"
      SOURCE_ARG="$1"
      shift
      ;;
  esac
done

if [[ -z "$SOURCE_MODE" ]]; then
  usage
  exit 1
fi

# Load backup-related vars from local env files (precedence: shell > .env.backup.local > .env.local > .env)
load_backup_env_file() {
  local env_file="$1"
  [[ -f "$env_file" ]] || return 0

  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" == *"="* ]] || continue

    local key="${line%%=*}"
    local val="${line#*=}"
    key="${key#export }"
    key="${key//[[:space:]]/}"

    case "$key" in
      BACKUP_ENCRYPTION_PASSPHRASE|CF_R2_ACCOUNT_ID|CF_R2_BUCKET_NAME|CF_R2_ACCESS_KEY_ID|CF_R2_SECRET_ACCESS_KEY|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|SUPABASE_DB_CONTAINER)
        if [[ -z "${!key:-}" ]]; then
          if [[ "$val" =~ ^\"(.*)\"$ ]]; then
            val="${BASH_REMATCH[1]}"
          elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
            val="${BASH_REMATCH[1]}"
          fi
          export "${key}=${val}"
        fi
        ;;
    esac
  done < "$env_file"
}

load_backup_env_file ".env.backup.local"
load_backup_env_file ".env.local"
load_backup_env_file ".env"
CONTAINER_NAME="${SUPABASE_DB_CONTAINER:-$CONTAINER_NAME}"

# Verify Docker and local Supabase DB container
if ! command -v docker >/dev/null 2>&1; then
  echo "Error: docker is required to restore into local Supabase." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "Error: Local Supabase Postgres container '${CONTAINER_NAME}' is not running." >&2
  echo "Start local Supabase first with: npm run supabase:start" >&2
  exit 1
fi

TMP_DIR=$(mktemp -d)
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

INPUT_FILE=""

if [[ "$SOURCE_MODE" == "local_file" ]]; then
  if [[ ! -f "$SOURCE_ARG" ]]; then
    echo "Error: Backup file not found: $SOURCE_ARG" >&2
    exit 1
  fi
  INPUT_FILE="$SOURCE_ARG"
else
  if ! command -v aws >/dev/null 2>&1; then
    echo "Error: aws CLI is required for --latest / --r2 downloads." >&2
    exit 1
  fi

  R2_ACCESS_KEY="${CF_R2_ACCESS_KEY_ID:-${AWS_ACCESS_KEY_ID:-}}"
  R2_SECRET_KEY="${CF_R2_SECRET_ACCESS_KEY:-${AWS_SECRET_ACCESS_KEY:-}}"

  if [[ -z "${CF_R2_ACCOUNT_ID:-}" || -z "${CF_R2_BUCKET_NAME:-}" || -z "$R2_ACCESS_KEY" || -z "$R2_SECRET_KEY" ]]; then
    echo "Error: Cloudflare R2 credentials missing." >&2
    echo "Set CF_R2_ACCOUNT_ID, CF_R2_BUCKET_NAME, CF_R2_ACCESS_KEY_ID, and CF_R2_SECRET_ACCESS_KEY (or put them in .env.backup.local)." >&2
    exit 1
  fi

  R2_ENDPOINT="https://${CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com"

  if [[ "$SOURCE_MODE" == "r2_latest" ]]; then
    echo "Finding latest backup in Cloudflare R2 bucket '${CF_R2_BUCKET_NAME}'..."
    SOURCE_ARG=$(
      AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY" \
      AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY" \
      AWS_DEFAULT_REGION="auto" \
      aws s3 ls "s3://${CF_R2_BUCKET_NAME}/" --endpoint-url "$R2_ENDPOINT" \
        | awk '{print $NF}' \
        | grep -E '^supabase-backup-.*\.sql\.gz\.gpg$' \
        | sort \
        | tail -n 1
    )
    if [[ -z "$SOURCE_ARG" ]]; then
      echo "Error: No supabase-backup-*.sql.gz.gpg files found in bucket '${CF_R2_BUCKET_NAME}'." >&2
      exit 1
    fi
    echo "Latest backup found: ${SOURCE_ARG}"
  fi

  INPUT_FILE="${TMP_DIR}/${SOURCE_ARG}"
  echo "Downloading ${SOURCE_ARG} from Cloudflare R2..."
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY" \
  AWS_SECRET_ACCESS_KEY="$R2_SECRET_KEY" \
  AWS_DEFAULT_REGION="auto" \
  aws s3 cp "s3://${CF_R2_BUCKET_NAME}/${SOURCE_ARG}" "$INPUT_FILE" \
    --endpoint-url "$R2_ENDPOINT"
fi

# Decrypt / decompress into temporary SQL file
SQL_FILE="${TMP_DIR}/backup.sql"

case "$INPUT_FILE" in
  *.sql.gz.gpg)
    if ! command -v gpg >/dev/null 2>&1; then
      echo "Error: gpg is required to decrypt .gpg backups (brew install gnupg)." >&2
      exit 1
    fi
    echo "Decrypting and decompressing $(basename "$INPUT_FILE")..."
    if [[ -n "${BACKUP_ENCRYPTION_PASSPHRASE:-}" ]]; then
      gpg --decrypt --batch --yes --passphrase "$BACKUP_ENCRYPTION_PASSPHRASE" "$INPUT_FILE" \
        | gunzip -c > "$SQL_FILE"
    else
      gpg --decrypt "$INPUT_FILE" | gunzip -c > "$SQL_FILE"
    fi
    ;;
  *.sql.gz)
    echo "Decompressing $(basename "$INPUT_FILE")..."
    gunzip -c "$INPUT_FILE" > "$SQL_FILE"
    ;;
  *.sql)
    cp "$INPUT_FILE" "$SQL_FILE"
    ;;
  *)
    echo "Error: Unsupported file extension for '$INPUT_FILE'. Expected .sql, .sql.gz, or .sql.gz.gpg." >&2
    exit 1
    ;;
esac

# Reset local DB schema cleanly from local migrations (no seed data)
if [[ "$SKIP_RESET" == "false" ]]; then
  if ! command -v supabase >/dev/null 2>&1; then
    echo "Error: supabase CLI is required for schema reset (or pass --skip-reset)." >&2
    exit 1
  fi
  echo "Resetting local Supabase schema (without seed data)..."
  supabase db reset --no-seed
fi

echo "Restoring auth users/identities and public schema data..."
{
  cat <<'SQL'
SET session_replication_role = replica;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'TRUNCATE TABLE public.' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;
TRUNCATE TABLE auth.identities, auth.users CASCADE;
SQL

  awk '
    /^COPY (public\.|auth\.users |auth\.identities )/ { in_copy=1 }
    in_copy { print }
    in_copy && /^\\\.$/ { in_copy=0; next }
    /^SELECT pg_catalog\.setval\(.*public\./ { print }
  ' "$SQL_FILE"

  cat <<'SQL'
SET session_replication_role = origin;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    UPDATE cron.job SET active = false;
  END IF;
END $$;
SQL
} | docker exec -i "$CONTAINER_NAME" psql -U postgres -d postgres -v ON_ERROR_STOP=1 >/dev/null

echo ""
echo "Local database restored successfully! Top populated public tables:"
docker exec -i "$CONTAINER_NAME" psql -U postgres -d postgres -c "
SELECT relname AS table_name, n_live_tup AS rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 15;
"
