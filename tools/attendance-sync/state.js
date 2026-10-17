import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE_NAME = '.attendance-sync-state.json';

export function getStateFilePath(baseDir = process.cwd()) {
  return path.resolve(baseDir, STATE_FILE_NAME);
}

export function loadSyncState(targetDate, baseDir = process.cwd()) {
  const filePath = getStateFilePath(baseDir);
  const defaultState = {
    date: targetDate,
    Comm_Attend: 0,
    Walkin_Attend: 0,
    OIC_Attend: 0,
    lastSyncTime: null,
  };

  if (!fs.existsSync(filePath)) {
    return defaultState;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);

    // If state belongs to another date, reset to 0 for target date
    if (parsed.date !== targetDate) {
      return defaultState;
    }

    return {
      date: targetDate,
      Comm_Attend: Number(parsed.Comm_Attend || 0),
      Walkin_Attend: Number(parsed.Walkin_Attend || 0),
      OIC_Attend: Number(parsed.OIC_Attend || 0),
      lastSyncTime: parsed.lastSyncTime || null,
    };
  } catch {
    return defaultState;
  }
}

export function saveSyncState(state, baseDir = process.cwd()) {
  const filePath = getStateFilePath(baseDir);
  const tempPath = `${filePath}.tmp`;

  const data = {
    date: state.date,
    Comm_Attend: state.Comm_Attend || 0,
    Walkin_Attend: state.Walkin_Attend || 0,
    OIC_Attend: state.OIC_Attend || 0,
    lastSyncTime: new Date().toISOString(),
  };

  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
  } catch (err) {
    console.error('[STATE] Failed to persist sync state file', err);
  }
}
