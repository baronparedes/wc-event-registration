import fs from 'node:fs';
import path from 'node:path';

/**
 * Locates the application root directory (where .env or wc_attend.db lives).
 * Handles standalone binary execution (Deno compile), npm scripts, and arbitrary CWD.
 */
export function getAppBaseDirectory() {
  const candidates = [
    process.cwd(),
    typeof import.meta?.dirname === 'string' ? import.meta.dirname : null,
    typeof import.meta?.dirname === 'string' ? path.resolve(import.meta.dirname, '../..') : null,
    process.execPath ? path.dirname(process.execPath) : null,
    process.execPath ? path.resolve(path.dirname(process.execPath), '..') : null,
    process.execPath ? path.resolve(path.dirname(process.execPath), '../..') : null,
  ].filter(Boolean);

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, '.env')) || fs.existsSync(path.join(dir, 'wc_attend.db'))) {
      return dir;
    }
  }
  return process.cwd();
}

/**
 * Basic .env loader (zero external dependencies).
 * Reads .env from cwd, app directory, or executable directory.
 */
export function loadEnvFile(explicitPath) {
  const appBase = getAppBaseDirectory();
  const candidates = [
    explicitPath,
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local'),
    path.resolve(appBase, '.env'),
    path.resolve(appBase, '.env.local'),
    typeof import.meta?.dirname === 'string' ? path.resolve(import.meta.dirname, '.env') : null,
    typeof import.meta?.dirname === 'string'
      ? path.resolve(import.meta.dirname, '../../.env')
      : null,
    process.execPath ? path.resolve(path.dirname(process.execPath), '.env') : null,
    process.execPath ? path.resolve(path.dirname(process.execPath), '..', '.env') : null,
  ].filter(Boolean);

  for (const envPath of candidates) {
    if (fs.existsSync(envPath) && fs.statSync(envPath).isFile()) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx <= 0) continue;
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
            val = val.slice(1, -1);
          }
          if (!(key in process.env)) {
            process.env[key] = val;
          }
        }
        return envPath;
      } catch {
        // Continue to next candidate
      }
    }
  }
  return null;
}

/**
 * Resolves the default database path. If ATTENDANCE_DB_PATH is not set,
 * searches known candidate locations for wc_attend.db.
 */
export function resolveDefaultDbPath() {
  if (process.env.ATTENDANCE_DB_PATH) {
    return process.env.ATTENDANCE_DB_PATH;
  }
  const appBase = getAppBaseDirectory();
  const candidates = [
    path.resolve(process.cwd(), 'wc_attend.db'),
    path.resolve(appBase, 'wc_attend.db'),
    path.resolve(appBase, '..', 'wc_attend.db'),
    path.resolve(appBase, '../..', 'wc_attend.db'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return './wc_attend.db';
}

/**
 * Returns current date formatted as YYYY-MM-DD in Asia/Manila timezone (UTC+8).
 */
export function getManilaDateString(date = new Date()) {
  const manilaDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  return manilaDate;
}

/**
 * Parse CLI arguments into configuration object.
 */
export function parseConfig(args = process.argv.slice(2)) {
  loadEnvFile();

  const config = {
    dbPath: resolveDefaultDbPath(),
    endpoint:
      process.env.SYNC_ENDPOINT ||
      (process.env.VITE_SUPABASE_URL
        ? `${process.env.VITE_SUPABASE_URL.replace(/\/$/, '')}/functions/v1/sync-kiosk-attendance`
        : 'http://127.0.0.1:54321/functions/v1/sync-kiosk-attendance'),
    syncKey: process.env.SYNC_API_KEY || process.env.ATTENDANCE_SYNC_KEY || '',
    targetDate: process.env.TARGET_DATE || getManilaDateString(),
    layoutId: process.env.LAYOUT_ID || undefined,
    pollIntervalMs: Math.max(1000, Number(process.env.POLL_INTERVAL_SECONDS || 3) * 1000),
    watch: true,
    once: false,
    tray: process.env.ENABLE_TRAY === 'true' || false,
    dryRun: false,
    resetState: false,
    batchSize: 500,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--db' && args[i + 1]) {
      config.dbPath = args[++i];
    } else if (arg === '--endpoint' && args[i + 1]) {
      config.endpoint = args[++i];
    } else if (arg === '--key' && args[i + 1]) {
      config.syncKey = args[++i];
    } else if (arg === '--date' && args[i + 1]) {
      config.targetDate = args[++i];
    } else if (arg === '--layout' && args[i + 1]) {
      config.layoutId = args[++i];
    } else if (arg === '--interval' && args[i + 1]) {
      config.pollIntervalMs = Math.max(1000, Number(args[++i]) * 1000);
    } else if (arg === '--batch-size' && args[i + 1]) {
      config.batchSize = Math.max(10, Number(args[++i]));
    } else if (arg === '--once') {
      config.once = true;
      config.watch = false;
    } else if (arg === '--watch') {
      config.watch = true;
      config.once = false;
    } else if (arg === '--tray') {
      config.tray = true;
      config.watch = true;
      config.once = false;
    } else if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--reset-state') {
      config.resetState = true;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return config;
}

function printHelp() {
  console.log(`
Attendance Sync Service (Kiosk / Host Client)

Usage:
  node tools/attendance-sync/cli.js [options]

Options:
  --db <path>           Path to wc_attend.db (default: ./wc_attend.db)
  --endpoint <url>      Supabase sync endpoint URL
  --key <api-key>       Attendance Sync API Key (X-Sync-Key)
  --date <YYYY-MM-DD>   Target date to sync (default: today Manila time)
  --layout <uuid>       Optional service layout ID override
  --interval <seconds>  Poll interval in seconds (default: 3)
  --batch-size <number> Maximum rows per HTTP request (default: 500)
  --watch               Run continuously and monitor for new records (default)
  --tray                Run with Windows System Tray icon and balloon notifications
  --once                Run once and exit
  --dry-run             Read and preview records without sending to Supabase
  --reset-state         Ignore checkpoint state and sync all rows for date
  --help, -h            Show this help message

Environment Variables:
  ATTENDANCE_DB_PATH    Path to wc_attend.db
  SYNC_ENDPOINT         Full endpoint URL
  SYNC_API_KEY          Attendance Sync API Key
  TARGET_DATE           Target date (YYYY-MM-DD)
  LAYOUT_ID             Optional layout UUID override
  POLL_INTERVAL_SECONDS Polling interval in seconds
  ENABLE_TRAY           Enable System Tray icon (true/false)
`);
}
