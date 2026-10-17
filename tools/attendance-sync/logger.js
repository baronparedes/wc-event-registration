import fs from 'node:fs';
import path from 'node:path';

const isColorSupported = Boolean(process.stdout.isTTY) && process.env.NODE_DISABLE_COLORS !== '1';

const colors = {
  reset: isColorSupported ? '\x1b[0m' : '',
  gray: isColorSupported ? '\x1b[90m' : '',
  green: isColorSupported ? '\x1b[32m' : '',
  yellow: isColorSupported ? '\x1b[33m' : '',
  red: isColorSupported ? '\x1b[31m' : '',
  cyan: isColorSupported ? '\x1b[36m' : '',
  magenta: isColorSupported ? '\x1b[35m' : '',
  bold: isColorSupported ? '\x1b[1m' : '',
};

function timestamp() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

export const logger = {
  info(msg, ...args) {
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.cyan}[INFO]${colors.reset} ${msg}`,
      ...args,
    );
  },

  success(msg, ...args) {
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.green}[SUCCESS]${colors.reset} ${msg}`,
      ...args,
    );
  },

  sync(msg, ...args) {
    console.log(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.magenta}[SYNC]${colors.reset} ${msg}`,
      ...args,
    );
  },

  warn(msg, ...args) {
    console.warn(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.yellow}[WARN]${colors.reset} ${msg}`,
      ...args,
    );
  },

  error(msg, ...args) {
    console.error(
      `${colors.gray}[${timestamp()}]${colors.reset} ${colors.red}[ERROR]${colors.reset} ${msg}`,
      ...args,
    );
  },
};

/**
 * Append unmatched attendance records to logs/unmatched-<date>.jsonl
 */
export function logUnmatchedRecords(
  date,
  unmatchedRows,
  logsDir = path.resolve(process.cwd(), 'logs'),
) {
  if (!unmatchedRows || unmatchedRows.length === 0) return;

  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFilePath = path.resolve(logsDir, `unmatched-${date}.jsonl`);
    const entries = unmatchedRows.map((row) =>
      JSON.stringify({ logged_at: new Date().toISOString(), ...row }),
    );

    fs.appendFileSync(logFilePath, entries.join('\n') + '\n', 'utf-8');
    logger.warn(
      `Recorded ${unmatchedRows.length} unmatched member(s) to ${path.relative(process.cwd(), logFilePath)}`,
    );
  } catch (err) {
    logger.error('Failed to write unmatched records to log file', err);
  }
}
