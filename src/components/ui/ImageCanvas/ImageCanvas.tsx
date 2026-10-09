import type { ReactNode, Ref } from 'react';

import { ImageCanvasActions } from './ImageCanvasActions';
import { ImageCanvasCancelButton } from './ImageCanvasCancelButton';
import { ImageCanvasProvider } from './ImageCanvasProvider';
import { useImageCanvasContext, useOptionalImageCanvasContext } from './context';

export type ImageCanvasProps = {
  /**
   * Ref attached to the captured element.
   * Optional when used inside an `<ImageCanvas.Provider>`.
   */
  canvasRef?: Ref<HTMLDivElement>;
  children: ReactNode;
  /**
   * Render off-screen at a fixed `width` so exports have a consistent size
   * regardless of viewport. Use alongside a separate visible preview.
   */
  hidden?: boolean;
  /** Fixed pixel width. Required for `hidden`; optional otherwise. */
  width?: number;
  className?: string;
};

/**
 * The capture surface. The element that carries `canvasRef` is exactly what gets rendered
 * to an image, so designs are plain children with no export plumbing.
 */
export function ImageCanvas({
  canvasRef: propCanvasRef,
  children,
  hidden = false,
  width,
  className,
}: ImageCanvasProps) {
  const context = useOptionalImageCanvasContext();
  const effectiveRef = propCanvasRef ?? context?.canvasRef;

  if (!hidden) {
    return (
      <div ref={effectiveRef} className={className} style={width ? { width } : undefined}>
        {children}
      </div>
    );
  }

  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        width,
        pointerEvents: 'none',
        zIndex: -9999,
        opacity: 0.001,
      }}
      aria-hidden="true"
    >
      <div
        ref={effectiveRef}
        className={className ? `bg-white ${className}` : 'bg-white'}
        style={{ width }}
      >
        {children}
      </div>
    </div>
  );
}

ImageCanvas.Provider = ImageCanvasProvider;
ImageCanvas.Actions = ImageCanvasActions;
ImageCanvas.CancelButton = ImageCanvasCancelButton;
ImageCanvas.useCanvas = useImageCanvasContext;
