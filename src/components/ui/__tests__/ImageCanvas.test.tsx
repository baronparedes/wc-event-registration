import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toBlob, toJpeg } from 'html-to-image';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ImageCanvas,
  ImageCanvasActions,
  useImageCanvas,
  useImageCanvasGroup,
} from '@/components/ui';

vi.mock('html-to-image', () => ({
  toJpeg: vi.fn(),
  toBlob: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/infrastructure/share-image/resources', () => ({
  ensureResourcesReady: vi.fn().mockResolvedValue(undefined),
}));

const JPEG_DATA_URL =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

function SingleHarness({ embedFonts }: { embedFonts?: boolean }) {
  const canvas = useImageCanvas({
    filename: 'card.jpg',
    shareTitle: 'Title',
    shareText: 'Text',
    embedFonts,
    messages: { downloadSuccess: 'Saved!' },
  });

  return (
    <>
      <ImageCanvas canvasRef={canvas.canvasRef}>
        <p>Card content</p>
      </ImageCanvas>
      <ImageCanvasActions controller={canvas} actions={['copy', 'download', 'share']} />
    </>
  );
}

function GroupHarness() {
  const group = useImageCanvasGroup<'a' | 'b'>({ getFilename: (key) => `${key}.jpg` });

  return (
    <>
      <ImageCanvas canvasRef={group.getRef('a')} hidden width={400}>
        <div data-key="a">A</div>
      </ImageCanvas>
      <ImageCanvas canvasRef={group.getRef('b')} hidden width={400}>
        <div data-key="b">B</div>
      </ImageCanvas>
      <button onClick={() => group.download(['a', 'b'])}>download all</button>
      <button onClick={() => group.share(['a', 'b'])}>share all</button>
      <button onClick={() => group.copy('b')}>copy b</button>
      <span data-testid="copied">{group.copiedKey ?? 'none'}</span>
    </>
  );
}

