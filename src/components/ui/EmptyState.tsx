import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** Icon component or ReactNode to display (typically a lucide-react icon) */
  icon: ReactNode;
  /** Main heading */
  title: string;
  /** Secondary description text */
  description: string;
  /** Optional action (e.g., CTA button or link) */
  action?: ReactNode;
  /** Optional container className for customization */
  className?: string;
};

/**
 * Branded empty state component for "no data" scenarios.
 * Displays icon + title + description + optional action.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-lg border border-border bg-background/50 px-6 py-16 text-center ${className ?? ''}`}
    >
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-text">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-muted">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
