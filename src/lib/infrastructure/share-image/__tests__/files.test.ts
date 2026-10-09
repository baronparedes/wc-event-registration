import { describe, expect, it, vi } from 'vitest';

import { dataUrlToBlob, dataUrlToFile, downloadDataUrl } from '../files';

const JPEG_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

describe('files', () => {
  it('dataUrlToBlob converts a base64 data URL into a typed Blob', () => {
    const blob = dataUrlToBlob(JPEG_DATA_URL);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('dataUrlToFile wraps the blob in a named File', () => {
    const file = dataUrlToFile(JPEG_DATA_URL, 'card.jpg');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('card.jpg');
    expect(file.type).toBe('image/jpeg');
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
});
