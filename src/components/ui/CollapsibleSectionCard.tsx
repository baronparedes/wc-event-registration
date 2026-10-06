import { type ReactNode, useId, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export type CollapsibleSectionCardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  animateContent?: boolean;
  collapseLabel?: string;
  expandLabel?: string;
  wrapperClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  headerWrapperClassName?: string;
  backgroundImageSrc?: string;
};

/**
 * Composed section card that adds optional collapse/expand behavior while
 * preserving the base SectionCard layout and styling.
 */
export function CollapsibleSectionCard(props: CollapsibleSectionCardProps) {
  const {
    children,
    defaultExpanded = true,
    animateContent = true,
    collapseLabel = 'Collapse section',
    expandLabel = 'Expand section',
    title,
    subtitle,
    headerWrapperClassName,
    backgroundImageSrc,
    ...sectionCardProps
  } = props;

  const contentId = useId();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isAnimatingContent, setIsAnimatingContent] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const actionLabel = isExpanded ? collapseLabel : expandLabel;
  const toggleExpanded = () => {
    setIsExpanded((current) => !current);
  };
  const wrapperClassName = sectionCardProps.wrapperClassName
    ? `${sectionCardProps.wrapperClassName} relative`
    : 'relative rounded-2xl border border-border bg-surface p-6 shadow-sm';

  // Render header when title or subtitle is provided
  const headerContent =
    title || subtitle ? (
      <div className="relative">
        <div className="flex items-center justify-between gap-4 pr-10">
          {title ? (
            <button
              aria-controls={contentId}
              aria-expanded={isExpanded}
              className="min-w-0 flex-1 rounded-md text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              onClick={toggleExpanded}
              type="button"
            >
              <div
                className={
                  sectionCardProps.titleClassName ?? 'font-heading text-xl font-semibold text-text'
                }
              >
                {title}
              </div>
              {subtitle && (
                <div className={sectionCardProps.subtitleClassName ?? 'mt-2 text-sm text-muted'}>
                  {subtitle}
                </div>
              )}
            </button>
          ) : (
            <div className="min-w-0 flex-1">
              {subtitle && (
                <div className={sectionCardProps.subtitleClassName ?? 'mt-2 text-sm text-muted'}>
                  {subtitle}
                </div>
              )}
            </div>
          )}
        </div>
        <button
          aria-controls={contentId}
          aria-expanded={isExpanded}
          aria-label={actionLabel}
          className="absolute right-0 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border/80 bg-surface/90 text-text shadow-xs backdrop-blur-md transition-colors hover:bg-primary/10 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 print:hidden"
          onClick={toggleExpanded}
          title={actionLabel}
          type="button"
        >
          <ChevronDown
            aria-hidden="true"
            className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
          />
          <span className="sr-only">{actionLabel}</span>
        </button>
      </div>
    ) : null;

  return (
    <div className={`${wrapperClassName} relative overflow-hidden`}>
      {backgroundImageSrc && !isExpanded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
        >
          <img
            src={backgroundImageSrc}
            alt=""
            className="h-full w-full object-cover object-center scale-105 opacity-80"
          />
          {/* Opaque on the left for title readability, with a frosted barrier on the right protecting badges */}
          <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/90 via-40% to-surface/50 backdrop-blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface/90 via-surface/60 to-transparent sm:hidden" />
        </div>
      )}

      <div className={`relative z-10 ${headerWrapperClassName ?? ''}`}>
        {headerContent}
        {!headerContent && (
          <button
            aria-controls={contentId}
            aria-expanded={isExpanded}
            aria-label={actionLabel}
            className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-primary/10 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            onClick={toggleExpanded}
            title={actionLabel}
            type="button"
          >
            <ChevronDown
              aria-hidden="true"
              className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}
            />
            <span className="sr-only">{actionLabel}</span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && animateContent && (
          <motion.div
            id={contentId}
            key={contentId}
            className={`relative z-10 ${isAnimatingContent ? 'overflow-hidden' : 'overflow-visible'}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onAnimationStart={() => {
              setIsAnimatingContent(true);
            }}
            onAnimationComplete={() => {
              setIsAnimatingContent(false);
            }}
            transition={
              shouldReduceMotion
                ? { duration: 0 }
                : {
                    duration: 0.24,
                    ease: [0.22, 0.61, 0.36, 1],
                  }
            }
          >
            <div>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {isExpanded && !animateContent && (
        <div id={contentId} className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}
