export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    text = '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

export function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildUtcTimestampForFilename(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

export function formatTimestampInTimeZone(
  timestamp: string,
  timeZone: string,
  suffix?: string,
): string {
  if (!timestamp) {
    return '';
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';

  const formatted = `${getPart('year')}-${getPart('month')}-${getPart('day')} ${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
  return suffix ? `${formatted} ${suffix}` : formatted;
}

export function formatHeaderFromSnakeCase(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
