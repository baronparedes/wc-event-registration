import type { ReactNode } from 'react';

import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type AlertBannerVariant = 'info' | 'warning' | 'error' | 'success';

export interface AlertBannerProps {
  variant?: AlertBannerVariant;
  align?: 'start' | 'center';
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode | boolean;
  action?: ReactNode;
  className?: string;
}

const variantStyles: Record<
  AlertBannerVariant,
  {
    container: string;
    title: string;
    description: string;
    icon: string;
    defaultIcon: ReactNode;
  }
> = {
  info: {
    container: 'border-blue-200 bg-blue-50 text-blue-900',
    title: 'text-blue-900 font-medium',
    description: 'text-blue-700',
    icon: 'text-blue-600',
    defaultIcon: <Info className="h-5 w-5" />,
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-900',
    title: 'text-amber-900 font-medium',
    description: 'text-amber-700',
    icon: 'text-amber-600',
    defaultIcon: <AlertTriangle className="h-5 w-5" />,
  },
  error: {
    container: 'border-red-200 bg-red-50 text-red-900',
    title: 'text-red-900 font-medium',
    description: 'text-red-700',
    icon: 'text-red-600',
    defaultIcon: <AlertCircle className="h-5 w-5" />,
  },
  success: {
    container: 'border-green-200 bg-green-50 text-green-900',
    title: 'text-green-900 font-medium',
    description: 'text-green-700',
    icon: 'text-green-600',
    defaultIcon: <CheckCircle2 className="h-5 w-5" />,
  },
};

/**
 * Standardized alert and notification banner.
 */
export function AlertBanner({
  variant = 'info',
  align,
  title,
  description,
  children,
  icon = true,
  action,
  className = '',
}: AlertBannerProps) {
  const config = variantStyles[variant];

  let renderedIcon: ReactNode = null;
  if (icon === true) {
    renderedIcon = config.defaultIcon;
  } else if (icon) {
    renderedIcon = icon;
  }

  const effectiveAlign = align ?? (!description && !children ? 'center' : 'start');
  const alignmentClass = effectiveAlign === 'center' ? 'items-center' : 'items-start';
  const iconPadding = effectiveAlign === 'center' ? '' : 'pt-0.5';

  return (
    <div
      role="alert"
      className={`flex flex-col sm:flex-row ${action ? 'sm:items-start' : alignmentClass} gap-3 rounded-xl border p-3.5 sm:p-4 text-sm ${config.container} ${className}`}
    >
      <div className={`flex ${alignmentClass} gap-2.5 sm:gap-3 min-w-0 flex-1 w-full`}>
        {renderedIcon && (
          <div className={`shrink-0 ${iconPadding} ${config.icon}`}>{renderedIcon}</div>
        )}
        <div className="min-w-0 flex-1 space-y-1">
          {title && <div className={config.title}>{title}</div>}
          {description && (
            <div className={`text-xs sm:text-sm ${config.description}`}>{description}</div>
          )}
          {children}
        </div>
      </div>
      {action && (
        <div className="w-full sm:w-auto shrink-0 sm:self-start pt-1 sm:pt-0 [&>button]:w-full sm:[&>button]:w-auto [&>a]:w-full sm:[&>a]:w-auto">
          {action}
        </div>
      )}
    </div>
  );
}
