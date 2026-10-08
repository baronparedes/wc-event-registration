import QRCode from 'qrcode';

import { formatDateTime, formatTimeOnly } from '@/lib/infrastructure';

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0]?.split(':')[1] || 'image/jpeg';
  const raw = window.atob(parts[1] || '');
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

export async function ensureResourcesReady(element: HTMLElement): Promise<void> {
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Ignore font readiness errors
    }
  }

  const images = Array.from(element.querySelectorAll('img'));
  await Promise.all(
    images.map((img) => {
      if (img.complete && img.naturalWidth > 0) return Promise.resolve();
      return new Promise<void>((resolve) => {
        let isResolved = false;
        const finish = () => {
          if (!isResolved) {
            isResolved = true;
            resolve();
          }
        };

        img.onload = finish;
        img.onerror = finish;

        if ('decode' in img && typeof img.decode === 'function') {
          img
            .decode()
            .then(finish)
            .catch(() => {});
        }

        setTimeout(finish, 150);
      });
    }),
  );

  await new Promise((resolve) => setTimeout(resolve, 100));
}

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
