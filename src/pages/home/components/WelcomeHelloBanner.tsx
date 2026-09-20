import { cx } from 'class-variance-authority';
import { BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import helloCoverImage from '@/assets/hello/ccf-hello-cover.png';
import { ROUTE_PATHS } from '@/config/constants';

interface WelcomeHelloBannerProps {
  hideGraphic?: boolean;
  translucentBackground?: boolean;
  translucentOnly?: boolean;
  backgroundOnly?: boolean;
  className?: string;
}

export function WelcomeHelloBanner({
  hideGraphic = false,
  translucentBackground = false,
  translucentOnly = false,
  backgroundOnly = false,
  className = '',
}: WelcomeHelloBannerProps = {}) {
  const navigate = useNavigate();
  const shouldHideGraphic =
    hideGraphic || translucentBackground || translucentOnly || backgroundOnly;
  const shouldShowExplore = !backgroundOnly;

  return (
    <div
      onClick={() => navigate(ROUTE_PATHS.hello)}
      role="region"
      aria-label="Welcome to CCF Hello Brochure Banner"
      className={cx('group relative cursor-pointer overflow-hidden rounded-xl', className)}
    >
      <div className="relative aspect-[24/5] min-h-[110px] w-full overflow-hidden">
        {/* Seamless ambient backdrop so the full-width background matches the cover */}
        <img
          src={helloCoverImage}
          alt={shouldHideGraphic ? 'Welcome Banner Background' : ''}
          aria-hidden={!shouldHideGraphic}
          className="absolute inset-0 h-full w-full object-cover blur-lg brightness-95 scale-105"
        />

        {!shouldHideGraphic && (
          /* Crisp, uncropped hello graphic that fits the container height */
          <img
            src={helloCoverImage}
            alt="CCF Hello Brochure Preview"
            className="relative mx-auto h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

        {shouldShowExplore && (
          <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-[11px] font-medium text-white/90">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />8 Interactive Slides
            </span>
            <span className="rounded bg-black/50 px-2 py-0.5 text-base font-semibold backdrop-blur-xs transition-colors duration-200 group-hover:bg-black/70 sm:text-lg">
              Explore →
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
