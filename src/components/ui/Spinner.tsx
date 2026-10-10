import type { HTMLAttributes } from 'react';

import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl';

export type SpinnerProps = HTMLAttributes<HTMLSpanElement> & {
  size?: SpinnerSize;
  label?: string;
  iconClassName?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
};

const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  base: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
  '2xl': 'h-12 w-12',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return twMerge(classes.filter(Boolean).join(' '));
}

/**
 * Standardized loading spinner component.
 * When standalone, renders with role="status" and an accessible label.
 * When aria-hidden="true" (e.g. inside a labeled button or next to text), acts as a decorative icon.
 */
export function Spinner({
  size = 'md',
  label,
  className,
  iconClassName,
  'aria-hidden': ariaHidden,
  ...props
}: SpinnerProps) {
  const isHidden = ariaHidden === true || ariaHidden === 'true';

  if (isHidden) {
    return (
      <span
        aria-hidden="true"
        className={cx('inline-flex items-center justify-center', className)}
        {...props}
      >
        <Loader2 className={cx('animate-spin', sizeClasses[size], iconClassName)} />
      </span>
    );
  }

  const effectiveLabel = label ?? 'Loading...';

  return (
    <span
      role="status"
      aria-label={effectiveLabel}
      className={cx('inline-flex items-center justify-center', className)}
      {...props}
    >
      <Loader2
        className={cx('animate-spin', sizeClasses[size], iconClassName)}
        aria-hidden="true"
      />
      <span className="sr-only">{effectiveLabel}</span>
    </span>
  );
}
