import QRCode from 'qrcode';

import { formatDateTime, formatTimeOnly } from '@/lib/infrastructure';

export function formatCountdownFilename(slug?: string | null): string {
  const sanitized = (slug || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${sanitized}-countdown.jpg`;
}

export async function generateQrCodeDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    margin: 1,
    width: 400,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
}

export function formatEventSchedule(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
): string {
  if (!startsAt) return 'Date TBA';

  const startDate = new Date(startsAt);
  if (Number.isNaN(startDate.getTime())) return 'Date TBA';

  if (!endsAt) {
    return formatDateTime(startsAt);
  }

  const endDate = new Date(endsAt);
  if (Number.isNaN(endDate.getTime())) {
    return formatDateTime(startsAt);
  }

  // Check if same calendar day
  const isSameDay =
    startDate.getFullYear() === endDate.getFullYear() &&
    startDate.getMonth() === endDate.getMonth() &&
    startDate.getDate() === endDate.getDate();

  if (isSameDay) {
    const formattedDate = startDate.toLocaleDateString(undefined, {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
    const startTime = formatTimeOnly(startsAt);
    const endTime = formatTimeOnly(endsAt);
    return `${formattedDate}, ${startTime} – ${endTime}`;
  }

  return `${formatDateTime(startsAt)} – ${formatDateTime(endsAt)}`;
}
