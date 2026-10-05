import { DynamicFieldTypeSelector } from '@/components/ui/DynamicFieldTypeSelector';
import type { AttendanceFieldTypeEnum } from '@/lib/domain/attendance-fields';

type AttendanceFieldTypeSelectorProps = {
  value: AttendanceFieldTypeEnum;
  onChange: (type: AttendanceFieldTypeEnum) => void;
  error?: string | null;
  disabled?: boolean;
};

/** Grid of all attendance field types for the create panel. */
export function AttendanceFieldTypeSelector({
  value,
  onChange,
  error,
  disabled,
}: AttendanceFieldTypeSelectorProps) {
  return (
    <DynamicFieldTypeSelector
      domain="attendance"
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
    />
  );
}
