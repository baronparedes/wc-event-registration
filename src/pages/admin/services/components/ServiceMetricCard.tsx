import type { ReactNode } from 'react';

import { Pointer } from 'lucide-react';

import { Badge, type BadgeVariant } from '@/components/ui';

import type { ServiceTimeSlot } from '../constants';

export interface ServiceMetricCardProps {
  icon: ReactNode;
  iconClassName?: string;
  title: string;
  subtitle: string;
  badgeContent: ReactNode;
  badgeVariant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

export function ServiceMetricCard({
  icon,
  iconClassName = 'bg-primary/10 text-primary',
  title,
  subtitle,
  badgeContent,
  badgeVariant = 'default',
  children,
  className = '',
}: ServiceMetricCardProps) {
  return (
    <div
      className={`flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-xs ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-heading font-semibold text-text">{title}</h3>
            <p className="truncate text-xs text-muted">{subtitle}</p>
          </div>
        </div>
        <Badge variant={badgeVariant} className="shrink-0">
          {badgeContent}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">{children}</div>
    </div>
  );
}

export interface ServiceSlotCellProps {
  timeSlot: ServiceTimeSlot;
  value: ReactNode;
  sublabel?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  isLowRate?: boolean;
  valueClassName?: string;
}

export function ServiceSlotCell({
  timeSlot,
  value,
  sublabel = '—',
  onClick,
  disabled = false,
  title,
  isLowRate = false,
  valueClassName = '',
}: ServiceSlotCellProps) {
  const isInteractive = Boolean(onClick);

  if (isInteractive) {
    const isClickable = !disabled;
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={isClickable ? title : undefined}
        className={`group relative flex h-28 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-all ${
          isClickable
            ? 'cursor-pointer border-border/60 bg-background hover:border-primary/50 hover:bg-primary/5 hover:shadow-xs'
            : 'cursor-default border-border/40 bg-background/50 opacity-40'
        }`}
      >
        <div className="flex w-full items-center justify-between">
          <span className="text-xs font-medium text-muted">{timeSlot}</span>
          {isClickable && (
            <Pointer className="h-3.5 w-3.5 text-muted/50 transition-transform group-hover:scale-110 group-hover:text-primary" />
          )}
        </div>
        <span
          className={`font-heading text-2xl font-bold text-text transition-colors group-hover:text-primary ${valueClassName}`.trim()}
        >
          {value}
        </span>
        <div className="flex h-5 w-full items-center justify-center">
          {typeof sublabel === 'string' ? (
            <span className="text-[10px] text-muted">{sublabel}</span>
          ) : (
            sublabel
          )}
        </div>
      </button>
    );
  }

  return (
    <div
      className={`flex h-28 flex-col items-center justify-between rounded-xl border p-2.5 text-center transition-colors ${
        isLowRate ? 'border-danger/30 bg-danger/5' : 'border-border/50 bg-background'
      }`}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-xs font-medium text-muted">{timeSlot}</span>
      </div>
      <span
        className={`font-heading text-2xl font-bold ${
          isLowRate ? 'text-danger' : valueClassName || 'text-text'
        }`}
      >
        {value}
      </span>
      <div className="flex h-5 w-full items-center justify-center">
        {typeof sublabel === 'string' ? (
          <span className="text-[10px] text-muted">{sublabel}</span>
        ) : (
          sublabel
        )}
      </div>
    </div>
  );
}
