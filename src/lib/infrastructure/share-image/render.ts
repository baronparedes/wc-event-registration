import { toBlob, toJpeg } from 'html-to-image';

import { isSafariOrIOS } from './device';
import { ensureResourcesReady } from './resources';

export type RenderOptions = {
  /** Embed web fonts into the capture. Defaults to false (fallback fonts, avoids CORS/font-fetch failures). */
  embedFonts?: boolean;
};

const JPEG_QUALITY = 0.95;
const PIXEL_RATIO = 2;
const BACKGROUND_COLOR = '#ffffff';

function buildBaseOptions({ embedFonts = false }: RenderOptions) {
  return {
    backgroundColor: BACKGROUND_COLOR,
    pixelRatio: PIXEL_RATIO,
    cacheBust: false,
    ...(embedFonts ? {} : { skipFonts: true, fontEmbedCSS: '' }),
  };
}

export async function renderToJpegDataUrl(
  element: HTMLElement,
  options: RenderOptions = {},
): Promise<string> {
  await ensureResourcesReady(element);
  const baseOptions = buildBaseOptions(options);

  // Safari/iOS WebKit warm-up pass: SVG foreignObject requires a first pass to rasterize image bitmaps into cache
  if (isSafariOrIOS()) {
    try {
      await toJpeg(element, { ...baseOptions, quality: JPEG_QUALITY });
    } catch {
      // Ignore warm-up failure
    }
  }

  return toJpeg(element, { ...baseOptions, quality: JPEG_QUALITY });
}

export async function renderToPngBlob(
  element: HTMLElement,
  options: RenderOptions = {},
): Promise<Blob | null> {
  await ensureResourcesReady(element);
  const baseOptions = buildBaseOptions(options);

  // Safari/iOS WebKit warm-up pass
  if (isSafariOrIOS()) {
    try {
      await toBlob(element, baseOptions);
    } catch {
      // Ignore warm-up failure
    }
  }

  return toBlob(element, baseOptions);
}
