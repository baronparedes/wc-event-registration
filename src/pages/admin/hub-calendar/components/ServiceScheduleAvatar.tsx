import { CalendarOff } from 'lucide-react';

import { Avatar } from '@/components/ui';

import { type ConfidenceThresholds, getConfidenceBorderVariant } from '../utils';

export type ServiceScheduleAvatarProps = {
  name: string;
  avatarObjectKey?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
  excused?: boolean;
  border?: 'primary' | 'secondary' | 'destructive' | 'accent' | 'success' | 'none';
  turnupRate?: number | null;
  attendanceScore?: number | null;
  tooltip?: string;
  thresholds?: ConfidenceThresholds;
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
  tooltip,
  thresholds,
}: ServiceScheduleAvatarProps) {
  const rate = turnupRate ?? attendanceScore;
  const calculatedBorder = border ?? getConfidenceBorderVariant(rate, thresholds);

  if (!excused) {
    if (tooltip) {
      return (
        <div className="inline-flex shrink-0" title={tooltip}>
          <Avatar
            name={name}
            avatarObjectKey={avatarObjectKey}
            size={size}
            border={calculatedBorder}
            className={className}
          />
        </div>
      );
    }

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

  const badgeSizeClasses: Record<NonNullable<ServiceScheduleAvatarProps['size']>, string> = {
    xs: 'h-3 w-3 -bottom-0.5 -right-0.5 border',
    sm: 'h-4 w-4 -bottom-0.5 -right-0.5 border-2',
    md: 'h-6 w-6 bottom-0 right-0 border-2',
    lg: 'h-9 w-9 bottom-1 right-1 border-2',
    xl: 'h-11 w-11 bottom-1 right-1 border-2',
    '2xl': 'h-14 w-14 bottom-1 right-1 border-4',
    '3xl': 'h-20 w-20 bottom-2 right-2 border-4',
  };

  const iconSizeClasses: Record<NonNullable<ServiceScheduleAvatarProps['size']>, string> = {
    xs: 'h-2 w-2',
    sm: 'h-2.5 w-2.5',
    md: 'h-3.5 w-3.5',
    lg: 'h-5 w-5',
    xl: 'h-5 w-5',
    '2xl': 'h-7 w-7',
    '3xl': 'h-10 w-10',
  };

  return (
    <div className="relative inline-flex shrink-0" title={tooltip}>
      <Avatar
        name={name}
        avatarObjectKey={avatarObjectKey}
        size={size}
        border={calculatedBorder}
        className={className}
      />
      <span
        title={tooltip ? undefined : 'Excused'}
        className={`absolute flex items-center justify-center rounded-full border-surface shadow-sm bg-danger text-white ${badgeSizeClasses}`}
      >
        <CalendarOff className={`${iconSizeClasses} shrink-0`} />
      </span>
    </div>
  );
}
