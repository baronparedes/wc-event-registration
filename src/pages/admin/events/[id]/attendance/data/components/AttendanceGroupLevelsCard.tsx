import { Button } from '@/components/ui/Button';
import { FormSelectField } from '@/components/ui/FormSelectField';
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
                <FormSelectField
                  ariaLabel={`Level ${index + 1} field`}
                  value={currentToken}
                  onChange={(value) => onGroupingFieldChange(index, value)}
                  placeholder="Select field"
                  options={[
                    ...(selectableStaticFields.length > 0
                      ? [
                          { value: '__static', label: 'Static Fields', isGroupHeader: true },
                          ...selectableStaticFields.map((staticField) => ({
                            value: `${staticField.source}:${staticField.source}`,
                            label: staticField.label,
                          })),
                        ]
                      : []),
                    ...(selectableRegistrationFields.length > 0
                      ? [
                          { value: '__reg', label: 'Registration Fields', isGroupHeader: true },
                          ...selectableRegistrationFields.map((field) => ({
                            value: field.token,
                            label: field.label,
                          })),
                        ]
                      : []),
                    ...(selectableAttendanceFields.length > 0
                      ? [
                          { value: '__att', label: 'Attendance Fields', isGroupHeader: true },
                          ...selectableAttendanceFields.map((field) => ({
                            value: field.token,
                            label: field.label,
                          })),
                        ]
                      : []),
                  ]}
                  selectClassName="flex-1 rounded-xl py-2"
                />
                <FormSelectField
                  ariaLabel={`Level ${index + 1} order`}
                  value={displayedGroupSort}
                  onChange={(value) => onGroupingSortChange(index, value as AttendeeViewGroupSort)}
                  options={[
                    { value: 'label_asc', label: 'A-Z' },
                    { value: 'label_desc', label: 'Z-A' },
                    ...(isPrimaryGroupingLevel
                      ? [
                          { value: 'size_desc', label: 'Largest' },
                          { value: 'size_asc', label: 'Smallest' },
                        ]
                      : []),
                    { value: 'time_asc', label: 'Earliest' },
                    { value: 'time_desc', label: 'Latest' },
                  ]}
                  selectClassName="rounded-xl py-2"
                />
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
