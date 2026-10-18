#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { getManilaDateString, parseConfig } from './config.js';
import { createSnapshotDatabase, getDatabaseSignature } from './db.js';
import { logger } from './logger.js';
import { executeSyncRun } from './sync.js';
import { createSystemTray } from './tray.js';

async function main() {
  const config = parseConfig();

  console.log(`
=====================================================
  Word Community - Service Attendance Sync Tool
=====================================================
Database:    ${path.resolve(config.dbPath)}
Endpoint:    ${config.endpoint}
Date:        ${config.targetDate}
Mode:        ${config.once ? 'Single-Run (--once)' : config.tray ? `System Tray & Watch (${config.pollIntervalMs / 1000}s interval)` : `Continuous Watch (${config.pollIntervalMs / 1000}s interval)`}
Sync Key:    ${config.syncKey ? 'Configured (***)' : 'MISSING (Must configure SYNC_API_KEY)'}
${config.dryRun ? 'DRY RUN:     ENABLED (No data will be sent)\n' : ''}=====================================================
`);

  if (!config.syncKey && !config.dryRun) {
    logger.error('Missing SYNC_API_KEY. Configure SYNC_API_KEY in .env or pass --key <key>');
    process.exit(1);
  }

  if (!fs.existsSync(config.dbPath)) {
    logger.error(`SQLite database file not found at: ${config.dbPath}`);
    process.exit(1);
  }
  logger.info('Live SQLite database verified. Zero-locking Snapshot Mode active.');

  let isRunning = true;
  let isSyncing = false;
  let intervalId = null;
  let tray = null;

  const cleanup = () => {
    if (!isRunning) return;
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    if (tray) {
      tray.close();
      tray = null;
    }
    logger.info('Shutting down attendance sync service...');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Helper to run one sync cycle
  const runCycle = async () => {
    if (isSyncing || !isRunning) return;
    isSyncing = true;
    if (tray) {
      tray.updateStatus('Status: Syncing...', `WC Attendance Sync - Syncing ${config.targetDate}`);
    }
    let snapshot = null;
    try {
      // Auto-update targetDate to today if not pinned by CLI flag or env
      const currentDate = getManilaDateString();
      if (
        !process.argv.includes('--date') &&
        !process.env.TARGET_DATE &&
        config.targetDate !== currentDate
      ) {
        logger.info(
          `Date changed from ${config.targetDate} to ${currentDate}. Updating sync target.`,
        );
        config.targetDate = currentDate;
        if (tray) {
          tray.updateDate(currentDate);
        }
      }

      snapshot = createSnapshotDatabase(config.dbPath);
      const result = await executeSyncRun(snapshot.db, config);

      if (tray) {
        const timeStr = new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        });

        if (result?.error) {
          tray.updateStatus('Status: Error (Sync failed)', 'WC Attendance Sync - Error');
          tray.notify({
            title: 'Attendance Sync Error',
            message: result.error,
            type: 'Error',
          });
        } else if (result && result.syncedCount > 0) {
          tray.updateStatus(`Status: Idle (Synced ${timeStr})`, 'WC Attendance Sync - Active');
          tray.notify({
            title: 'Attendance Records Synced',
            message: `Successfully synced ${result.syncedCount} record(s) for ${config.targetDate}.`,
            type: 'Info',
          });
        } else {
          tray.updateStatus(
            `Status: Watching (Last check ${timeStr})`,
            'WC Attendance Sync - Active',
          );
        }
      }
    } catch (err) {
      logger.error('Unexpected error during sync cycle', err);
      if (tray) {
        tray.updateStatus('Status: Error', 'WC Attendance Sync - Error');
        tray.notify({
          title: 'Attendance Sync Exception',
          message: err.message,
          type: 'Error',
        });
      }
    } finally {
      if (snapshot) {
        snapshot.close();
      }
      isSyncing = false;
    }
  };

  if (config.tray) {
    const openLogsDir = () => {
      const logsDir = path.resolve(process.cwd(), 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      if (process.platform === 'win32') {
        spawn('explorer.exe', [logsDir], { detached: true, stdio: 'ignore' }).unref();
      } else if (process.platform === 'darwin') {
        spawn('open', [logsDir], { detached: true, stdio: 'ignore' }).unref();
      } else if (process.platform === 'linux') {
        spawn('xdg-open', [logsDir], { detached: true, stdio: 'ignore' }).unref();
      }
    };

    const openConfigFile = () => {
      const envPath = path.resolve(process.cwd(), '.env');
      if (process.platform === 'win32') {
        spawn('notepad.exe', [envPath], { detached: true, stdio: 'ignore' }).unref();
      } else if (process.platform === 'darwin') {
        spawn('open', ['-t', envPath], { detached: true, stdio: 'ignore' }).unref();
      } else if (process.platform === 'linux') {
        spawn('xdg-open', [envPath], { detached: true, stdio: 'ignore' }).unref();
      }
    };

    tray = createSystemTray({
      targetDate: config.targetDate,
      onSyncNow: () => runCycle(),
      onViewLogs: openLogsDir,
      onOpenConfig: openConfigFile,
      onExit: cleanup,
    });
    tray.init();
  }

  // Run initial pass
  await runCycle();

  if (config.once) {
    cleanup();
    return;
  }

  let lastSignature = getDatabaseSignature(config.dbPath);

  logger.info(`Watching for new attendance records... (Press Ctrl+C to stop)`);

  // Watch for changes via polling + signature check
  intervalId = setInterval(async () => {
    if (!isRunning || isSyncing) return;

    try {
      if (fs.existsSync(config.dbPath)) {
        const currentSignature = getDatabaseSignature(config.dbPath);
        const currentDate = getManilaDateString();
        const dateChanged =
          !process.argv.includes('--date') &&
          !process.env.TARGET_DATE &&
          config.targetDate !== currentDate;

        if (currentSignature !== lastSignature || dateChanged) {
          lastSignature = currentSignature;
          await runCycle();
        }
      }
    } catch {
      // Silently retry on next tick if file temporarily locked by writer
    }
  }, config.pollIntervalMs);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
