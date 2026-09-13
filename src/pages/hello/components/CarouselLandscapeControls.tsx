import { Home, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';

interface CarouselLandscapeControlsProps {
  isFullscreen: boolean;
  onGoHome: () => void;
  onExitFullscreen: () => void;
  safeAreaInsetLeft: string;
  safeAreaInsetRight: string;
}

export function CarouselLandscapeControls({
  isFullscreen,
  onGoHome,
  onExitFullscreen,
  safeAreaInsetLeft,
  safeAreaInsetRight,
}: CarouselLandscapeControlsProps) {
  if (!isFullscreen) return null;

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onGoHome}
        aria-label="Go to home page"
        className="absolute z-50 hidden landscape:flex !h-12 !w-12 !min-h-12 !min-w-12 !p-0 !rounded-2xl bg-black/50 text-white hover:bg-black/80 border border-white/20 backdrop-blur-md shadow-lg"
        style={{
          top: 'max(1rem, env(safe-area-inset-top, 0px))',
          left: safeAreaInsetLeft,
        }}
      >
        <Home className="h-6 w-6" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onExitFullscreen}
        aria-label="Exit fullscreen"
        className="absolute z-50 hidden landscape:flex !h-12 !w-12 !min-h-12 !min-w-12 !p-0 !rounded-2xl bg-black/50 text-white hover:bg-black/80 border border-white/20 backdrop-blur-md shadow-lg"
        style={{
          top: 'max(1rem, env(safe-area-inset-top, 0px))',
          right: safeAreaInsetRight,
        }}
      >
        <X className="h-6 w-6" />
      </Button>
    </>
  );
}
