import { FIELD_TYPE_LABELS } from '@/lib/domain/event-fields';
import type { EventFieldTypeEnum } from '@/lib/domain/event-fields';

type FieldTypeSelectorProps = {
  value: EventFieldTypeEnum;
  onChange: (type: EventFieldTypeEnum) => void;
  disabled?: boolean;
  error?: string | null;
};

const FIELD_TYPES_ORDERED: EventFieldTypeEnum[] = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'multi_select_toggle',
  'date',
  'datetime',
  'boolean',
  'color_picker',
];

/** Grid of all 12 field types. Used in create mode to select a field type. */
export function FieldTypeSelector({ value, onChange, disabled, error }: FieldTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FIELD_TYPES_ORDERED.map((type) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={`rounded-lg border p-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              value === type
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
  );
}
