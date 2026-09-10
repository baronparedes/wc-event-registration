import { SectionCard } from '@/components/ui/SectionCard';
import { FIELD_TYPE_LABELS } from '@/lib/domain/event-fields';
import type { EventFieldTypeEnum } from '@/lib/domain/event-fields';

// Only the field types supported by forms (no color_picker, multi_select_toggle, datetime)
const FORM_FIELD_TYPES_ORDERED: EventFieldTypeEnum[] = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'date',
  'boolean',
];

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
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {FORM_FIELD_TYPES_ORDERED.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => onTypeSelect(type)}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  selectedFieldType === type
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border bg-background text-text hover:border-primary/50 hover:bg-primary/5'
                }`}
              >
                {FIELD_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-background px-4 py-3">
      <p className="text-xs text-gray-600">Field Type</p>
      <p className="mt-0.5 text-sm font-medium text-text">
        {FIELD_TYPE_LABELS[selectedFieldType] ?? selectedFieldType}
        <span className="ml-2 text-xs text-gray-600">(cannot be changed after creation)</span>
      </p>
    </div>
  );
}
