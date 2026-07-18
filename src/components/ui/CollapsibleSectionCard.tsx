import { type ReactNode, useId, useState } from 'react';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export type CollapsibleSectionCardProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  collapseLabel?: string;
  expandLabel?: string;
  headerRight?: ReactNode;
  wrapperClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
};

/**
 * Composed section card that adds optional collapse/expand behavior while
 * preserving the base SectionCard layout and styling.
 */
export function CollapsibleSectionCard(props: CollapsibleSectionCardProps) {
  const {
    children,
    defaultExpanded = true,
    collapseLabel = 'Collapse section',
    expandLabel = 'Expand section',
    headerRight,
    title,
    subtitle,
    ...sectionCardProps
  } = props;

  const contentId = useId();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const shouldReduceMotion = useReducedMotion();
  const actionLabel = isExpanded ? collapseLabel : expandLabel;
  const wrapperClassName = sectionCardProps.wrapperClassName
    ? `${sectionCardProps.wrapperClassName} relative`
    : 'relative rounded-2xl border border-border bg-surface p-6 shadow-sm';

  // When headerRight is provided, render custom header; otherwise use SectionCard's rendering
  const headerContent =
    headerRight || title || subtitle ? (
      <div className="relative">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            {title && (
              <div
                className={
                  sectionCardProps.titleClassName ?? 'font-heading text-xl font-semibold text-text'
                }
              >
                {title}
              </div>
            )}
            {subtitle && (
              <div className={sectionCardProps.subtitleClassName ?? 'mt-2 text-sm text-muted'}>
                {subtitle}
              </div>
            )}
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
        <button
          aria-controls={contentId}
          aria-expanded={isExpanded}
          aria-label={actionLabel}
          className="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          onClick={() => {
            setIsExpanded((current) => !current);
          }}
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
    <div className={wrapperClassName}>
      {headerContent}
      {!headerContent && (
        <button
          aria-controls={contentId}
          aria-expanded={isExpanded}
          aria-label={actionLabel}
          className="absolute right-6 top-6 inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
          onClick={() => {
            setIsExpanded((current) => !current);
          }}
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

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={contentId}
            key={contentId}
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
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
    </div>
  );
}
