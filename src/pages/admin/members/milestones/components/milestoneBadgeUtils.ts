import { Cake, HeartIcon } from 'lucide-react';

import type { MilestoneType } from '../';

export const MILESTONE_DEFINITIONS = [
  {
    type: 'birthday' as const,
    label: 'Birthday',
    labelPlural: 'Birthdays',
    icon: Cake,
    badgeClassName: 'border border-primary/20 bg-primary/10 text-primary',
  },
  {
    type: 'wedding_anniversary' as const,
    label: 'Wedding Anniversary',
    labelPlural: 'Wedding Anniversaries',
    icon: HeartIcon,
    badgeClassName: 'border border-red-200 bg-red-50 !text-red-800',
  },
] as const;

export function getMilestoneTypeLabel(type: MilestoneType): string {
  return MILESTONE_DEFINITIONS.find((d) => d.type === type)?.label ?? type;
}

export function getMilestoneTypeBadgeClass(type: MilestoneType): string {
  return (
    MILESTONE_DEFINITIONS.find((d) => d.type === type)?.badgeClassName ??
    'border border-primary/20 bg-primary/10 text-primary'
  );
}

export function getMilestoneTypeIcon(type: MilestoneType) {
  const Icon = MILESTONE_DEFINITIONS.find((d) => d.type === type)?.icon ?? Cake;
  return Icon;
}
