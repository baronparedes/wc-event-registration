import type { HTMLAttributes, ReactNode } from 'react';

import { twMerge } from 'tailwind-merge';

import { Spinner, type SpinnerSize } from './Spinner';

export type LoadingStateLayout = 'vertical' | 'horizontal';

export type LoadingStateProps = HTMLAttributes<HTMLDivElement> & {
  message?: ReactNode;
  size?: SpinnerSize;
  layout?: LoadingStateLayout;
  spinnerClassName?: string;
  messageClassName?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(' '));
}

/**
 * High-level layout component for page shells, sections, cards, and data lists.
 * Renders a centered or inline spinner paired with contextual descriptive text.
 */
export function LoadingState({
  message,
  size,
  layout = 'vertical',
  className,
  spinnerClassName,
  messageClassName,
  ...props
}: LoadingStateProps) {
  if (layout === 'horizontal') {
    return (
      <div role="status" className={cx('inline-flex items-center gap-2.5', className)} {...props}>
        <Spinner
          size={size ?? 'sm'}
          aria-hidden="true"
          className={cx('shrink-0 text-primary', spinnerClassName)}
        />
        {message ? (
          <span className={cx('text-sm text-muted', messageClassName)}>{message}</span>
        ) : (
          <span className="sr-only">Loading...</span>
        )}
      </div>
    );
  }

  return (
    <div
      role="status"
      className={cx('flex flex-col items-center justify-center gap-3 py-8 text-center', className)}
      {...props}
    >
      <Spinner
        size={size ?? 'lg'}
        aria-hidden="true"
        className={cx('text-primary', spinnerClassName)}
      />
      {message ? (
        <p className={cx('text-sm text-muted', messageClassName)}>{message}</p>
      ) : (
        <span className="sr-only">Loading...</span>
      )}
    </div>
  );
}
