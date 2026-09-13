import { Home, Maximize2, Minimize2, Pause, Play, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/Button';

interface CarouselHeaderProps {
  isFullscreen: boolean;
  currentIndex: number;
  totalSlides: number;
  currentTitle: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRestart: () => void;
  onToggleFullscreen: () => void;
  onGoHome: () => void;
}

export function CarouselHeader({
  isFullscreen,
  currentIndex,
  totalSlides,
  currentTitle,
  isPlaying,
  onTogglePlay,
  onRestart,
  onToggleFullscreen,
  onGoHome,
}: CarouselHeaderProps) {
  return (
    <header
      className={`flex-none mb-3 flex items-center justify-between gap-3 border-b border-border/60 pb-3 ${
        isFullscreen ? 'portrait:flex landscape:hidden px-3 pt-3 sm:px-5 sm:pt-4' : ''
      }`}
      style={
        isFullscreen
          ? {
              paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
              paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
              paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
            }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {/* Back to Home Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGoHome}
          aria-label="Go to home page"
          className="!h-10 rounded-xl border-border/80 bg-surface px-3 font-medium shadow-xs hover:border-primary/40 hover:text-primary shrink-0"
        >
          <Home className="h-4 w-4 shrink-0 sm:mr-1.5" />
          <span className="hidden sm:inline">Home</span>
        </Button>

        <span className="inline-flex shrink-0 items-center rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary sm:text-sm">
          {String(currentIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
        </span>
        <h2 className="line-clamp-1 font-heading text-sm font-medium text-text sm:text-base lg:text-lg">
          {currentTitle}
        </h2>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Autoplay Toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onTogglePlay}
          aria-label={isPlaying ? 'Pause autoplay' : 'Start autoplay'}
          className="!h-10 rounded-xl border-border/80 bg-surface px-3 font-medium shadow-xs"
        >
          {isPlaying ? (
            <>
              <Pause className="h-4 w-4 shrink-0 text-primary" />
              <span className="hidden sm:inline">Pause</span>
            </>
          ) : (
            <>
              <Play className="h-4 w-4 shrink-0 text-text" />
              <span className="hidden sm:inline">Play</span>
            </>
          )}
        </Button>

        {/* Reset to first slide */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRestart}
          aria-label="Restart slideshow"
          disabled={currentIndex === 0}
          className="!h-10 !w-10 !min-h-10 !min-w-10 !p-0 rounded-xl border-border/80 bg-surface shadow-xs"
        >
          <RotateCcw className="h-4.5 w-4.5 shrink-0 sm:h-5 sm:w-5" />
        </Button>

        {/* Fullscreen Toggle */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleFullscreen}
          aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          className="!h-10 !w-10 !min-h-10 !min-w-10 !p-0 rounded-xl border-border/80 bg-surface shadow-xs"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4.5 w-4.5 shrink-0 sm:h-5 sm:w-5" />
          ) : (
            <Maximize2 className="h-4.5 w-4.5 shrink-0 sm:h-5 sm:w-5" />
          )}
        </Button>
      </div>
    </header>
  );
}
