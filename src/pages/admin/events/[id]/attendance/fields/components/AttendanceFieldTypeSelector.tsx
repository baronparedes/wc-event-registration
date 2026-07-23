import { ATTENDANCE_FIELD_TYPE_LABELS } from '@/lib/domain/attendance-fields';
import type { AttendanceFieldTypeEnum } from '@/lib/domain/attendance-fields';

const FIELD_TYPES_ORDERED: AttendanceFieldTypeEnum[] = [
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

type AttendanceFieldTypeSelectorProps = {
  value: AttendanceFieldTypeEnum;
  onChange: (type: AttendanceFieldTypeEnum) => void;
  error?: string | null;
};

/** Grid of all attendance field types for the create panel. */
export function AttendanceFieldTypeSelector({
  value,
  onChange,
  error,
}: AttendanceFieldTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FIELD_TYPES_ORDERED.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={`rounded-lg border p-3 text-left text-sm transition-colors ${
              value === type
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'border-border bg-background text-text hover:border-primary/50 hover:bg-primary/5'
            }`}
          >
            {ATTENDANCE_FIELD_TYPE_LABELS[type]}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
