import { ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import helloCoverImage from '@/assets/hello/ccf-hello-1.png';
import { Button } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';

export function WelcomeHelloBanner() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(ROUTE_PATHS.hello)}
      role="region"
      aria-label="Welcome to CCF Hello Brochure Banner"
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-surface to-surface p-5 transition-all duration-300 hover:border-primary/50 hover:shadow-lg sm:p-6 lg:p-7"
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-56 w-56 rounded-full bg-primary/10 blur-3xl transition-opacity duration-500 group-hover:bg-primary/15"
        aria-hidden="true"
      />

      <div className="relative flex flex-col-reverse items-start justify-between gap-6 sm:flex-row sm:items-center">
        {/* Left text & action */}
        <div className="max-w-xl space-y-3">
          <h2 className="font-heading text-xl font-bold tracking-tight text-text sm:text-2xl lg:text-3xl">
            Hello!
          </h2>

          <p className="text-sm leading-relaxed text-muted sm:text-base">
            Discover who we are, our mission and vision, core values, and our discipleship journey
            in a quick, interactive visual guide.
          </p>

          <div className="pt-2">
            <Button
              type="button"
              variant="default"
              size="xs"
              className="gap-2 shadow-md transition-transform duration-200 group-hover:scale-105"
              onClick={(e) => {
                e.stopPropagation();
                navigate(ROUTE_PATHS.hello);
              }}
            >
              <BookOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Explore Hello Guide</span>
              <ArrowRight
                className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Button>
          </div>
        </div>

        {/* Right preview card teaser */}
        <div className="relative shrink-0 self-center sm:self-auto">
          <div className="relative h-32 w-48 overflow-hidden rounded-xl border border-border/80 bg-neutral-900 shadow-md transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl sm:h-36 sm:w-56 lg:h-40 lg:w-64">
            <img
              src={helloCoverImage}
              alt="CCF Hello Brochure Preview"
              className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-medium text-white/90">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />8 Interactive Slides
              </span>
              <span className="rounded bg-black/50 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur-xs">
                View →
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
