import { useCallback, useEffect, useRef, useState } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';

import { HELLO_CAROUSEL_SLIDES, type HelloCarouselSlide } from '../constants';

const AUTO_PLAY_INTERVAL_MS = 4500;
const SWIPE_THRESHOLD_PX = 50;

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 320 : -320,
    opacity: 0,
    scale: 0.94,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 320 : -320,
    opacity: 0,
    scale: 0.94,
  }),
};

interface ImageCarouselProps {
  slides?: readonly HelloCarouselSlide[];
  autoPlayDefault?: boolean;
}

export function ImageCarousel({
  slides = HELLO_CAROUSEL_SLIDES,
  autoPlayDefault = false,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(autoPlayDefault);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const totalSlides = slides.length;
  const currentSlide = slides[currentIndex];

  const paginate = useCallback(
    (newDirection: number) => {
      setDirection(newDirection);
      setCurrentIndex((prev) => {
        const next = prev + newDirection;
        if (next < 0) return totalSlides - 1;
        if (next >= totalSlides) return 0;
        return next;
      });
    },
    [totalSlides],
  );

  const goToSlide = useCallback(
    (targetIndex: number) => {
      if (targetIndex === currentIndex) return;
      setDirection(targetIndex > currentIndex ? 1 : -1);
      setCurrentIndex(targetIndex);
    },
    [currentIndex],
  );

  // Autoplay timer
  useEffect(() => {
    if (!isPlaying || totalSlides <= 1) return;

    const timer = setInterval(() => {
      paginate(1);
    }, AUTO_PLAY_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isPlaying, paginate, totalSlides]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        paginate(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        paginate(-1);
      } else if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, paginate]);

  // HTML Fullscreen sync
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function toggleFullscreen() {
    try {
      if (!isFullscreen) {
        if (containerRef.current?.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  }

  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
  ) {
    const { offset, velocity } = info;
    const swipePower = Math.abs(offset.x) * velocity.x;

    if (swipePower < -8000 || offset.x < -SWIPE_THRESHOLD_PX) {
      paginate(1);
    } else if (swipePower > 8000 || offset.x > SWIPE_THRESHOLD_PX) {
      paginate(-1);
    }
  }

  if (totalSlides === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted">
        No images available in this carousel.
      </div>
    );
  }

  return (
    <section
      ref={containerRef}
      aria-roledescription="carousel"
      aria-label="Hello Image Gallery Carousel"
      className={`relative mx-auto flex w-full flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen max-w-none rounded-none bg-slate-950 p-3 sm:p-6 text-white'
          : 'w-full max-w-6xl lg:max-w-7xl rounded-3xl border border-border/80 bg-surface/90 p-3 sm:p-5 sm:pb-6 shadow-xl backdrop-blur-md'
      }`}
    >
      {/* Top Header Controls */}
      <header className="mb-3 flex items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 font-mono text-xs font-semibold text-primary sm:text-sm">
            {String(currentIndex + 1).padStart(2, '0')} / {String(totalSlides).padStart(2, '0')}
          </span>
          <h2 className="line-clamp-1 font-heading text-sm font-medium text-text sm:text-base lg:text-lg">
            {currentSlide.title}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Autoplay Toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPlaying((prev) => !prev)}
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
            onClick={() => goToSlide(0)}
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
            onClick={toggleFullscreen}
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

      {/* Main Image Stage Container */}
      <div className="relative flex w-full flex-1 select-none items-center justify-center overflow-hidden rounded-2xl bg-neutral-950 shadow-inner">
        {/* Animated Swipe Stage */}
        <div className="relative flex h-[68vh] min-h-[460px] sm:h-[75vh] sm:min-h-[580px] md:h-[80vh] md:min-h-[680px] lg:h-[84vh] lg:min-h-[760px] xl:h-[86vh] xl:min-h-[820px] max-h-[960px] xl:max-h-[1100px] w-full items-center justify-center overflow-hidden touch-pan-y">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{
                x: { type: 'spring', stiffness: 280, damping: 28 },
                opacity: { duration: 0.2 },
                scale: { duration: 0.2 },
              }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={handleDragEnd}
              className="absolute inset-0 flex cursor-grab active:cursor-grabbing items-center justify-center p-1 sm:p-2 md:p-3"
            >
              <img
                src={currentSlide.src}
                alt={currentSlide.alt}
                draggable={false}
                className="pointer-events-none h-full w-full max-h-full max-w-full rounded-xl object-contain drop-shadow-2xl select-none"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Swipe Left/Right Floating Arrow Buttons */}
        <Button
          type="button"
          variant="ghost"
          onClick={() => paginate(-1)}
          aria-label="Previous slide"
          className="group absolute left-3 top-1/2 z-10 -translate-y-1/2 !h-12 !w-12 !min-h-12 !min-w-12 !p-0 rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/80 hover:text-white active:scale-95 sm:left-6 sm:!h-14 sm:!w-14 sm:!min-h-14 sm:!min-w-14"
        >
          <ChevronLeft className="h-7 w-7 shrink-0 transition-transform group-hover:-translate-x-0.5 sm:h-8 sm:w-8" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          onClick={() => paginate(1)}
          aria-label="Next slide"
          className="group absolute right-3 top-1/2 z-10 -translate-y-1/2 !h-12 !w-12 !min-h-12 !min-w-12 !p-0 rounded-full border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/80 hover:text-white active:scale-95 sm:right-6 sm:!h-14 sm:!w-14 sm:!min-h-14 sm:!min-w-14"
        >
          <ChevronRight className="h-7 w-7 shrink-0 transition-transform group-hover:translate-x-0.5 sm:h-8 sm:w-8" />
        </Button>
      </div>

      {/* Autoplay Progress Bar Indicator */}
      {isPlaying && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/20">
          <motion.div
            key={currentIndex}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: AUTO_PLAY_INTERVAL_MS / 1000, ease: 'linear' }}
            className="h-full bg-primary"
          />
        </div>
      )}

      {/* Image Icons as Indicators */}
      <footer className="mt-4 border-t border-border/60 pt-3">
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
                onClick={() => goToSlide(index)}
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
    </section>
  );
}
