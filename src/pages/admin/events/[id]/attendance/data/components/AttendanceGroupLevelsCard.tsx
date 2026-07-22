import { Button } from '@/components/ui/Button';
import type {
  AttendeeViewConfig,
  AttendeeViewGroupSort,
  DynamicFieldOption,
} from '@/lib/domain/attendance-views';
import { toDynamicFieldToken } from '@/lib/domain/attendance-views';

type AttendanceGroupLevelsCardProps = {
  groupBy: AttendeeViewConfig['groupBy'];
  dynamicFieldOptions: DynamicFieldOption[];
  onAddGroupingLevel: () => void;
  onGroupingFieldChange: (index: number, token: string) => void;
  onGroupingSortChange: (index: number, value: AttendeeViewGroupSort) => void;
  onMoveGroupingLevel: (index: number, direction: 'up' | 'down') => void;
  onRemoveGroupingLevel: (index: number) => void;
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

function isStaticFieldSelected(
  groupField: AttendeeViewConfig['groupBy'][number],
  source: 'role' | 'category',
): boolean {
  return groupField.source === source && groupField.fieldKey === source;
}

function getStaticFieldOptions(groupBy: AttendeeViewConfig['groupBy'], currentIndex: number) {
  const staticOptions: Array<{ source: 'role' | 'category'; label: string }> = [
    { source: 'role', label: 'Role' },
    { source: 'category', label: 'Category' },
  ];

  return staticOptions.filter(
    (option) =>
      isStaticFieldSelected(groupBy[currentIndex], option.source) ||
      !groupBy.some(
        (selected, selectedIndex) =>
          selectedIndex !== currentIndex && selected.source === option.source,
      ),
  );
}

export function AttendanceGroupLevelsCard({
  groupBy,
  dynamicFieldOptions,
  onAddGroupingLevel,
  onGroupingFieldChange,
  onGroupingSortChange,
  onMoveGroupingLevel,
  onRemoveGroupingLevel,
}: AttendanceGroupLevelsCardProps) {
  return (
    <div className="rounded-xl border border-border p-3 md:col-span-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-muted">Group levels</p>
        <Button type="button" variant="outline" size="sm" onClick={onAddGroupingLevel}>
          Add group level
        </Button>
      </div>

      {groupBy.length === 0 ? (
        <p className="text-xs text-muted">No grouping applied.</p>
      ) : (
        <div className="space-y-2">
          {groupBy.map((groupField, index) => {
            const isPrimaryGroupingLevel = index === 0;
            const currentGroupSort = groupField.groupSort ?? 'label_asc';
            const displayedGroupSort =
              !isPrimaryGroupingLevel &&
              (currentGroupSort === 'size_desc' || currentGroupSort === 'size_asc')
                ? 'label_asc'
                : currentGroupSort;
            const selectableFields = getSelectableFields(dynamicFieldOptions, groupBy, index);
            const selectableRegistrationFields = selectableFields.filter(
              (field) => field.source === 'registration',
            );
            const selectableAttendanceFields = selectableFields.filter(
              (field) => field.source === 'attendance',
            );
            const selectableStaticFields = getStaticFieldOptions(groupBy, index);

            const currentToken = groupField.fieldKey ? toDynamicFieldToken(groupField) : '';

            return (
              <div key={`group-level-${index}`} className="flex items-center gap-2">
                <span className="w-16 text-xs text-muted">Level {index + 1}</span>
                <select
                  value={currentToken}
                  onChange={(event) => onGroupingFieldChange(index, event.target.value)}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">Select field</option>
                  {selectableStaticFields.length > 0 && (
                    <optgroup label="Static Fields">
                      {selectableStaticFields.map((staticField) => (
                        <option
                          key={staticField.source}
                          value={`${staticField.source}:${staticField.source}`}
                        >
                          {staticField.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
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
                <select
                  aria-label={`Level ${index + 1} order`}
                  value={displayedGroupSort}
                  onChange={(event) =>
                    onGroupingSortChange(index, event.target.value as AttendeeViewGroupSort)
                  }
                  className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="label_asc">A-Z</option>
                  <option value="label_desc">Z-A</option>
                  {isPrimaryGroupingLevel && <option value="size_desc">Largest</option>}
                  {isPrimaryGroupingLevel && <option value="size_asc">Smallest</option>}
                  <option value="time_asc">Earliest</option>
                  <option value="time_desc">Latest</option>
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
                  disabled={index === groupBy.length - 1}
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
  );
}
