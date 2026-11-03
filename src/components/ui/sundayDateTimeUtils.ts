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
