import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Creates a zero-locking local snapshot copy of the SQLite database.
 * This guarantees the legacy kiosk app has 100% uninterrupted,
 * exclusive access to the live database file without lock contention.
 */
export function createSnapshotDatabase(liveDbPath) {
  if (!fs.existsSync(liveDbPath)) {
    throw new Error(`SQLite database file not found at: ${liveDbPath}`);
  }

  const parsed = path.parse(path.resolve(liveDbPath));
  const snapshotPath = path.format({
    dir: parsed.dir || '.',
    name: `.${parsed.name}_sync_snapshot`,
    ext: parsed.ext || '.db',
  });

  // Fast OS file copy (1-3ms) - does not acquire SQLite database locks
  fs.copyFileSync(liveDbPath, snapshotPath);

  // Also copy WAL and SHM files if they happen to exist
  const walPath = `${liveDbPath}-wal`;
  const shmPath = `${liveDbPath}-shm`;
  if (fs.existsSync(walPath)) {
    try {
      fs.copyFileSync(walPath, `${snapshotPath}-wal`);
    } catch {
      // Ignore
    }
  }
  if (fs.existsSync(shmPath)) {
    try {
      fs.copyFileSync(shmPath, `${snapshotPath}-shm`);
    } catch {
      // Ignore
    }
  }

  const db = new DatabaseSync(snapshotPath, { open: true, readOnly: true });
  db.exec('PRAGMA busy_timeout = 3000;');

  return {
    db,
    snapshotPath,
    close: () => {
      try {
        db.close();
      } catch {
        // Ignore
      }
      try {
        if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
        if (fs.existsSync(`${snapshotPath}-wal`)) fs.unlinkSync(`${snapshotPath}-wal`);
        if (fs.existsSync(`${snapshotPath}-shm`)) fs.unlinkSync(`${snapshotPath}-shm`);
      } catch {
        // Silently ignore cleanup errors
      }
    },
  };
}

/**
 * Open SQLite database in read-only mode directly.
 */
export function openAttendanceDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite database file not found at: ${dbPath}`);
  }

  const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
  db.exec('PRAGMA busy_timeout = 3000;');
  return db;
}

/**
 * Fetch new records from Comm_Attend, Walkin_Attend, and OIC_Attend
 * for a specific date with ID greater than the checkpoint.
 */
export function fetchNewAttendanceRecords(db, targetDate, state) {
  const commLastId = state.Comm_Attend || 0;
  const walkinLastId = state.Walkin_Attend || 0;
  const oicLastId = state.OIC_Attend || 0;

  const commStmt = db.prepare(`
    SELECT
      id,
      Name as name,
      Role as role,
      Date as date,
      Time as time,
      Time_Slot as time_slot,
      Override as override,
      Manual_Entry as manual_entry,
      RFID as rfid,
      VolunteerID as volunteer_id,
      "Table" as table_number,
      0 as is_walk_in,
      'Comm_Attend' as source_table
    FROM Comm_Attend
    WHERE Date = ? AND id > ?
    ORDER BY id ASC
  `);

  const walkinStmt = db.prepare(`
    SELECT
      id,
      Name as name,
      Role as role,
      Date as date,
      Time as time,
      Time_Slot as time_slot,
      Override as override,
      Manual_Entry as manual_entry,
      RFID as rfid,
      VolunteerID as volunteer_id,
      "Table" as table_number,
      1 as is_walk_in,
      'Walkin_Attend' as source_table
    FROM Walkin_Attend
    WHERE Date = ? AND id > ?
    ORDER BY id ASC
  `);

  const oicStmt = db.prepare(`
    SELECT
      id,
      Name as name,
      Role as role,
      Date as date,
      Time as time,
      Time_Slot as time_slot,
      0 as override,
      0 as manual_entry,
      RFID as rfid,
      VolunteerID as volunteer_id,
      "Table" as table_number,
      0 as is_walk_in,
      'OIC_Attend' as source_table
    FROM OIC_Attend
    WHERE Date = ? AND id > ?
    ORDER BY id ASC
  `);

  const commRows = commStmt.all(targetDate, commLastId);
  const walkinRows = walkinStmt.all(targetDate, walkinLastId);
  const oicRows = oicStmt.all(targetDate, oicLastId);

  const records = [];

  let maxCommId = commLastId;
  let maxWalkinId = walkinLastId;
  let maxOicId = oicLastId;

  for (const r of commRows) {
    if (r.id > maxCommId) maxCommId = r.id;
    records.push(normalizeDbRow(r));
  }

  for (const r of walkinRows) {
    if (r.id > maxWalkinId) maxWalkinId = r.id;
    records.push(normalizeDbRow(r));
  }

  for (const r of oicRows) {
    if (r.id > maxOicId) maxOicId = r.id;
    records.push(normalizeDbRow(r));
  }

  return {
    records,
    newCheckpoint: {
      Comm_Attend: maxCommId,
      Walkin_Attend: maxWalkinId,
      OIC_Attend: maxOicId,
    },
  };
}

function normalizeDbRow(row) {
  return {
    source_id: row.id,
    source_table: row.source_table,
    name: (row.name || '').trim(),
    role: (row.role || '').trim(),
    date: row.date,
    time: (row.time || '').trim(),
    time_slot: (row.time_slot || '').trim(),
    rfid: (row.rfid || '').trim(),
    volunteer_id: (row.volunteer_id || '').trim(),
    table: (row.table_number || '').trim(),
    override: Number(row.override || 0),
    manual_entry: Number(row.manual_entry || 0),
    is_walk_in: Boolean(row.is_walk_in),
  };
}
