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
