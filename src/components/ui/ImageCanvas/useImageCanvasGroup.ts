import { useEffect, useRef, useState } from 'react';

import { toast } from 'sonner';

import {
  canCopyImageToClipboard,
  copyPngToClipboard,
  dataUrlToFile,
  delay,
  downloadDataUrl,
  renderToJpegDataUrl,
  renderToPngBlob,
  shareFiles,
} from '@/lib/infrastructure';

const COPIED_INDICATOR_MS = 2500;
const SEQUENTIAL_DOWNLOAD_DELAY_MS = 100;

type MessageValue<K extends string> = string | ((key: K) => string);

/**
 * User-facing toast messages. Each can be a string or a function of the canvas key.
 * For batch operations (download/share of several canvases) functions receive the first key.
 */
export type ImageCanvasMessages<K extends string = string> = {
  downloadSuccess: MessageValue<K>;
  downloadError: MessageValue<K>;
  copySuccess: MessageValue<K>;
  copyError: MessageValue<K>;
  copyGenerateError: MessageValue<K>;
  copyUnsupported: MessageValue<K>;
  shareFallbackSuccess: MessageValue<K>;
  shareError: MessageValue<K>;
};

const DEFAULT_MESSAGES: ImageCanvasMessages = {
  downloadSuccess: 'Image downloaded',
  downloadError: 'Failed to save image',
  copySuccess: 'Image copied to clipboard',
  copyError: 'Failed to copy image to clipboard',
  copyGenerateError: 'Failed to generate image',
  copyUnsupported: 'Clipboard image copy is not supported in this browser',
  shareFallbackSuccess: 'Image downloaded',
  shareError: 'Failed to generate shareable image',
};

export type UseImageCanvasGroupOptions<K extends string> = {
  getFilename: (key: K) => string;
  shareTitle?: string;
  shareText?: string;
  embedFonts?: boolean;
  messages?: Partial<ImageCanvasMessages<K>>;
};

type Capture = { dataUrl: string; filename: string; file: File };

/**
 * Core tooling for one or more `ImageCanvas` surfaces. Captures are always sequential to
 * keep peak memory low on mobile devices.
 */
export function useImageCanvasGroup<K extends string>(options: UseImageCanvasGroupOptions<K>) {
  const { getFilename, shareTitle, shareText, embedFonts, messages } = options;

  const elements = useRef(new Map<K, HTMLElement>());
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<K | null>(null);

  useEffect(() => {
    if (copiedKey === null) return;
    const timeoutId = setTimeout(() => setCopiedKey(null), COPIED_INDICATOR_MS);
    return () => clearTimeout(timeoutId);
  }, [copiedKey]);

  const getRef = (key: K) => (element: HTMLElement | null) => {
    if (element) {
      elements.current.set(key, element);
    } else {
      elements.current.delete(key);
    }
  };

  const resolveMessage = (name: keyof ImageCanvasMessages<K>, key: K): string => {
    const value = messages?.[name] ?? DEFAULT_MESSAGES[name];
    return typeof value === 'function' ? value(key) : value;
  };

  const capture = async (key: K): Promise<Capture | null> => {
    const element = elements.current.get(key);
    if (!element) return null;

    const dataUrl = await renderToJpegDataUrl(element, { embedFonts });
    const filename = getFilename(key);
    return { dataUrl, filename, file: dataUrlToFile(dataUrl, filename) };
  };

  const captureSequentially = async (keys: K[]): Promise<Capture[]> => {
    const captures: Capture[] = [];
    for (const key of keys) {
      const result = await capture(key);
      if (result) captures.push(result);
    }
    return captures;
  };

  const downloadCaptures = async (captures: Capture[]) => {
    for (const [index, { dataUrl, filename }] of captures.entries()) {
      downloadDataUrl(dataUrl, filename);
      if (index < captures.length - 1) {
        await delay(SEQUENTIAL_DOWNLOAD_DELAY_MS);
      }
    }
  };

  const run = async (
    errorMessage: keyof ImageCanvasMessages<K>,
    errorKey: K,
    operation: () => Promise<void>,
  ) => {
    try {
      setIsGenerating(true);
      await operation();
    } catch (error) {
      console.error('Image canvas operation failed:', error);
      toast.error(resolveMessage(errorMessage, errorKey));
    } finally {
      setIsGenerating(false);
    }
  };

  const download = async (keys: K[]) => {
    const [firstKey] = keys;
    if (firstKey === undefined) return;

    await run('downloadError', firstKey, async () => {
      const captures = await captureSequentially(keys);
      if (captures.length === 0) return;

      await downloadCaptures(captures);
      toast.success(resolveMessage('downloadSuccess', firstKey));
    });
  };

  const copy = async (key: K) => {
    if (!canCopyImageToClipboard()) {
      toast.error(resolveMessage('copyUnsupported', key));
      return;
    }

    const element = elements.current.get(key);
    if (!element) return;

    // Critical for iOS Safari:
    // Initiating navigator.clipboard.write must happen within the user gesture tick.
    // Awaiting image rendering beforehand causes WebKit to expire user activation and throw
    // NotAllowedError. By passing the promise directly to ClipboardItem, the browser links
    // the write action to the user gesture immediately while rendering resolves asynchronously.
    const blobPromise = renderToPngBlob(element, { embedFonts }).then((blob) => {
      if (!blob) {
        throw new Error('GENERATE_FAILED');
      }
      return blob;
    });

    await run('copyError', key, async () => {
      try {
        await copyPngToClipboard(blobPromise);
        setCopiedKey(key);
        toast.success(resolveMessage('copySuccess', key));
      } catch (err) {
        if (err instanceof Error && err.message === 'GENERATE_FAILED') {
          toast.error(resolveMessage('copyGenerateError', key));
          return;
        }
        throw err;
      }
    });
  };

  const share = async (keys: K[]) => {
    const [firstKey] = keys;
    if (firstKey === undefined) return;

    await run('shareError', firstKey, async () => {
      const captures = await captureSequentially(keys);
      if (captures.length === 0) return;

      const result = await shareFiles({
        files: captures.map((item) => item.file),
        title: shareTitle,
        text: shareText,
      });
      if (result === 'shared') return;

      // Native sharing unavailable on this device: fall back to downloading
      await downloadCaptures(captures);
      toast.success(resolveMessage('shareFallbackSuccess', firstKey));
    });
  };

  return { getRef, isGenerating, copiedKey, download, copy, share };
}
