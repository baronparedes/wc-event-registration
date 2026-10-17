import { sendAttendanceBatch } from './client.js';
import { fetchNewAttendanceRecords } from './db.js';
import { logUnmatchedRecords, logger } from './logger.js';
import { loadSyncState, saveSyncState } from './state.js';

/**
 * Execute a single synchronization run.
 * Returns { syncedCount, unmatchedCount, hasMore }
 */
export async function executeSyncRun(db, config) {
  const state = config.resetState
    ? { date: config.targetDate, Comm_Attend: 0, Walkin_Attend: 0, OIC_Attend: 0 }
    : loadSyncState(config.targetDate);

  const { records, newCheckpoint } = fetchNewAttendanceRecords(db, config.targetDate, state);

  if (records.length === 0) {
    return { syncedCount: 0, unmatchedCount: 0, hasMore: false };
  }

  logger.sync(
    `Found ${records.length} new attendance record(s) for ${config.targetDate} to sync...`,
  );

  if (config.dryRun) {
    logger.info(`[DRY-RUN] Would send ${records.length} records to ${config.endpoint}`);
    console.table(
      records.slice(0, 5).map((r) => ({
        source: r.source_table,
        id: r.source_id,
        name: r.name,
        rfid: r.rfid,
        slot: r.time_slot,
        table: r.table,
      })),
    );
    if (records.length > 5) {
      logger.info(`... and ${records.length - 5} more records.`);
    }
    return { syncedCount: records.length, unmatchedCount: 0, hasMore: false };
  }

  // Send in batches of batchSize
  const batchSize = config.batchSize || 500;
  let totalInserted = 0;
  let totalUpdated = 0;
  let allUnmatched = [];

  for (let i = 0; i < records.length; i += batchSize) {
    const chunk = records.slice(i, i + batchSize);
    const chunkNumber = Math.floor(i / batchSize) + 1;
    const totalChunks = Math.ceil(records.length / batchSize);

    if (totalChunks > 1) {
      logger.sync(`Sending batch ${chunkNumber}/${totalChunks} (${chunk.length} records)...`);
    }

    const result = await sendAttendanceBatch({
      endpoint: config.endpoint,
      syncKey: config.syncKey,
      targetDate: config.targetDate,
      layoutId: config.layoutId,
      records: chunk,
    });

    if (!result.success) {
      logger.error(`Batch sync failed: ${result.error}`);
      return {
        syncedCount: totalInserted + totalUpdated,
        unmatchedCount: allUnmatched.length,
        error: result.error,
      };
    }

    const data = result.data;
    totalInserted += Number(data.inserted_count || 0);
    totalUpdated += Number(data.updated_count || 0);

    if (Array.isArray(data.unmatched) && data.unmatched.length > 0) {
      allUnmatched = allUnmatched.concat(data.unmatched);
      logUnmatchedRecords(config.targetDate, data.unmatched);
    }
  }

  // Update checkpoint only after full success
  saveSyncState({
    date: config.targetDate,
    Comm_Attend: newCheckpoint.Comm_Attend,
    Walkin_Attend: newCheckpoint.Walkin_Attend,
    OIC_Attend: newCheckpoint.OIC_Attend,
  });

  logger.success(
    `Sync complete for ${config.targetDate}: ${totalInserted} inserted, ${totalUpdated} updated, ${allUnmatched.length} unmatched.`,
  );

  return {
    syncedCount: totalInserted + totalUpdated,
    unmatchedCount: allUnmatched.length,
    hasMore: false,
  };
}
