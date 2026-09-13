import { ImageCarousel } from './components/ImageCarousel';

export function HelloCarouselPage() {
  return (
    <div className="w-full bg-background min-h-[100dvh] flex flex-col justify-center">
      <main className="w-full flex-1 flex flex-col items-center justify-center py-4 px-4 sm:px-6 md:px-8 [&:has([aria-roledescription=carousel][data-fullscreen=true])]:p-0">
        <ImageCarousel />
      </main>
    </div>
  );
}
