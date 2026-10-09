import { type Ref, createContext, useContext } from 'react';

import type { ImageCanvasController } from './ImageCanvasActions';

export type ImageCanvasContextValue = {
  canvasRef: Ref<HTMLDivElement>;
  controller: ImageCanvasController;
  isGenerating: boolean;
};

export const ImageCanvasContext = createContext<ImageCanvasContextValue | null>(null);

export function useImageCanvasContext(): ImageCanvasContextValue {
  const context = useContext(ImageCanvasContext);
  if (!context) {
    throw new Error(
      'ImageCanvas compound components must be rendered inside an <ImageCanvas.Provider>.',
    );
  }
  return context;
}

export function useOptionalImageCanvasContext(): ImageCanvasContextValue | null {
  return useContext(ImageCanvasContext);
}
