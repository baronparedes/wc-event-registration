import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';

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
    <div className="border-t border-border pt-3 md:col-span-3">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">Group levels</p>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={onAddGroupingLevel}
          className="w-full sm:w-auto"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
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
              <div
                key={`group-level-${index}`}
                className="flex flex-col gap-2 border-t border-border/70 pt-2 first:border-t-0 first:pt-0 sm:flex-row sm:items-center"
              >
                <span className="text-xs text-muted sm:w-16 sm:shrink-0">Level {index + 1}</span>
                <div className="w-full sm:flex-1">
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
                    selectClassName="rounded-xl py-2"
                  />
                </div>
                <div className="w-full sm:w-44">
                  <FormSelectField
                    ariaLabel={`Level ${index + 1} order`}
                    value={displayedGroupSort}
                    onChange={(value) =>
                      onGroupingSortChange(index, value as AttendeeViewGroupSort)
                    }
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
                </div>
                <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onMoveGroupingLevel(index, 'up')}
                    disabled={index === 0}
                    aria-label={`Move level ${index + 1} up`}
                    title={`Move level ${index + 1} up`}
                    className="w-full sm:w-10 sm:px-0"
                  >
                    <ArrowUp aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onMoveGroupingLevel(index, 'down')}
                    disabled={index === groupBy.length - 1}
                    aria-label={`Move level ${index + 1} down`}
                    title={`Move level ${index + 1} down`}
                    className="w-full sm:w-10 sm:px-0"
                  >
                    <ArrowDown aria-hidden="true" className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemoveGroupingLevel(index)}
                    aria-label={`Remove level ${index + 1}`}
                    title={`Remove level ${index + 1}`}
                    className="w-full sm:w-10 sm:px-0"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
