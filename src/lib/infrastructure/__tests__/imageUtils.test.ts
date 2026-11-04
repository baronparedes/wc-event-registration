import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fileToJpegDataUrl } from '../imageUtils';

describe('fileToJpegDataUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal(
      'URL',
      Object.assign(URL, {
        createObjectURL: vi.fn(() => 'blob:test-photo'),
        revokeObjectURL: vi.fn(),
      }),
    );

    vi.stubGlobal(
      'Image',
      class {
        width = 1600;
        height = 800;
        src = '';
        decode = vi.fn().mockResolvedValue(undefined);
      },
    );

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);

    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/jpeg;base64,mock-jpeg-data',
    );
  });

  it('rejects files with non-image mime types', async () => {
    const file = new File(['text'], 'document.pdf', { type: 'application/pdf' });
    await expect(fileToJpegDataUrl(file)).rejects.toThrow('Choose an image file.');
  });

  it('converts and scales an image file to a JPEG data URL', async () => {
    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    const result = await fileToJpegDataUrl(file);

    expect(result).toBe('data:image/jpeg;base64,mock-jpeg-data');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-photo');
  });
});
