import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

import { getManilaDateString, parseConfig } from '../config.js';
import { fetchNewAttendanceRecords } from '../db.js';
import { getStateFilePath, loadSyncState, saveSyncState } from '../state.js';

test('getManilaDateString produces valid YYYY-MM-DD date format', () => {
  const result = getManilaDateString(new Date('2026-10-18T00:00:00Z'));
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test('parseConfig parses CLI flags accurately', () => {
  const args = [
    '--db',
    '/tmp/test.db',
    '--endpoint',
    'https://example.com/sync',
    '--key',
    'test-key-123',
    '--date',
    '2026-10-18',
    '--interval',
    '5',
    '--batch-size',
    '250',
    '--once',
    '--dry-run',
  ];

  const config = parseConfig(args);
  assert.equal(config.dbPath, '/tmp/test.db');
  assert.equal(config.endpoint, 'https://example.com/sync');
  assert.equal(config.syncKey, 'test-key-123');
  assert.equal(config.targetDate, '2026-10-18');
  assert.equal(config.pollIntervalMs, 5000);
  assert.equal(config.batchSize, 250);
  assert.equal(config.once, true);
  assert.equal(config.watch, false);
  assert.equal(config.dryRun, true);
});

test('state management saves and restores checkpoints by date', () => {
  const tempDir = fs.mkdtempSync(path.join(process.cwd(), '.tmp-state-test-'));
  try {
    const initialState = loadSyncState('2026-10-18', tempDir);
    assert.equal(initialState.Comm_Attend, 0);
    assert.equal(initialState.Walkin_Attend, 0);
    assert.equal(initialState.OIC_Attend, 0);

    saveSyncState(
      {
        date: '2026-10-18',
        Comm_Attend: 100,
        Walkin_Attend: 20,
        OIC_Attend: 5,
      },
      tempDir,
    );

    const loadedState = loadSyncState('2026-10-18', tempDir);
    assert.equal(loadedState.Comm_Attend, 100);
    assert.equal(loadedState.Walkin_Attend, 20);
    assert.equal(loadedState.OIC_Attend, 5);

    // If date changes, state resets to 0
    const differentDateState = loadSyncState('2026-10-19', tempDir);
    assert.equal(differentDateState.Comm_Attend, 0);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('fetchNewAttendanceRecords reads matching date records and advances checkpoints', () => {
  const memDb = new DatabaseSync(':memory:');
  memDb.exec(`
    CREATE TABLE Comm_Attend (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT, Role TEXT, Date TEXT, Time TEXT, Time_Slot TEXT,
      Override INTEGER, Manual_Entry INTEGER, RFID TEXT, VolunteerID TEXT, "Table" TEXT
    );
    CREATE TABLE Walkin_Attend (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT, Role TEXT, Date TEXT, Time TEXT, Time_Slot TEXT,
      Override INTEGER, Manual_Entry INTEGER, RFID TEXT, VolunteerID TEXT, "Table" TEXT
    );
    CREATE TABLE OIC_Attend (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT, Role TEXT, Date TEXT, Time TEXT, Time_Slot TEXT,
      RFID TEXT, VolunteerID TEXT, "Table" TEXT
    );

    INSERT INTO Comm_Attend (Name, Role, Date, Time, Time_Slot, RFID, "Table")
    VALUES ('Member 1', 'Prayer Coach', '2026-10-18', '16:00:00', '3PM', 'RFID1', '20');

    INSERT INTO Walkin_Attend (Name, Role, Date, Time, Time_Slot, RFID, "Table")
    VALUES ('Walkin 1', 'Usher', '2026-10-18', '16:05:00', '3PM', 'RFID2', '667');

    INSERT INTO Comm_Attend (Name, Role, Date, Time, Time_Slot, RFID, "Table")
    VALUES ('Past Member', 'Prayer Coach', '2026-10-11', '16:00:00', '3PM', 'RFID3', '20');
  `);

  const { records, newCheckpoint } = fetchNewAttendanceRecords(memDb, '2026-10-18', {
    Comm_Attend: 0,
    Walkin_Attend: 0,
    OIC_Attend: 0,
  });

  // Only 2 records match 2026-10-18 (the 2026-10-11 row is ignored)
  assert.equal(records.length, 2);
  assert.equal(records[0].name, 'Member 1');
  assert.equal(records[0].is_walk_in, false);
  assert.equal(records[1].name, 'Walkin 1');
  assert.equal(records[1].is_walk_in, true);

  assert.equal(newCheckpoint.Comm_Attend, 1);
  assert.equal(newCheckpoint.Walkin_Attend, 1);

  // Subsequent call with newCheckpoint yields 0 new rows
  const secondPass = fetchNewAttendanceRecords(memDb, '2026-10-18', newCheckpoint);
  assert.equal(secondPass.records.length, 0);

  memDb.close();
});
