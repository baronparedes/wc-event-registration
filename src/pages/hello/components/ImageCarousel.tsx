import { useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import { ROUTE_PATHS } from '@/config/constants';

import { HELLO_CAROUSEL_SLIDES, type HelloCarouselSlide } from '../constants';
import { useCarousel } from '../hooks/useCarousel';
import { useFullscreen } from '../hooks/useFullscreen';
import { CarouselEmptyState } from './CarouselEmptyState';
import { CarouselFooter } from './CarouselFooter';
import { CarouselHeader } from './CarouselHeader';
import { CarouselLandscapeControls } from './CarouselLandscapeControls';
import { CarouselSlideStage } from './CarouselSlideStage';

interface ImageCarouselProps {
  slides?: readonly HelloCarouselSlide[];
  autoPlayDefault?: boolean;
  onGoHome?: () => void;
}

export function ImageCarousel({
  slides = HELLO_CAROUSEL_SLIDES,
  autoPlayDefault = false,
  onGoHome,
}: ImageCarouselProps) {
  const navigate = useNavigate();
  const totalSlides = slides.length;

  const { currentIndex, direction, isPlaying, setIsPlaying, paginate, goToSlide } = useCarousel({
    totalSlides,
    autoPlayDefault,
  });

  const {
    containerRef,
    isFullscreen,
    toggleFullscreen,
    exitFullscreen,
    safeAreaInsetLeft,
    safeAreaInsetRight,
  } = useFullscreen();

  const handleGoHome = useCallback(() => {
    exitFullscreen().catch(() => {});
    if (onGoHome) {
      onGoHome();
    } else {
      navigate(ROUTE_PATHS.home);
    }
  }, [exitFullscreen, navigate, onGoHome]);

  if (totalSlides === 0) {
    return <CarouselEmptyState onGoHome={handleGoHome} />;
  }

  const currentSlide = slides[currentIndex];

  return (
    <section
      ref={containerRef}
      aria-roledescription="carousel"
      aria-label="Hello Image Gallery Carousel"
      data-fullscreen={isFullscreen}
      className={`mx-auto flex w-full flex-col overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? '!fixed inset-0 z-[9999] h-[100dvh] w-full max-w-none rounded-none bg-black p-0 text-white overscroll-none touch-none'
          : 'relative w-full max-w-6xl lg:max-w-7xl rounded-3xl border border-border/80 bg-surface/90 p-3 sm:p-5 sm:pb-6 shadow-xl backdrop-blur-md'
      }`}
    >
      {/* Top Header Controls */}
      <CarouselHeader
        isFullscreen={isFullscreen}
        currentIndex={currentIndex}
        totalSlides={totalSlides}
        currentTitle={currentSlide.title}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((prev) => !prev)}
        onRestart={() => goToSlide(0)}
        onToggleFullscreen={toggleFullscreen}
        onGoHome={handleGoHome}
      />

      {/* Main Image Stage Container */}
      <CarouselSlideStage
        isFullscreen={isFullscreen}
        currentSlide={currentSlide}
        currentIndex={currentIndex}
        direction={direction}
        onPaginate={paginate}
        safeAreaInsetLeft={safeAreaInsetLeft}
        safeAreaInsetRight={safeAreaInsetRight}
      />

      {/* Indicator Icons & Keyboard Guides */}
      <CarouselFooter
        isFullscreen={isFullscreen}
        isPlaying={isPlaying}
        currentIndex={currentIndex}
        slides={slides}
        onGoToSlide={goToSlide}
      />

      {/* Dedicated Floating Controls for Fullscreen Landscape */}
      <CarouselLandscapeControls
        isFullscreen={isFullscreen}
        onGoHome={handleGoHome}
        onExitFullscreen={toggleFullscreen}
        safeAreaInsetLeft={safeAreaInsetLeft}
        safeAreaInsetRight={safeAreaInsetRight}
      />
    </section>
  );
}
