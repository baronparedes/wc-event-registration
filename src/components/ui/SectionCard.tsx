import type { ReactNode } from 'react';

export type SectionCardProps = {
  title?: string;
  children: ReactNode;
  subtitle?: ReactNode;
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
      {title && (
        <h2 className={titleClassName ?? 'font-heading text-xl font-semibold text-text'}>
          {title}
        </h2>
      )}
      {subtitle && <div className={subtitleClassName ?? 'mt-2 text-sm text-muted'}>{subtitle}</div>}
      <div className={contentClassName ?? defaultContentClassName}>{children}</div>
    </div>
  );
}
