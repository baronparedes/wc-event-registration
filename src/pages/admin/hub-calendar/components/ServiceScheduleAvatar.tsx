import { CalendarOff } from 'lucide-react';

import { Avatar } from '@/components/ui';

import { getConfidenceBorderVariant } from './serviceScheduleAvatarUtils';

export type ServiceScheduleAvatarProps = {
  name: string;
  avatarObjectKey?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  excused?: boolean;
  border?: 'primary' | 'secondary' | 'destructive' | 'accent' | 'success' | 'none';
  turnupRate?: number | null;
  attendanceScore?: number | null;
};

export function ServiceScheduleAvatar({
  name,
  avatarObjectKey,
  size = 'sm',
  className = '',
  excused = false,
  border,
  turnupRate,
  attendanceScore,
}: ServiceScheduleAvatarProps) {
  const rate = turnupRate ?? attendanceScore;
  const calculatedBorder = border ?? getConfidenceBorderVariant(rate);

  if (!excused) {
    return (
      <Avatar
        name={name}
        avatarObjectKey={avatarObjectKey}
        size={size}
        border={calculatedBorder}
        className={className}
      />
    );
  }

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

  return (
    <div className="relative inline-flex shrink-0">
      <Avatar
        name={name}
        avatarObjectKey={avatarObjectKey}
        size={size}
        border={calculatedBorder}
        className={className}
      />
      <span
        title="Excused"
        className={`absolute flex items-center justify-center rounded-full border-surface shadow-sm bg-danger text-white ${badgeSizeClasses}`}
      >
        <CalendarOff className={`${iconSizeClasses} shrink-0`} />
      </span>
    </div>
  );
}
