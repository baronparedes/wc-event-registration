import { ImageCarousel } from './components/ImageCarousel';

export function HelloCarouselPage() {
  return (
    <div className="w-full bg-background min-h-[100dvh] flex flex-col justify-center">
      <main className="w-full flex-1 flex flex-col items-center justify-center py-4">
        <ImageCarousel />
      </main>
    </div>
  );
}
