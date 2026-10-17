# Word Community - Standalone Attendance Sync Service

A standalone, lightweight service that continuously reads and monitors changes in the local SQLite attendance database (`wc_attend.db`) and synchronizes them to Supabase via a dedicated, secure Edge Function.

---

## 🔒 Security Architecture

- **Zero Database Credentials on Kiosks**: The kiosk machine does **NOT** require database URLs, passwords, or the `SUPABASE_SERVICE_ROLE_KEY`.
- **Dedicated Sync Key (`X-Sync-Key`)**: Authenticates solely through a scoped API key (`ATTENDANCE_SYNC_KEY`) set in your Supabase project secrets.
- **Server-Side Resolution**: Active layout seats and member lookup (RFID with name matching fallback) are handled securely inside the Supabase Edge Function (`sync-kiosk-attendance`).
- **Read-Only SQLite Access**: Opens `wc_attend.db` with `{ readOnly: true }` so it never conflicts with or locks the local kiosk application.

---

## 📋 Prerequisites

- **Node.js v22 or higher** (installed on the kiosk/computer).
  - Uses native built-in `node:sqlite` — **no Visual Studio C++ Build Tools or Xcode Command Line Tools required**.

---

## 🚀 Quick Setup & Configuration

### 1. Configure Supabase Secrets (One-Time)

In your Supabase project (dashboard or CLI), set the sync key secret:

```bash
# In Supabase Dashboard -> Project Settings -> Edge Functions -> Secrets
# Or via Supabase CLI:
supabase secrets set ATTENDANCE_SYNC_KEY=your_secure_random_key_here
```

Also add this key to your local `.env` if testing locally:

```env
ATTENDANCE_SYNC_KEY=your_secure_random_key_here
```

### 2. Configure the Kiosk Client

In the `tools/attendance-sync/` directory (or on the kiosk laptop):

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env`:
   ```env
   ATTENDANCE_DB_PATH=./wc_attend.db
   SYNC_ENDPOINT=https://<your-project-ref>.supabase.co/functions/v1/sync-kiosk-attendance
   SYNC_API_KEY=your_secure_random_key_here
   POLL_INTERVAL_SECONDS=3
   ```

---

## 💻 Running the Service

### Inside this Repository:

```bash
npm run sync:attendance
```

### Direct Script (Mac / Linux):

```bash
./run-sync.sh
```

### Direct Script (Windows):

Double-click `run-sync.bat` or run in Command Prompt / PowerShell:

```cmd
run-sync.bat
```

### Command Line Options:

```bash
node cli.js [options]

Options:
  --db <path>           Path to wc_attend.db (default: ./wc_attend.db)
  --endpoint <url>      Supabase sync endpoint URL
  --key <api-key>       Attendance Sync API Key (X-Sync-Key)
  --date <YYYY-MM-DD>   Target date to sync (default: today in Manila time)
  --layout <uuid>       Optional service layout ID override
  --interval <seconds>  Poll interval in seconds (default: 3)
  --batch-size <number> Maximum rows per HTTP request (default: 500)
  --watch               Run continuously and monitor for new records (default)
  --once                Run once and exit
  --dry-run             Read and preview records without sending to Supabase
  --reset-state         Ignore checkpoint state and sync all rows for date
```

---

## 🔄 How the Sync Works

1. **Date Filtering**:
   - By default, it targets the **current date** in `Asia/Manila` (`YYYY-MM-DD`).
   - If left running past midnight, it automatically updates to the new current date.
2. **State & Watermarking**:
   - Checkpoints are saved in `.attendance-sync-state.json`.
   - On each poll, it queries for rows with `id > last_synced_id` from:
     - `Comm_Attend` (`is_walk_in = false`)
     - `Walkin_Attend` (`is_walk_in = true`)
     - `OIC_Attend` (`is_walk_in = false`)
3. **Unmatched Member Logging**:
   - If an attendee's RFID or Name cannot be resolved to an active member in Supabase `public.users`, the record is logged to:
     `logs/unmatched-YYYY-MM-DD.jsonl`
   - Valid records continue to sync without interruption.

---

---

## 📦 Compiling Standalone Executables (.exe / macOS Binary)

You can compile this tool into a **single, standalone executable** that has **zero runtime dependencies** (the target Windows/Mac computer doesn't even need Node.js or npm installed):

```bash
# Build standalone Windows .exe (cross-compiled from Mac/Linux or Windows)
npm run build:sync:exe
# Output: tools/attendance-sync/bin/wc-attendance-sync.exe

# Build standalone macOS binary
npm run build:sync:mac
# Output: tools/attendance-sync/bin/wc-attendance-sync
```

---

## 🛠️ Deploying as a Background Service in Windows

You can deploy `wc-attendance-sync.exe` to run 24/7 in the background without needing a terminal window:

### Option A: 1-Click Installer Script (`install-windows-service.bat`)

1. Copy `wc-attendance-sync.exe` and `.env` to a folder on your Windows machine (e.g. `C:\wc-sync\`).
2. Copy `install-windows-service.bat` into that same folder.
3. Right-click `install-windows-service.bat` and select **Run as Administrator**.
4. Choose **[1]** to register it as an automatic Windows Background Task (Task Scheduler, starts on boot) or **[2]** for NSSM.

### Option B: Native Windows Task Scheduler (CLI)

Open an Administrator Command Prompt:

```cmd
schtasks /create /f /tn "WCAttendanceSync" /tr "C:\wc-sync\wc-attendance-sync.exe --watch" /sc onstart /ru SYSTEM /rl HIGHEST
schtasks /run /tn "WCAttendanceSync"
```

### Option C: Native Windows Service (via NSSM)

If you prefer managing it through `services.msc`:

```cmd
nssm install WCAttendanceSync "C:\wc-sync\wc-attendance-sync.exe" "--watch"
nssm set WCAttendanceSync AppDirectory "C:\wc-sync\"
nssm set WCAttendanceSync Start SERVICE_AUTO_START
nssm start WCAttendanceSync
```

---

## 🍎 Deploying as a Background Daemon in macOS

To run automatically in the background on startup:

1. Copy the folder to `/Users/Shared/wc-attendance-sync/`
2. Update the plist template `com.wc.attendance-sync.plist` with your executable path (`/dist/wc-attendance-sync` or node script).
3. Copy to LaunchAgents and load:
   ```bash
   cp com.wc.attendance-sync.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.wc.attendance-sync.plist
   ```
4. Check status or stop:
   ```bash
   launchctl list | grep attendance-sync
   launchctl unload ~/Library/LaunchAgents/com.wc.attendance-sync.plist
   ```
