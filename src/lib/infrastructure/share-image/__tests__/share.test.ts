import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { canCopyImageToClipboard, copyPngToClipboard } from '../clipboard';
import { shareFiles } from '../share';

function setNavigator(props: Record<string, unknown>) {
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
  }
}

const makeFile = (name: string) => new File(['x'], name, { type: 'image/jpeg' });

describe('shareFiles', () => {
  beforeEach(() => {
    setNavigator({
      share: undefined,
      canShare: undefined,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      platform: 'MacIntel',
      maxTouchPoints: 0,
    });
  });

  it('returns unsupported when canShare is unavailable', async () => {
    await expect(shareFiles({ files: [makeFile('a.jpg')] })).resolves.toBe('unsupported');
  });

  it('shares all files with title and text', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share, canShare: vi.fn().mockReturnValue(true) });
    const files = [makeFile('a.jpg')];

    await expect(shareFiles({ files, title: 'T', text: 'X' })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith({ files, title: 'T', text: 'X' });
  });

  it('omits title and text when not provided', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    setNavigator({ share, canShare: vi.fn().mockReturnValue(true) });
    const files = [makeFile('a.jpg')];

    await shareFiles({ files });
    expect(share).toHaveBeenCalledWith({ files });
  });

  it('treats AbortError as handled so no fallback download is triggered', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
    setNavigator({ share, canShare: vi.fn().mockReturnValue(true) });

    await expect(shareFiles({ files: [makeFile('a.jpg')] })).resolves.toBe('shared');
  });

  it('returns unsupported on non-abort share errors for a single file', async () => {
    const share = vi.fn().mockRejectedValue(new Error('boom'));
    setNavigator({ share, canShare: vi.fn().mockReturnValue(true) });

    await expect(shareFiles({ files: [makeFile('a.jpg')] })).resolves.toBe('unsupported');
  });

  it('shares files one at a time on iOS when multi-file sharing is rejected', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn((data: ShareData) => (data.files?.length ?? 0) === 1);
    setNavigator({
      share,
      canShare,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      platform: 'iPhone',
    });

    const files = [makeFile('a.jpg'), makeFile('b.jpg')];
    await expect(shareFiles({ files })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledTimes(2);
  });

  it('returns unsupported when multi-file sharing is rejected on non-iOS', async () => {
    setNavigator({ share: vi.fn(), canShare: vi.fn().mockReturnValue(false) });

    await expect(shareFiles({ files: [makeFile('a.jpg'), makeFile('b.jpg')] })).resolves.toBe(
      'unsupported',
    );
  });
});

describe('clipboard', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('canCopyImageToClipboard is false without ClipboardItem', () => {
    setNavigator({ clipboard: { write: vi.fn() } });
    vi.stubGlobal('ClipboardItem', undefined);
    expect(canCopyImageToClipboard()).toBe(false);
  });

  it('canCopyImageToClipboard is true when write and ClipboardItem exist', () => {
    setNavigator({ clipboard: { write: vi.fn() } });
    vi.stubGlobal('ClipboardItem', class ClipboardItem {});
    expect(canCopyImageToClipboard()).toBe(true);
  });

  it('copyPngToClipboard writes a single image/png item', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    setNavigator({ clipboard: { write } });
    vi.stubGlobal(
      'ClipboardItem',
      class ClipboardItem {
        data: Record<string, Blob>;
        constructor(data: Record<string, Blob>) {
          this.data = data;
        }
      },
    );
    const blob = new Blob(['x'], { type: 'image/png' });

    await copyPngToClipboard(blob);

    expect(write).toHaveBeenCalledTimes(1);
    const [items] = write.mock.calls[0] as [Array<{ data: Record<string, Blob> }>];
    expect(items[0]?.data['image/png']).toBe(blob);
  });
});
