import type { ImageCanvasMessages } from './useImageCanvasGroup';
import { useImageCanvasGroup } from './useImageCanvasGroup';

const CANVAS_KEY = 'canvas';

export type UseImageCanvasOptions = {
  filename: string;
  shareTitle?: string;
  shareText?: string;
  embedFonts?: boolean;
  messages?: Partial<ImageCanvasMessages<typeof CANVAS_KEY>>;
};

/** Single-canvas convenience wrapper around `useImageCanvasGroup`. */
export function useImageCanvas({ filename, ...rest }: UseImageCanvasOptions) {
  const group = useImageCanvasGroup<typeof CANVAS_KEY>({
    ...rest,
    getFilename: () => filename,
  });

  return {
    canvasRef: group.getRef(CANVAS_KEY),
    isGenerating: group.isGenerating,
    copied: group.copiedKey === CANVAS_KEY,
    download: () => group.download([CANVAS_KEY]),
    copy: () => group.copy(CANVAS_KEY),
    share: () => group.share([CANVAS_KEY]),
  };
}
