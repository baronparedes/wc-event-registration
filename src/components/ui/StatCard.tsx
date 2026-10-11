import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export type StatCardVariant = 'default' | 'primary' | 'secondary' | 'danger' | 'accent';

export interface StatCardProps extends ComponentPropsWithoutRef<'div'> {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  variant?: StatCardVariant;
  headerAction?: ReactNode;
}

const variantIconStyles: Record<StatCardVariant, string> = {
  default: 'bg-muted/10 text-muted',
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-accent/20 text-text',
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
  headerAction,
  className = '',
  children,
  ...props
}: StatCardProps) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs ${className}`.trim()}
      {...props}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {headerAction}
          {icon && (
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${variantIconStyles[variant]}`}
              aria-hidden="true"
            >
              {icon}
            </div>
          )}
        </div>
      </div>
      <div className="mt-3">
        <div className="font-heading text-2xl sm:text-3xl font-bold text-text">{value}</div>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
