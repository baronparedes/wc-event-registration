export const DEFAULT_SUNDAY_TIME_SLOTS = [
  '07:00',
  '07:30',
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
  '18:30',
  '19:00',
];

export function formatTime12Hour(time24: string): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ? parseInt(mStr, 10) : 0;
  if (isNaN(h)) return time24;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${period}`;
}

export function split24HourTime(time24: string): {
  timeStr: string;
  period: 'AM' | 'PM';
} {
  const [hStr, mStr] = (time24 || '09:00').split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ? parseInt(mStr, 10) : 0;
  if (isNaN(h)) {
    return { timeStr: '9:00', period: 'AM' };
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const timeStr = `${h12}:${isNaN(m) ? '00' : String(m).padStart(2, '0')}`;
  return { timeStr, period };
}

export function parse12HourTimeString(
  input: string,
  fallbackPeriod: 'AM' | 'PM' = 'AM',
): {
  timeStr: string;
  period: 'AM' | 'PM';
  time24: string;
} | null {
  const trimmed = input.trim().toUpperCase();
  if (!trimmed) return null;

  let period: 'AM' | 'PM' | null = null;
  let clean = trimmed;

  if (clean.includes('PM') || clean.endsWith('P')) {
    period = 'PM';
    clean = clean.replace(/PM|P/g, '').trim();
  } else if (clean.includes('AM') || clean.endsWith('A')) {
    period = 'AM';
    clean = clean.replace(/AM|A/g, '').trim();
  }

  clean = clean.replace(/\./g, ':').replace(/\s+/g, '');
  let hours: number;
  let minutes: number;

  if (clean.includes(':')) {
    const parts = clean.split(':');
    hours = parseInt(parts[0], 10);
    minutes = parts[1] ? parseInt(parts[1], 10) : 0;
  } else if (/^\d{3,4}$/.test(clean)) {
    hours = parseInt(clean.slice(0, clean.length - 2), 10);
    minutes = parseInt(clean.slice(-2), 10);
  } else if (/^\d{1,2}$/.test(clean)) {
    hours = parseInt(clean, 10);
    minutes = 0;
  } else {
    return null;
  }

  if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  // If hours is entered in 24h format (> 12)
  if (hours >= 13 && hours <= 23) {
    period = 'PM';
    hours = hours - 12;
  } else if (hours === 0) {
    period = 'AM';
    hours = 12;
  } else if (hours > 23 || hours < 0) {
    return null;
  }

  const finalPeriod = period ?? fallbackPeriod;

  let h24 = hours;
  if (finalPeriod === 'PM' && hours < 12) {
    h24 = hours + 12;
  } else if (finalPeriod === 'AM' && hours === 12) {
    h24 = 0;
  }

  const time24 = `${String(h24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const timeStr = `${hours}:${String(minutes).padStart(2, '0')}`;

  return { timeStr, period: finalPeriod, time24 };
}

export function parseDateTimeParts(value: string | undefined): {
  datePart: string;
  timePart: string;
} {
  if (!value || typeof value !== 'string') {
    return { datePart: '', timePart: '09:00' };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { datePart: '', timePart: '09:00' };
  }
  if (trimmed.includes('T')) {
    const [date, timeWithRest] = trimmed.split('T');
    const timeMatch = timeWithRest.match(/^(\d{2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : '09:00';
    return { datePart: date, timePart: time };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { datePart: trimmed, timePart: '09:00' };
  }
  return { datePart: '', timePart: '09:00' };
}

export function formatDisplayDateTime(dateStr: string, timeStr: string): string {
  if (!dateStr || dateStr.length < 10) return '';
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  const dateObj = new Date(y, m - 1, d);
  if (isNaN(dateObj.getTime())) return '';
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${formattedDate} · ${formatTime12Hour(timeStr)}`;
}
