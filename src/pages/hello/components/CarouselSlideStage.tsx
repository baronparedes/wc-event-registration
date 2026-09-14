import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/Button';

import type { HelloCarouselSlide } from '../constants';

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

interface CarouselSlideStageProps {
  isFullscreen: boolean;
  currentSlide: HelloCarouselSlide;
  currentIndex: number;
  direction: number;
  onPaginate: (direction: number) => void;
  safeAreaInsetLeft: string;
  safeAreaInsetRight: string;
}

export function CarouselSlideStage({
  isFullscreen,
  currentSlide,
  currentIndex,
  direction,
  onPaginate,
  safeAreaInsetLeft,
  safeAreaInsetRight,
}: CarouselSlideStageProps) {
  function handleDragEnd(
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number; y: number }; velocity: { x: number; y: number } },
  ) {
    const { offset, velocity } = info;
    const swipePower = Math.abs(offset.x) * velocity.x;

    if (swipePower < -8000 || offset.x < -SWIPE_THRESHOLD_PX) {
      onPaginate(1);
    } else if (swipePower > 8000 || offset.x > SWIPE_THRESHOLD_PX) {
      onPaginate(-1);
    }
  }

  return (
    <div
      className={`relative flex w-full flex-1 min-h-0 select-none items-stretch justify-center overflow-hidden bg-black shadow-inner ${
        isFullscreen ? 'rounded-none h-full' : 'rounded-2xl'
      }`}
    >
      {/* Animated Swipe Stage */}
      <div
        className={`relative flex w-full h-full min-h-0 items-stretch justify-center overflow-hidden touch-pan-y ${
          isFullscreen
            ? 'h-full flex-1'
            : 'h-[68vh] min-h-[460px] sm:h-[75vh] sm:min-h-[580px] md:h-[80vh] md:min-h-[680px] lg:h-[84vh] lg:min-h-[760px] xl:h-[86vh] xl:min-h-[820px] max-h-[960px] xl:max-h-[1100px]'
        }`}
      >
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
            className={`absolute inset-0 flex cursor-grab active:cursor-grabbing items-center justify-center ${
              isFullscreen ? 'p-0' : 'p-1 sm:p-2 md:p-3'
            }`}
          >
            <img
              src={currentSlide.src}
              alt={currentSlide.alt}
              draggable={false}
              className="pointer-events-none h-full w-full max-h-full max-w-full object-contain drop-shadow-2xl select-none rounded-none"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Swipe Left/Right Floating Arrow Buttons */}
      <Button
        type="button"
        variant="ghost"
        onClick={() => onPaginate(-1)}
        aria-label="Previous slide"
        className={`group absolute top-1/2 z-50 -translate-y-1/2 !h-12 !w-12 !min-h-12 !min-w-12 !p-0 !rounded-2xl border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/80 hover:text-white active:scale-95 ${
          isFullscreen ? '' : 'left-3 sm:left-6'
        }`}
        style={{
          left: isFullscreen ? safeAreaInsetLeft : undefined,
        }}
      >
        <ChevronLeft className="h-6 w-6 shrink-0 transition-transform group-hover:-translate-x-0.5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        onClick={() => onPaginate(1)}
        aria-label="Next slide"
        className={`group absolute top-1/2 z-50 -translate-y-1/2 !h-12 !w-12 !min-h-12 !min-w-12 !p-0 !rounded-2xl border border-white/20 bg-black/50 text-white backdrop-blur-md transition-all hover:scale-110 hover:bg-black/80 hover:text-white active:scale-95 ${
          isFullscreen ? '' : 'right-3 sm:right-6'
        }`}
        style={{
          right: isFullscreen ? safeAreaInsetRight : undefined,
        }}
      >
        <ChevronRight className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-0.5" />
      </Button>
    </div>
  );
}
