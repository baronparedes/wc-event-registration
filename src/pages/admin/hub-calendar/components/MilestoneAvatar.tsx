import React from 'react';

import { Cake, CalendarOff, HeartIcon } from 'lucide-react';

import { Avatar } from '@/components/ui';
import type { MilestoneType } from '@/lib/domain/hub-calendar';

export type MilestoneAvatarProps = {
  name: string;
  avatarObjectKey?: string | null;
  type?: MilestoneType;
  types?: MilestoneType[];
  excused?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
};

type BadgePosition = 'lower-right' | 'bottom' | 'lower-left';

const BADGE_POSITION_CLASSES: Record<
  NonNullable<MilestoneAvatarProps['size']>,
  Record<BadgePosition, string>
> = {
  xs: {
    'lower-right': 'h-3 w-3 -bottom-0.5 -right-0.5 border',
    bottom: 'h-3 w-3 -bottom-0.5 left-1/2 -translate-x-1/2 border',
    'lower-left': 'h-3 w-3 -bottom-0.5 -left-0.5 border',
  },
  sm: {
    'lower-right': 'h-4 w-4 -bottom-0.5 -right-0.5 border-2',
    bottom: 'h-4 w-4 -bottom-0.5 left-1/2 -translate-x-1/2 border-2',
    'lower-left': 'h-4 w-4 -bottom-0.5 -left-0.5 border-2',
  },
  md: {
    'lower-right': 'h-6 w-6 bottom-0 right-0 border-2',
    bottom: 'h-6 w-6 bottom-0 left-1/2 -translate-x-1/2 border-2',
    'lower-left': 'h-6 w-6 bottom-0 left-0 border-2',
  },
  lg: {
    'lower-right': 'h-9 w-9 bottom-1 right-1 border-2',
    bottom: 'h-9 w-9 bottom-1 left-1/2 -translate-x-1/2 border-2',
    'lower-left': 'h-9 w-9 bottom-1 left-1 border-2',
  },
  xl: {
    'lower-right': 'h-11 w-11 bottom-1 right-1 border-2',
    bottom: 'h-11 w-11 bottom-1 left-1/2 -translate-x-1/2 border-2',
    'lower-left': 'h-11 w-11 bottom-1 left-1 border-2',
  },
  '2xl': {
    'lower-right': 'h-14 w-14 bottom-1 right-1 border-4',
    bottom: 'h-14 w-14 bottom-1 left-1/2 -translate-x-1/2 border-4',
    'lower-left': 'h-14 w-14 bottom-1 left-1 border-4',
  },
  '3xl': {
    'lower-right': 'h-20 w-20 bottom-2 right-2 border-4',
    bottom: 'h-20 w-20 bottom-2 left-1/2 -translate-x-1/2 border-4',
    'lower-left': 'h-20 w-20 bottom-2 left-2 border-4',
  },
};

const ICON_SIZE_CLASSES: Record<NonNullable<MilestoneAvatarProps['size']>, string> = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3.5 w-3.5',
  lg: 'h-5 w-5',
  xl: 'h-5 w-5',
  '2xl': 'h-7 w-7',
  '3xl': 'h-10 w-10',
};

function getBadgePosition(index: number, total: number): BadgePosition {
  if (total === 1) {
    return 'lower-right';
  }
  if (total === 2) {
    return index === 0 ? 'lower-right' : 'bottom';
  }
  if (index === 0) return 'lower-right';
  if (index === 1) return 'bottom';
  return 'lower-left';
}

export function MilestoneAvatar({
  name,
  avatarObjectKey,
  type,
  types,
  excused = false,
  size = 'sm',
  className = '',
}: MilestoneAvatarProps) {
  const badgeList: Array<{
    key: string;
    title: string;
    Icon: React.ComponentType<{ className?: string }>;
    colorClass: string;
  }> = [];

  const effectiveTypes: MilestoneType[] = types && types.length > 0 ? types : type ? [type] : [];

  if (effectiveTypes.includes('birthday')) {
    badgeList.push({
      key: 'birthday',
      title: 'Birthday',
      Icon: Cake,
      colorClass: 'bg-primary text-white',
    });
  }

  if (effectiveTypes.includes('wedding_anniversary')) {
    badgeList.push({
      key: 'wedding_anniversary',
      title: 'Wedding Anniversary',
      Icon: HeartIcon,
      colorClass: 'bg-rose-500 text-white',
    });
  }

  if (excused) {
    badgeList.push({
      key: 'excused',
      title: 'Excused',
      Icon: CalendarOff,
      colorClass: 'bg-danger text-white',
    });
  }

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <Avatar name={name} avatarObjectKey={avatarObjectKey} size={size} />
      {badgeList.map((badge, index) => {
        const position = getBadgePosition(index, badgeList.length);
        const positionClass = BADGE_POSITION_CLASSES[size][position];
        const IconComponent = badge.Icon;

        return (
          <span
            key={badge.key}
            title={badge.title}
            className={`absolute flex items-center justify-center rounded-full border-surface shadow-sm ${positionClass} ${badge.colorClass}`}
          >
            <IconComponent className={`${ICON_SIZE_CLASSES[size]} shrink-0`} />
          </span>
        );
      })}
    </div>
  );
}
