import type { ReactNode } from 'react';

import { Cake, HeartIcon } from 'lucide-react';

import { Badge } from '@/components/ui';

import type { MilestoneType } from '../';
import { getMilestoneTypeBadgeClass } from './milestoneBadgeUtils';

export type MilestoneBadgeProps = {
  type: MilestoneType;
  children?: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
  title?: string;
};

export function MilestoneBadge({
  type,
  children,
  className = '',
  size = 'md',
  title,
}: MilestoneBadgeProps) {
  const isBirthday = type === 'birthday';
  const Icon = isBirthday ? Cake : HeartIcon;
  const label = children ?? (isBirthday ? 'Birthday' : 'Wedding Anniversary');

  if (size === 'sm') {
    return (
      <span
        title={title}
        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
          isBirthday
            ? 'border border-primary/20 bg-primary/10 text-primary'
            : 'border border-red-200 bg-red-50 !text-red-800'
        } ${className}`}
      >
        <Icon className="h-3 w-3 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <Badge
      className={`${getMilestoneTypeBadgeClass(type)} ${className}`}
      icon={<Icon className="h-3.5 w-3.5 shrink-0" />}
    >
      {label}
    </Badge>
  );
}
