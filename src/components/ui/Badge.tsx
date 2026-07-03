import type { ReactNode } from 'react';

type BadgeVariant = 'upcoming' | 'open' | 'closed' | 'error' | 'guest';

type BadgeProps = {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

const variantClassName: Record<BadgeVariant, string> = {
  upcoming: 'bg-secondary text-white',
  open: 'bg-primary text-white',
  closed: 'bg-slate-200 text-slate-700',
  error: 'bg-red-100 text-red-700',
  guest: 'border border-primary/60 bg-transparent text-text',
};

/**
 * Styled badge component for status labels and tags.
 * Supports icon slot for visual clarity.
 */
export function Badge({ variant = 'open', icon, children, className }: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium';
  const variantClasses = variantClassName[variant];

  return (
    <span className={`${baseClasses} ${variantClasses} ${className ?? ''}`}>
      {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
