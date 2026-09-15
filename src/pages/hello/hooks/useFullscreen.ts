import { useCallback, useEffect, useRef, useState } from 'react';

export const SAFE_AREA_INSET_LEFT =
  'max(1.25rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))';
export const SAFE_AREA_INSET_RIGHT =
  'max(1.25rem, env(safe-area-inset-left, 0px), env(safe-area-inset-right, 0px))';

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen lock and iOS Safari theme-color & background handling
  useEffect(() => {
    if (!isFullscreen) return;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyBg = document.body.style.backgroundColor;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.backgroundColor = '#000000';

    const themeColorMeta = document.querySelector(
      'meta[name="theme-color"]',
    ) as HTMLMetaElement | null;
    const originalThemeColor = themeColorMeta?.content;
    if (themeColorMeta) {
      themeColorMeta.content = '#000000';
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.backgroundColor = originalBodyBg;
      if (themeColorMeta && originalThemeColor) {
        themeColorMeta.content = originalThemeColor;
      }
    };
  }, [isFullscreen]);

  // HTML Fullscreen sync with standard and WebKit prefix support
  useEffect(() => {
    function handleFullscreenChange() {
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
      };
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Escape key exit
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const exitFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    try {
      if (doc.fullscreenElement) {
        await doc.exitFullscreen();
      } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      }
    } catch {
      // Ignore errors when exiting fullscreen
    }
    setIsFullscreen(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      const el = containerRef.current as
        | (HTMLDivElement & {
            webkitRequestFullscreen?: () => Promise<void>;
          })
        | null;
      const doc = document as Document & {
        webkitFullscreenElement?: Element | null;
        webkitExitFullscreen?: () => Promise<void>;
      };

      if (!isFullscreen) {
        if (el?.requestFullscreen) {
          await el.requestFullscreen();
        } else if (el?.webkitRequestFullscreen) {
          await el.webkitRequestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (doc.fullscreenElement) {
          await doc.exitFullscreen();
        } else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  }, [isFullscreen]);

  return {
    containerRef,
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
    exitFullscreen,
    safeAreaInsetLeft: SAFE_AREA_INSET_LEFT,
    safeAreaInsetRight: SAFE_AREA_INSET_RIGHT,
  };
}
