import type { DynamicFieldOption, DynamicFieldRef } from '@/lib/domain/attendance-views';
import { toDynamicFieldToken } from '@/lib/domain/attendance-views';

type AttendanceViewFieldSelectorProps = {
  selectedFields: DynamicFieldRef[];
  registrationFieldOptions: DynamicFieldOption[];
  attendanceFieldOptions: DynamicFieldOption[];
  onToggleField: (token: string) => void;
};

function isFieldSelected(selectedFields: DynamicFieldRef[], token: string) {
  return selectedFields.some((field) => toDynamicFieldToken(field) === token);
}

function FieldOptionGroup({
  title,
  emptyState,
  options,
  selectedFields,
  onToggleField,
}: {
  title: string;
  emptyState: string;
  options: DynamicFieldOption[];
  selectedFields: DynamicFieldRef[];
  onToggleField: (token: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-text">{title}</p>
        <span className="text-xs text-muted">
          {options.filter((field) => isFieldSelected(selectedFields, field.token)).length} selected
        </span>
      </div>

      {options.length === 0 ? (
        <p className="text-xs text-muted">{emptyState}</p>
      ) : (
        <div className="grid gap-x-2 gap-y-3 md:grid-cols-2 xl:grid-cols-3">
          {options.map((field) => (
            <label key={field.token} className="flex min-w-0 items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={isFieldSelected(selectedFields, field.token)}
                onChange={() => onToggleField(field.token)}
                className="m-0 !h-4 !w-4 min-h-0 shrink-0 rounded border-border p-0 text-primary focus:ring-primary/40"
              />
              <span className="min-w-0 break-words leading-4">{field.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttendanceViewFieldSelector({
  selectedFields,
  registrationFieldOptions,
  attendanceFieldOptions,
  onToggleField,
}: AttendanceViewFieldSelectorProps) {
  return (
    <div className="space-y-3 rounded-xl border border-border p-3 md:col-span-2 lg:col-span-3">
      <div>
        <p className="text-sm font-medium text-text">Displayed fields</p>
        <p className="text-xs text-muted">
          Choose which registration and attendance fields appear as table columns.
        </p>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <FieldOptionGroup
          title="Registration fields"
          emptyState="No active registration fields are available."
          options={registrationFieldOptions}
          selectedFields={selectedFields}
          onToggleField={onToggleField}
        />
        <FieldOptionGroup
          title="Attendance fields"
          emptyState="No active attendance fields are available."
          options={attendanceFieldOptions}
          selectedFields={selectedFields}
          onToggleField={onToggleField}
        />
      </div>
    </div>
  );
}
