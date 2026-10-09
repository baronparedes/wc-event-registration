import type { ReactNode } from 'react';

import { ImageCanvasContext, type ImageCanvasContextValue } from './context';
import { type UseImageCanvasOptions, useImageCanvas } from './useImageCanvas';

export type ImageCanvasProviderProps = UseImageCanvasOptions & {
  children: ReactNode;
};

/** Provides ImageCanvas state, actions controller, and canvas ref to child compound components. */
export function ImageCanvasProvider({ children, ...options }: ImageCanvasProviderProps) {
  const canvas = useImageCanvas(options);
  const value: ImageCanvasContextValue = {
    canvasRef: canvas.canvasRef,
    controller: canvas,
    isGenerating: canvas.isGenerating,
  };

  return <ImageCanvasContext.Provider value={value}>{children}</ImageCanvasContext.Provider>;
}
