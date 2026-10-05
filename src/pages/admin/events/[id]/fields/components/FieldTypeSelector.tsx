import { DynamicFieldTypeSelector } from '@/components/ui/DynamicFieldTypeSelector';
import type { EventFieldTypeEnum } from '@/lib/domain/event-fields';

type FieldTypeSelectorProps = {
  value: EventFieldTypeEnum;
  onChange: (type: EventFieldTypeEnum) => void;
  disabled?: boolean;
  error?: string | null;
};

/** Grid of all event field types for the create panel. */
export function FieldTypeSelector({ value, onChange, disabled, error }: FieldTypeSelectorProps) {
  return (
    <DynamicFieldTypeSelector
      domain="events"
      value={value}
      onChange={onChange}
      disabled={disabled}
      error={error}
    />
  );
}
