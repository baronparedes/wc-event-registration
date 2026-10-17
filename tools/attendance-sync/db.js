import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

/**
 * Open SQLite database in read-only mode to prevent locking conflicts.
 */
export function openAttendanceDatabase(dbPath) {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite database file not found at: ${dbPath}`);
  }

  const db = new DatabaseSync(dbPath, { open: true, readOnly: true });
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
