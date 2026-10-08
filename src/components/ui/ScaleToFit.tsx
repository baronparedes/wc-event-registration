import { type ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const MAX_SCALE = 2;

export type ScaleToFitProps = {
  children: ReactNode;
  /** Layout width (px) the content is designed at on wide screens. */
  designWidth?: number;
  /** Layout width (px) the content is designed at on narrow (mobile) screens. */
  compactDesignWidth?: number;
  /** Viewport width (px) below which the compact design width is used. */
  compactBreakpoint?: number;
  className?: string;
};

/**
 * Scales its content uniformly so it always fits inside the viewport without scrolling.
 * Content is laid out at a fixed design width, measured, then scaled (up or down) to fit.
 */
export function ScaleToFit({
  children,
  designWidth = 1024,
  compactDesignWidth = 420,
  compactBreakpoint = 640,
  className,
}: ScaleToFitProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [layoutWidth, setLayoutWidth] = useState(designWidth);

  const recalculate = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const nextLayoutWidth = viewportWidth < compactBreakpoint ? compactDesignWidth : designWidth;
    setLayoutWidth(nextLayoutWidth);

    const contentWidth = content.offsetWidth || nextLayoutWidth;
    const contentHeight = content.offsetHeight;
    if (!contentHeight) return;

    const nextScale = Math.min(
      MAX_SCALE,
      viewportWidth / contentWidth,
      viewportHeight / contentHeight,
    );
    setScale(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
  }, [compactBreakpoint, compactDesignWidth, designWidth]);

  useLayoutEffect(() => {
    recalculate();
  }, [recalculate, children]);

  useEffect(() => {
    window.addEventListener('resize', recalculate);
    const content = contentRef.current;
    let observer: ResizeObserver | undefined;
    if (content && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => recalculate());
      observer.observe(content);
    }
    return () => {
      window.removeEventListener('resize', recalculate);
      observer?.disconnect();
    };
  }, [recalculate]);

  return (
    <div className={`relative h-[100dvh] w-full overflow-hidden ${className ?? ''}`}>
      <div
        ref={contentRef}
        data-testid="scale-to-fit-content"
        style={{
          width: layoutWidth,
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
