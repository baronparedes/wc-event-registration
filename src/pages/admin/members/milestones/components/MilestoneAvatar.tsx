import { Cake, HeartIcon } from 'lucide-react';

import { Avatar } from '@/components/ui';

import type { MilestoneType } from '../';

export type MilestoneAvatarProps = {
  name: string;
  avatarObjectKey?: string | null;
  type: MilestoneType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function MilestoneAvatar({
  name,
  avatarObjectKey,
  type,
  size = 'sm',
  className = '',
}: MilestoneAvatarProps) {
  const isBirthday = type === 'birthday';
  const Icon = isBirthday ? Cake : HeartIcon;

  const badgeSizeClasses = {
    sm: 'h-4 w-4 -bottom-0.5 -right-0.5 border-2',
    md: 'h-6 w-6 bottom-0 right-0 border-2',
    lg: 'h-9 w-9 bottom-1 right-1 border-2',
  }[size];

  const iconSizeClasses = {
    sm: 'h-2.5 w-2.5',
    md: 'h-3.5 w-3.5',
    lg: 'h-5 w-5',
  }[size];

  const badgeColorClasses = isBirthday ? 'bg-primary text-white' : 'bg-rose-500 text-white';

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <Avatar name={name} avatarObjectKey={avatarObjectKey} size={size} />
      <span
        title={isBirthday ? 'Birthday' : 'Wedding Anniversary'}
        className={`absolute flex items-center justify-center rounded-full border-surface shadow-sm ${badgeSizeClasses} ${badgeColorClasses}`}
      >
        <Icon className={`${iconSizeClasses} shrink-0`} />
      </span>
    </div>
  );
}
