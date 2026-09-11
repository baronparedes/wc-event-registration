import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'neutral' | 'danger' | 'outline';

type BadgeProps = {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

const variantClassName: Record<BadgeVariant, string> = {
  success: 'bg-primary text-white',
  warning: 'bg-secondary text-white',
  neutral: 'bg-slate-200 text-slate-700',
  danger: 'bg-red-100 text-red-700',
  outline: 'border border-primary/60 bg-transparent text-text',
};

/**
 * Styled badge component for status labels and tags.
 * Supports icon slot for visual clarity.
 *
 * Variants map to visual intent, not domain semantics:
 * - success  → green  (active, open, published)
 * - warning  → purple (pending, upcoming)
 * - neutral  → grey   (inactive, closed, draft)
 * - danger   → red    (error, archived)
 * - outline  → bordered transparent (secondary info, guest access)
 */
export function Badge({ variant = 'success', icon, children, className }: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium';
  const variantClasses = variantClassName[variant];

  return (
    <span className={`${baseClasses} ${variantClasses} ${className ?? ''}`}>
      {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
