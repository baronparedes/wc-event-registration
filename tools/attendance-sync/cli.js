#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

import { getManilaDateString, parseConfig } from './config.js';
import { createSnapshotDatabase, getDatabaseSignature } from './db.js';
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
  let intervalId = null;

  const cleanup = () => {
    if (!isRunning) return;
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
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
