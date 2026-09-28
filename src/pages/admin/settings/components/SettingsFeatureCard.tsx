import type { ReactNode } from 'react';

import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge, type BadgeVariant } from '@/components/ui';

export type SettingsFeatureCardProps = {
  to: string;
  title: string;
  description: string;
  icon: ReactNode;
  tag?: string;
  tagVariant?: BadgeVariant;
  actionLabel?: string;
};

export function SettingsFeatureCard({
  to,
  title,
  description,
  icon,
  tag,
  tagVariant = 'outline',
  actionLabel = 'Manage',
}: SettingsFeatureCardProps) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col justify-between rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            {icon}
          </div>
          {tag && (
            <Badge variant={tagVariant} className="text-xs">
              {tag}
            </Badge>
          )}
        </div>

        <div className="mt-4 space-y-1.5">
          <h2 className="font-heading text-lg font-semibold text-text group-hover:text-primary transition-colors">
            {title}
          </h2>
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-1.5 pt-4 border-t border-border/60 text-sm font-medium text-primary">
        <span>{actionLabel}</span>
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
