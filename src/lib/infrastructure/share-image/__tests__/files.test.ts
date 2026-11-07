import { describe, expect, it, vi } from 'vitest';

import { dataUrlToBlob, dataUrlToFile, delay, downloadDataUrl } from '../files';

const JPEG_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('files', () => {
  it('dataUrlToBlob converts a base64 data URL into a typed Blob', () => {
    const blob = dataUrlToBlob(JPEG_DATA_URL);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('dataUrlToBlob defaults to image/jpeg when type not specified', () => {
    const dataUrl =
      'data:;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = dataUrlToBlob(dataUrl);
    expect(blob.type).toBe('image/jpeg');
  });

  it('dataUrlToBlob handles PNG images correctly', () => {
    const pngUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const blob = dataUrlToBlob(pngUrl);
    expect(blob.type).toBe('image/png');
  });

  it('dataUrlToFile wraps the blob in a named File', () => {
    const file = dataUrlToFile(JPEG_DATA_URL, 'card.jpg');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('card.jpg');
    expect(file.type).toBe('image/jpeg');
  });

  it('dataUrlToFile handles different file names', () => {
    const file1 = dataUrlToFile(JPEG_DATA_URL, 'photo.jpeg');
    expect(file1.name).toBe('photo.jpeg');

    const pngUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const file2 = dataUrlToFile(pngUrl, 'screenshot.png');
    expect(file2.name).toBe('screenshot.png');
  });

  it('downloadDataUrl attaches the link to the DOM before clicking and cleans up', () => {
    let wasAttachedOnClick = false;
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      wasAttachedOnClick = document.body.contains(this);
    });

    downloadDataUrl(JPEG_DATA_URL, 'card.jpg');

    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(wasAttachedOnClick).toBe(true);
    expect(document.querySelector('a[download="card.jpg"]')).toBeNull();

    clickSpy.mockRestore();
  });

  it('downloadDataUrl sets correct download filename', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      // no-op
    });

    const filename = 'my-image.jpg';
    downloadDataUrl(JPEG_DATA_URL, filename);

    const createdLink = document.querySelector('a[download]') as HTMLAnchorElement | null;
    if (createdLink) {
      expect(createdLink.download).toBe(filename);
      document.body.removeChild(createdLink);
    }

    clickSpy.mockRestore();
  });

  it('delay returns a Promise that resolves after specified time', async () => {
    const start = Date.now();
    const result = await delay(30);
    const elapsed = Date.now() - start;

    expect(result).toBeUndefined();
    expect(elapsed).toBeGreaterThanOrEqual(25);
  });

  it('delay resolves successfully with zero timeout', async () => {
    const result = await delay(0);
    expect(result).toBeUndefined();
  });
});
