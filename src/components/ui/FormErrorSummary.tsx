import { type ReactNode } from 'react';

import { ArrowUp } from 'lucide-react';

import { AlertBanner } from './AlertBanner';
import { Button } from './Button';

export interface FormErrorSummaryProps {
  /** Total number of fields requiring attention. If 0 or negative, component does not render. */
  errorCount?: number;
  /** Custom title or heading. Defaults to a standard message based on errorCount. */
  title?: ReactNode;
  /** Optional secondary explanatory text or instructions. */
  description?: ReactNode;
  /** Callback fired when the jump button is clicked. */
  onJumpToFirstError?: () => void;
  /** Label for the jump action button. Defaults to 'Jump to first error'. */
  actionLabel?: string;
  /** Additional custom class names. */
  className?: string;
  /** Optional child elements to render inside the banner. */
  children?: ReactNode;
}

/**
 * Standardized form error summary displayed directly above bottom CTA buttons.
 * Notifies the user of validation errors and provides an accessible 1-click jump action
 * to auto-scroll and focus the first invalid field.
 */
export function FormErrorSummary({
  errorCount,
  title,
  description,
  onJumpToFirstError,
  actionLabel = 'Jump to first error',
  className = '',
  children,
}: FormErrorSummaryProps) {
  if (errorCount !== undefined && errorCount <= 0) {
    return null;
  }

  const defaultTitle =
    errorCount === 1
      ? '1 required field needs attention before continuing.'
      : errorCount !== undefined
        ? `${errorCount} required fields need attention before continuing.`
        : 'Please review the required fields before continuing.';

  return (
    <div aria-live="polite" className={`w-full ${className}`}>
      <AlertBanner
        variant="error"
        align={children || description ? 'start' : 'center'}
        title={title ?? defaultTitle}
        description={description}
        action={
          onJumpToFirstError ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onJumpToFirstError}
              className="flex items-center justify-center gap-1.5 border-danger/40 text-danger hover:bg-danger/10"
            >
              <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
              <span>{actionLabel}</span>
            </Button>
          ) : undefined
        }
      >
        {children}
      </AlertBanner>
    </div>
  );
}
