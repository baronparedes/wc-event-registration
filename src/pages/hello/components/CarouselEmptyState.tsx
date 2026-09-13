import { Home } from 'lucide-react';

import { Button } from '@/components/ui/Button';

interface CarouselEmptyStateProps {
  onGoHome: () => void;
}

export function CarouselEmptyState({ onGoHome }: CarouselEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-border bg-surface p-8 text-center text-muted">
      <p>No images available in this carousel.</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onGoHome}
        aria-label="Go to home page"
        className="rounded-xl border-border/80 bg-surface px-4 font-medium shadow-xs hover:border-primary/40 hover:text-primary"
      >
        <Home className="mr-2 h-4 w-4" />
        Go Home
      </Button>
    </div>
  );
}
