import { toBlob, toJpeg } from 'html-to-image';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderToJpegDataUrl, renderToPngBlob } from '../render';

vi.mock('html-to-image', () => ({
  toJpeg: vi.fn(),
  toBlob: vi.fn(),
}));

vi.mock('../resources', () => ({
  ensureResourcesReady: vi.fn().mockResolvedValue(undefined),
}));

describe('render', () => {
  const element = document.createElement('div');

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(toJpeg).mockResolvedValue('data:image/jpeg;base64,AAAA');
    vi.mocked(toBlob).mockResolvedValue(new Blob(['x'], { type: 'image/png' }));
  });

  it('renders JPEG with shared defaults and skips fonts by default', async () => {
    await expect(renderToJpegDataUrl(element)).resolves.toBe('data:image/jpeg;base64,AAAA');

    expect(toJpeg).toHaveBeenCalledWith(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: false,
      skipFonts: true,
      fontEmbedCSS: '',
    });
  });

  it('renders PNG blob with shared defaults', async () => {
    await renderToPngBlob(element);

    expect(toBlob).toHaveBeenCalledWith(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: false,
      skipFonts: true,
      fontEmbedCSS: '',
    });
  });

  it('performs warm-up pass on Safari / iOS devices', async () => {
    vi.stubGlobal('navigator', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
      maxTouchPoints: 5,
    });

    await renderToJpegDataUrl(element);

    // Called twice: once for warm-up, once for the final render
    expect(toJpeg).toHaveBeenCalledTimes(2);

    vi.unstubAllGlobals();
  });

  it('embeds fonts when embedFonts is true', async () => {
    await renderToJpegDataUrl(element, { embedFonts: true });

    const options = vi.mocked(toJpeg).mock.calls[0]?.[1];
    expect(options).not.toHaveProperty('skipFonts');
    expect(options).not.toHaveProperty('fontEmbedCSS');
  });
});
