import { Button } from '@/components/ui/Button';
import type { AttendeeViewConfig, DynamicFieldOption } from '@/lib/domain/attendance-views';
import { toDynamicFieldToken } from '@/lib/domain/attendance-views';

type AttendanceViewControlsProps = {
  viewConfig: AttendeeViewConfig;
  hasActiveFilters: boolean;
  roleOptions: string[];
  categoryOptions: string[];
  dynamicFieldOptions: DynamicFieldOption[];
  registrationDynamicFieldOptions: DynamicFieldOption[];
  attendanceDynamicFieldOptions: DynamicFieldOption[];
  dynamicFilterFieldToken: string;
  dynamicFilterValue: string;
  dynamicFilterFieldLabel: string | null;
  onNameOrMemberQueryChange: (value: string) => void;
  onRoleChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onCheckInStatusChange: (value: AttendeeViewConfig['checkInStatus']) => void;
  onAddGroupingLevel: () => void;
  onGroupingFieldChange: (index: number, token: string) => void;
  onMoveGroupingLevel: (index: number, direction: 'up' | 'down') => void;
  onRemoveGroupingLevel: (index: number) => void;
  onClearViewControls: () => void;
  onDynamicFilterFieldTokenChange: (value: string) => void;
  onDynamicFilterValueChange: (value: string) => void;
  onApplyDynamicFilter: () => void;
  onRemoveDynamicFilter: (token: string, value: string) => void;
};

function getSelectableFields(
  options: DynamicFieldOption[],
  groupBy: AttendeeViewConfig['groupBy'],
  currentIndex: number,
) {
  return options.filter(
    (field) =>
      toDynamicFieldToken(field) === toDynamicFieldToken(groupBy[currentIndex]) ||
      !groupBy.some(
        (selected, selectedIndex) =>
          selectedIndex !== currentIndex &&
          toDynamicFieldToken(selected) === toDynamicFieldToken(field),
      ),
  );
}

export function AttendanceViewControls({
  viewConfig,
  hasActiveFilters,
  roleOptions,
  categoryOptions,
  dynamicFieldOptions,
  registrationDynamicFieldOptions,
  attendanceDynamicFieldOptions,
  dynamicFilterFieldToken,
  dynamicFilterValue,
  dynamicFilterFieldLabel,
  onNameOrMemberQueryChange,
  onRoleChange,
  onCategoryChange,
  onCheckInStatusChange,
  onAddGroupingLevel,
  onGroupingFieldChange,
  onMoveGroupingLevel,
  onRemoveGroupingLevel,
  onClearViewControls,
  onDynamicFilterFieldTokenChange,
  onDynamicFilterValueChange,
  onApplyDynamicFilter,
  onRemoveDynamicFilter,
}: AttendanceViewControlsProps) {
  return (
    <>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm text-muted md:col-span-2 lg:col-span-3">
          Name or Member ID
          <input
            type="text"
            value={viewConfig.nameOrMemberQuery}
            onChange={(event) => onNameOrMemberQueryChange(event.target.value)}
            placeholder="Search by attendee name or member ID"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Role
          <select
            value={viewConfig.role}
            onChange={(event) => onRoleChange(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All roles</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Category
          <select
            value={viewConfig.category}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Check-in status
          <select
            value={viewConfig.checkInStatus}
            onChange={(event) =>
              onCheckInStatusChange(event.target.value as AttendeeViewConfig['checkInStatus'])
            }
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All check-in states</option>
            <option value="checked_in">Checked in</option>
            <option value="not_checked_in">Not checked in</option>
          </select>
        </label>

        <div className="rounded-xl border border-border p-3 md:col-span-2 lg:col-span-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-muted">Group levels</p>
            <Button type="button" variant="outline" size="sm" onClick={onAddGroupingLevel}>
              Add group level
            </Button>
          </div>

          {viewConfig.groupBy.length === 0 ? (
            <p className="text-xs text-muted">No grouping applied.</p>
          ) : (
            <div className="space-y-2">
              {viewConfig.groupBy.map((groupField, index) => {
                const selectableFields = getSelectableFields(
                  dynamicFieldOptions,
                  viewConfig.groupBy,
                  index,
                );
                const selectableRegistrationFields = selectableFields.filter(
                  (field) => field.source === 'registration',
                );
                const selectableAttendanceFields = selectableFields.filter(
                  (field) => field.source === 'attendance',
                );

                return (
                  <div key={`group-level-${index}`} className="flex items-center gap-2">
                    <span className="w-16 text-xs text-muted">Level {index + 1}</span>
                    <select
                      value={groupField.fieldKey ? toDynamicFieldToken(groupField) : ''}
                      onChange={(event) => onGroupingFieldChange(index, event.target.value)}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Select field</option>
                      {selectableRegistrationFields.length > 0 && (
                        <optgroup label="Registration Fields">
                          {selectableRegistrationFields.map((field) => (
                            <option key={field.token} value={field.token}>
                              {field.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {selectableAttendanceFields.length > 0 && (
                        <optgroup label="Attendance Fields">
                          {selectableAttendanceFields.map((field) => (
                            <option key={field.token} value={field.token}>
                              {field.label}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onMoveGroupingLevel(index, 'up')}
                      disabled={index === 0}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onMoveGroupingLevel(index, 'down')}
                      disabled={index === viewConfig.groupBy.length - 1}
                    >
                      Down
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => onRemoveGroupingLevel(index)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClearViewControls}
            disabled={!hasActiveFilters}
          >
            Clear view controls
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="flex flex-col gap-1 text-sm text-muted">
          Filter field
          <select
            value={dynamicFilterFieldToken}
            onChange={(event) => onDynamicFilterFieldTokenChange(event.target.value)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select a field</option>
            {registrationDynamicFieldOptions.length > 0 && (
              <optgroup label="Registration Fields">
                {registrationDynamicFieldOptions.map((field) => (
                  <option key={field.token} value={field.token}>
                    {field.label}
                  </option>
                ))}
              </optgroup>
            )}
            {attendanceDynamicFieldOptions.length > 0 && (
              <optgroup label="Attendance Fields">
                {attendanceDynamicFieldOptions.map((field) => (
                  <option key={field.token} value={field.token}>
                    {field.label}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-muted">
          Field value
          <input
            type="text"
            value={dynamicFilterValue}
            onChange={(event) => onDynamicFilterValueChange(event.target.value)}
            disabled={!dynamicFilterFieldLabel}
            placeholder={
              dynamicFilterFieldLabel
                ? `Enter value for ${dynamicFilterFieldLabel}`
                : 'Select a field first'
            }
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          />
        </label>

        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onApplyDynamicFilter}
            disabled={!dynamicFilterFieldLabel || dynamicFilterValue.trim().length === 0}
          >
            Apply field filter
          </Button>
        </div>
      </div>

      {viewConfig.dynamicFilters.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {viewConfig.dynamicFilters.map((filter) => {
            const token = toDynamicFieldToken(filter.field);
            return (
              <button
                key={`${token}:${filter.value}`}
                type="button"
                onClick={() => onRemoveDynamicFilter(token, filter.value)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-text hover:border-primary"
                title="Remove filter"
              >
                {filter.field.label} ({filter.field.source}): {filter.value} x
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
