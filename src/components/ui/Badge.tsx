import type { ReactNode } from 'react';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'accent'
  | 'outline'
  | 'primaryOutline'
  | 'ghost'
  | 'link'
  | 'destructive';

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
  destructive: 'bg-red-600/50 text-text',
};

/**
 * Styled badge component for status labels and tags.
 * Supports icon slot for visual clarity.
 *
 * Variants align with Button variants:
 * - default        → primary color  (active, open, published, committed)
 * - secondary      → secondary color (pending, upcoming, unscheduled, walk-in)
 * - accent         → accent color   (excused, highlighted)
 * - outline        → bordered transparent (draft, closed, past, secondary info)
 * - primaryOutline → bordered primary
 * - ghost          → subtle text
 * - link           → text link
 * - destructive    → red alert      (error, archived, missed)
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
