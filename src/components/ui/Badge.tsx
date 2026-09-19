import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'primaryOutline'
  | 'ghost'
  | 'link'
  | 'destructive'
  | 'success'
  | 'warning'
  | 'neutral'
  | 'danger';

export type BadgeProps = {
  variant?: BadgeVariant;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

const variantClassName: Record<BadgeVariant, string> = {
  default: 'bg-primary text-white',
  secondary: 'bg-secondary text-white',
  accent: 'bg-accent text-text',
  outline: 'border border-primary/60 bg-transparent text-text',
  primaryOutline: 'border border-primary bg-background text-primary',
  ghost: 'bg-transparent text-text',
  link: 'bg-transparent text-primary underline',
  destructive: 'bg-red-600 text-white',
  // Semantic status aliases
  success: 'bg-primary text-white',
  warning: 'bg-secondary text-white',
  neutral: 'bg-slate-200 text-slate-700',
  danger: 'bg-red-100 text-red-700',
};

/**
 * Styled badge component for status labels and tags.
 * Supports icon slot for visual clarity.
 *
 * Variants align with Button variants while supporting semantic status aliases:
 * - default / success    → primary color  (active, open, published)
 * - secondary / warning  → secondary color (pending, upcoming, unscheduled)
 * - accent               → accent color   (excused, highlighted)
 * - neutral              → grey slate     (inactive, closed, draft)
 * - destructive / danger → red            (error, archived, missed)
 * - outline              → bordered transparent (secondary info, guest access)
 * - primaryOutline       → bordered primary
 * - ghost                → subtle text
 * - link                 → text link
 */
export function Badge({ variant = 'default', icon, children, className }: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium';
  const variantClasses = variantClassName[variant];

  return (
    <span className={`${baseClasses} ${variantClasses} ${className ?? ''}`}>
      {icon && <span className="flex h-4 w-4 items-center justify-center">{icon}</span>}
      {children}
    </span>
  );
}
