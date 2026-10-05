import { DynamicFieldTypeSelector } from '@/components/ui/DynamicFieldTypeSelector';
import { SectionCard } from '@/components/ui/SectionCard';
import { DYNAMIC_FIELD_TYPE_LABELS } from '@/lib/domain/dynamic-fields';
import type { EventFieldTypeEnum } from '@/lib/domain/event-fields';

type FormFieldTypeSectionProps = {
  isEditing: boolean;
  selectedFieldType: EventFieldTypeEnum;
  onTypeSelect: (type: EventFieldTypeEnum) => void;
  error?: string;
};

/** Section for field type selection (create) or display (edit). */
export function FormFieldTypeSection({
  isEditing,
  selectedFieldType,
  onTypeSelect,
  error,
}: FormFieldTypeSectionProps) {
  if (!isEditing) {
    return (
      <SectionCard title="Field Type">
        <DynamicFieldTypeSelector
          domain="forms"
          value={selectedFieldType}
          onChange={onTypeSelect}
          error={error}
        />
      </SectionCard>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs text-gray-600">Field Type</p>
      <p className="mt-0.5 text-sm font-medium text-text">
        {DYNAMIC_FIELD_TYPE_LABELS[selectedFieldType] ?? selectedFieldType}
        <span className="ml-2 text-xs text-gray-600">(cannot be changed after creation)</span>
      </p>
    </div>
  );
}