describe('ImageCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'clipboard', {
      value: { write: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
    vi.stubGlobal('ClipboardItem', class ClipboardItem {});
    vi.mocked(toJpeg).mockResolvedValue(JPEG_DATA_URL);
    vi.mocked(toBlob).mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
  });

  describe('rendering', () => {
    it('renders children in the visible surface', () => {
      render(<SingleHarness />);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('hidden mode renders off-screen, aria-hidden, at a fixed width', () => {
      render(<GroupHarness />);
      const hiddenWrapper = screen.getByText('A').closest('[aria-hidden="true"]') as HTMLElement;

      expect(hiddenWrapper).toBeInTheDocument();
      expect(hiddenWrapper.style.left).toBe('0px');
      expect(hiddenWrapper.style.zIndex).toBe('-9999');
      expect(hiddenWrapper.style.width).toBe('400px');
    });
  });

  describe('single canvas actions', () => {
    it('downloads a JPEG and shows the custom success message', async () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render(<SingleHarness />);

      fireEvent.click(screen.getByRole('button', { name: /Download Image/i }));

      await waitFor(() => {
        expect(toJpeg).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Saved!');
      });
      clickSpy.mockRestore();
    });

    it('passes embedFonts through to the renderer', async () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render(<SingleHarness embedFonts />);

      fireEvent.click(screen.getByRole('button', { name: /Download Image/i }));

      await waitFor(() => expect(toJpeg).toHaveBeenCalled());
      expect(vi.mocked(toJpeg).mock.calls[0]?.[1]).not.toHaveProperty('skipFonts');
      clickSpy.mockRestore();
    });

    it('copies a PNG to the clipboard and shows the copied label', async () => {
      render(<SingleHarness />);

      fireEvent.click(screen.getByRole('button', { name: /Copy Image/i }));

      await waitFor(() => {
        expect(toBlob).toHaveBeenCalled();
        expect(navigator.clipboard.write).toHaveBeenCalled();
        expect(toast.success).toHaveBeenCalledWith('Image copied to clipboard');
      });
      expect(await screen.findByRole('button', { name: /Image Copied/i })).toBeInTheDocument();
    });

    it('shows an error when the clipboard is unsupported', async () => {
      vi.stubGlobal('ClipboardItem', undefined);
      render(<SingleHarness />);

      fireEvent.click(screen.getByRole('button', { name: /Copy Image/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          'Clipboard image copy is not supported in this browser',
        );
      });
    });

    it('shows an error when the PNG blob cannot be generated', async () => {
      vi.mocked(toBlob).mockResolvedValueOnce(null);
      render(<SingleHarness />);

      fireEvent.click(screen.getByRole('button', { name: /Copy Image/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to generate image');
      });
    });

    it('shares with title and text via the native share sheet', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: share, configurable: true });
      Object.defineProperty(navigator, 'canShare', {
        value: vi.fn().mockReturnValue(true),
        configurable: true,
      });
      render(<SingleHarness />);

      fireEvent.click(screen.getByRole('button', { name: /^Share$/i }));

      await waitFor(() => {
        expect(share).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Title', text: 'Text' }),
        );
      });
      expect(toast.error).not.toHaveBeenCalled();
    });

    it('ignores AbortError from the share sheet', async () => {
      const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'));
      Object.defineProperty(navigator, 'share', { value: share, configurable: true });
      Object.defineProperty(navigator, 'canShare', {
        value: vi.fn().mockReturnValue(true),
        configurable: true,
      });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render(<SingleHarness />);

      fireEvent.click(screen.getByRole('button', { name: /^Share$/i }));

      await waitFor(() => expect(share).toHaveBeenCalled());
      expect(toast.error).not.toHaveBeenCalled();
      expect(clickSpy).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('falls back to downloading when native sharing is unavailable', async () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render(<SingleHarness />);

      fireEvent.click(screen.getByRole('button', { name: /^Share$/i }));

      await waitFor(() => {
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Image downloaded');
      });
      clickSpy.mockRestore();
    });

    it('shows an error toast when rendering fails', async () => {
      vi.mocked(toJpeg).mockRejectedValueOnce(new Error('render failed'));
      render(<SingleHarness />);

      fireEvent.click(screen.getByRole('button', { name: /Download Image/i }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to save image');
      });
    });
  });

  describe('group', () => {
    it('captures canvases sequentially, one at a time', async () => {
      const order: string[] = [];
      vi.mocked(toJpeg).mockImplementation(async (node) => {
        const key = node.querySelector('[data-key]')?.getAttribute('data-key');
        order.push(`start-${key}`);
        await new Promise((resolve) => setTimeout(resolve, 5));
        order.push(`end-${key}`);
        return JPEG_DATA_URL;
      });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      render(<GroupHarness />);

      fireEvent.click(screen.getByRole('button', { name: 'download all' }));

      await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(2));
      expect(order).toEqual(['start-a', 'end-a', 'start-b', 'end-b']);
      clickSpy.mockRestore();
    });

    it('shares all files in a single native share call', async () => {
      const share = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', { value: share, configurable: true });
      Object.defineProperty(navigator, 'canShare', {
        value: vi.fn().mockReturnValue(true),
        configurable: true,
      });
      render(<GroupHarness />);

      fireEvent.click(screen.getByRole('button', { name: 'share all' }));

      await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
      const payload = share.mock.calls[0]?.[0] as { files: File[] };
      expect(payload.files.map((file) => file.name)).toEqual(['a.jpg', 'b.jpg']);
    });

    it('tracks which canvas was copied', async () => {
      render(<GroupHarness />);

      fireEvent.click(screen.getByRole('button', { name: 'copy b' }));

      await waitFor(() => expect(screen.getByTestId('copied')).toHaveTextContent('b'));
    });
  });

  describe('compound components', () => {
    function CompoundHarness({ onCancel }: { onCancel?: () => void }) {
      return (
        <ImageCanvas.Provider
          filename="compound.jpg"
          shareTitle="Compound Title"
          shareText="Compound Text"
          messages={{ downloadSuccess: 'Compound saved!' }}
        >
          <ImageCanvas>
            <p>Compound Card Content</p>
          </ImageCanvas>
          <ImageCanvas.CancelButton onClick={onCancel} />
          <ImageCanvas.Actions actions={['copy', 'download', 'share']} />
        </ImageCanvas.Provider>
      );
    }

    it('renders and wires actions through context without explicit refs or controllers', async () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const onCancel = vi.fn();
      render(<CompoundHarness onCancel={onCancel} />);

      expect(screen.getByText('Compound Card Content')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onCancel).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: /Download Image/i }));

      await waitFor(() => {
        expect(toJpeg).toHaveBeenCalledTimes(1);
        expect(clickSpy).toHaveBeenCalledTimes(1);
        expect(toast.success).toHaveBeenCalledWith('Compound saved!');
      });

      clickSpy.mockRestore();
    });

    it('throws when ImageCanvas.Actions is used without a controller or provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        render(<ImageCanvas.Actions actions={['download']} />);
      }).toThrow(
        /ImageCanvasActions requires a controller prop or must be used within <ImageCanvas.Provider>/,
      );
      consoleSpy.mockRestore();
    });
  });
});
