import { FIELD_TYPE_COLORS, FIELD_TYPE_LABELS } from '@/lib/domain/event-fields';
import type { EventFieldTypeEnum } from '@/lib/domain/event-fields';

export interface FieldTypeBadgeProps {
  fieldType: string;
  customLabel?: string;
  className?: string;
}

/**
 * Standard pill badge representing a dynamic field type across event, attendance, and form lists.
 */
export function FieldTypeBadge({ fieldType, customLabel, className = '' }: FieldTypeBadgeProps) {
  const colorClass = FIELD_TYPE_COLORS[fieldType] ?? 'bg-muted text-text';
  const label = customLabel ?? FIELD_TYPE_LABELS[fieldType as EventFieldTypeEnum] ?? fieldType;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
