#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { getManilaDateString, parseConfig } from './config.js';
import { createSnapshotDatabase } from './db.js';
import { logger } from './logger.js';
import { executeSyncRun } from './sync.js';

async function main() {
  const config = parseConfig();

  console.log(`
=====================================================
  Word Community - Service Attendance Sync Tool
=====================================================
Database:    ${path.resolve(config.dbPath)}
Endpoint:    ${config.endpoint}
Date:        ${config.targetDate}
Mode:        ${config.once ? 'Single-Run (--once)' : `Continuous Watch (${config.pollIntervalMs / 1000}s interval)`}
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
  let lastMtime = 0;

  const cleanup = () => {
    if (!isRunning) return;
    isRunning = false;
    logger.info('Shutting down attendance sync service...');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Helper to run one sync cycle
  const runCycle = async () => {
    if (isSyncing || !isRunning) return;
    isSyncing = true;
    let snapshot = null;
    try {
      // Auto-update targetDate to today if not pinned by CLI flag
      const currentDate = getManilaDateString();
      if (!process.argv.includes('--date') && config.targetDate !== currentDate) {
        logger.info(
          `Date changed from ${config.targetDate} to ${currentDate}. Updating sync target.`,
        );
        config.targetDate = currentDate;
      }

      snapshot = createSnapshotDatabase(config.dbPath);
      await executeSyncRun(snapshot.db, config);
    } catch (err) {
      logger.error('Unexpected error during sync cycle', err);
    } finally {
      if (snapshot) {
        snapshot.close();
      }
      isSyncing = false;
    }
  };

  // Run initial pass
  await runCycle();

  if (config.once) {
    cleanup();
    return;
  }

  logger.info(`Watching for new attendance records... (Press Ctrl+C to stop)`);

  // Watch for changes via polling + mtime check
  const intervalId = setInterval(async () => {
    if (!isRunning) return;

    try {
      if (fs.existsSync(config.dbPath)) {
        const stats = fs.statSync(config.dbPath);
        // If file modified or WAL changed, or routine poll check
        if (stats.mtimeMs !== lastMtime) {
          lastMtime = stats.mtimeMs;
          await runCycle();
        }
      }
    } catch {
      // Silently retry on next tick if file temporarily locked by writer
    }
  }, config.pollIntervalMs);

  // Prevent interval from blocking cleanup if needed
  intervalId.unref?.();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
