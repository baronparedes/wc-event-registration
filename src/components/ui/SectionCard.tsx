import type { ReactNode } from 'react';

export type SectionCardProps = {
  title?: ReactNode;
  children: ReactNode;
  subtitle?: ReactNode;
  headerAction?: ReactNode;
  wrapperClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  contentClassName?: string;
};

export function SectionCard(props: SectionCardProps) {
  const {
    title,
    children,
    subtitle,
    headerAction,
    wrapperClassName,
    titleClassName,
    subtitleClassName,
    contentClassName,
  } = props;

  const defaultContentClassName = subtitle ? 'mt-3' : title ? 'mt-2' : '';

  return (
    <div
      className={wrapperClassName ?? 'rounded-2xl border border-border bg-surface p-6 shadow-sm'}
    >
      {(title || subtitle || headerAction) && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h2 className={titleClassName ?? 'font-heading text-xl font-semibold text-text'}>
                {title}
              </h2>
            )}
            {subtitle && (
              <div className={subtitleClassName ?? 'mt-2 text-sm text-muted'}>{subtitle}</div>
            )}
          </div>
          {headerAction && <div className="w-full shrink-0 sm:w-auto">{headerAction}</div>}
        </div>
      )}
      <div className={contentClassName ?? defaultContentClassName}>{children}</div>
    </div>
  );
}
