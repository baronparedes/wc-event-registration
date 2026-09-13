import { motion } from 'framer-motion';

import type { HelloCarouselSlide } from '../constants';
import { AUTO_PLAY_INTERVAL_MS } from '../hooks/useCarousel';

interface CarouselFooterProps {
  isFullscreen: boolean;
  isPlaying: boolean;
  currentIndex: number;
  slides: readonly HelloCarouselSlide[];
  onGoToSlide: (index: number) => void;
  autoPlayIntervalMs?: number;
}

export function CarouselFooter({
  isFullscreen,
  isPlaying,
  currentIndex,
  slides,
  onGoToSlide,
  autoPlayIntervalMs = AUTO_PLAY_INTERVAL_MS,
}: CarouselFooterProps) {
  return (
    <>
      {/* Autoplay Progress Bar Indicator */}
      {isPlaying && (
        <div
          className={`flex-none mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/20 ${
            isFullscreen ? 'portrait:block landscape:hidden px-3' : ''
          }`}
        >
          <motion.div
            key={currentIndex}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: autoPlayIntervalMs / 1000, ease: 'linear' }}
            className="h-full bg-primary"
          />
        </div>
      )}

      {/* Image Icons as Indicators */}
      <footer
        className={`flex-none mt-4 border-t border-border/60 pt-3 ${
          isFullscreen ? 'portrait:block landscape:hidden px-3 pb-3 sm:px-5 sm:pb-4' : ''
        }`}
        style={
          isFullscreen
            ? {
                paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
                paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0px))',
                paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0px))',
              }
            : undefined
        }
      >
        <nav
          aria-label="Carousel image slide indicators"
          className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none sm:justify-center sm:gap-3"
        >
          {slides.map((slide, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={() => onGoToSlide(index)}
                aria-label={`Go to slide ${index + 1}: ${slide.title}`}
                aria-current={isActive ? 'true' : undefined}
                className={`group relative flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-primary ${
                  isActive
                    ? 'border-primary ring-2 ring-primary/40 scale-105 shadow-md'
                    : 'border-border/60 opacity-60 hover:opacity-100 hover:border-text/40'
                }`}
              >
                <img
                  src={slide.src}
                  alt={`Slide indicator ${index + 1}`}
                  className="h-12 w-12 sm:h-16 sm:w-16 md:h-18 md:w-18 object-cover"
                />
                <span
                  className={`absolute bottom-0.5 right-1 rounded-sm px-1 font-mono text-[9px] font-bold transition-colors ${
                    isActive ? 'bg-primary text-white' : 'bg-black/70 text-white'
                  }`}
                >
                  {index + 1}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Subtle Help / Guide for Controls */}
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-muted/80 select-none">
          <span>Swipe or drag left / right</span>
          <span aria-hidden="true" className="text-border">
            •
          </span>
          <span>
            Use keyboard arrows{' '}
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px] text-text">
              ←
            </kbd>{' '}
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px] text-text">
              →
            </kbd>
          </span>
          <span aria-hidden="true" className="text-border">
            •
          </span>
          <span>
            <kbd className="rounded border border-border bg-surface px-1 py-0.5 font-mono text-[10px] text-text">
              Space
            </kbd>{' '}
            to play / pause
          </span>
        </p>
      </footer>
    </>
  );
}
