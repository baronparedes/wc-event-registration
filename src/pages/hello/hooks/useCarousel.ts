import { useCallback, useEffect, useState } from 'react';

export const AUTO_PLAY_INTERVAL_MS = 4500;

interface UseCarouselOptions {
  totalSlides: number;
  autoPlayDefault?: boolean;
  autoPlayIntervalMs?: number;
}

export function useCarousel({
  totalSlides,
  autoPlayDefault = false,
  autoPlayIntervalMs = AUTO_PLAY_INTERVAL_MS,
}: UseCarouselOptions) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState(autoPlayDefault);

  const paginate = useCallback(
    (newDirection: number) => {
      setDirection(newDirection);
      setCurrentIndex((prev) => {
        if (totalSlides === 0) return 0;
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
    }, autoPlayIntervalMs);

    return () => clearInterval(timer);
  }, [autoPlayIntervalMs, isPlaying, paginate, totalSlides]);

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
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [paginate]);

  return {
    currentIndex,
    direction,
    isPlaying,
    setIsPlaying,
    paginate,
    goToSlide,
  };
}
