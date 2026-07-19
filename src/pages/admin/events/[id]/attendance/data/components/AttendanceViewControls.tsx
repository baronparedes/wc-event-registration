import { useEffect, useRef, useState } from 'react';

import { ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';
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
  dynamicFilterFieldType?: DynamicFieldOption['fieldType'] | null;
  onNameOrMemberQueryChange: (value: string) => void;
  onRoleChange: (value: string[]) => void;
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
  dynamicFilterFieldType = null,
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
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isRoleDropdownOpen) {
      return;
    }

    function handleDocumentMouseDown(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!roleDropdownRef.current?.contains(target)) {
        setIsRoleDropdownOpen(false);
      }
    }

    function handleDocumentKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsRoleDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [isRoleDropdownOpen]);

  const selectedRoleCount = viewConfig.role.length;
  const selectedRoleLabel =
    selectedRoleCount === 0
      ? 'All roles'
      : selectedRoleCount === 1
        ? viewConfig.role[0]
        : `${selectedRoleCount} roles selected`;

  function toggleRoleSelection(role: string) {
    const isSelected = viewConfig.role.includes(role);
    if (isSelected) {
      onRoleChange(viewConfig.role.filter((selectedRole) => selectedRole !== role));
      return;
    }

    onRoleChange([...viewConfig.role, role]);
  }

  return (
    <>
      {/* Collapsible filters */}
      <CollapsibleSectionCard
        title={
          <label className="pr-12 flex flex-col gap-1 ">
            <span className="sr-only">Name or Member ID</span>
            <input
              type="text"
              value={viewConfig.nameOrMemberQuery}
              onChange={(event) => onNameOrMemberQueryChange(event.target.value)}
              placeholder="Search by attendee name or member ID"
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        }
        defaultExpanded={false}
        expandLabel="Expand filters"
        collapseLabel="Collapse filters"
        wrapperClassName="mb-4 rounded-2xl border border-border bg-surface p-6 shadow-sm print:hidden"
        titleClassName="font-heading text-lg font-semibold text-text"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pt-4">
          <div className="relative" ref={roleDropdownRef}>
            <label className="mb-1 block text-sm text-muted">Role</label>
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen((current) => !current)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              aria-haspopup="listbox"
              aria-expanded={isRoleDropdownOpen}
              aria-label="Role"
            >
              <span>{selectedRoleLabel}</span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {isRoleDropdownOpen && (
              <div
                className="absolute z-20 mt-1 w-full rounded-xl border border-border bg-surface p-2 shadow-md"
                role="listbox"
                aria-label="Role options"
              >
                <button
                  type="button"
                  onClick={() => {
                    onRoleChange([]);
                    setIsRoleDropdownOpen(false);
                  }}
                  className="mb-1 w-full rounded-lg px-2 py-1 text-left text-sm text-text transition hover:bg-slate-50"
                >
                  All roles
                </button>
                <div className="max-h-44 overflow-y-auto">
                  {roleOptions.map((role) => (
                    <label
                      key={role}
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm text-text transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={viewConfig.role.includes(role)}
                        onChange={() => toggleRoleSelection(role)}
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

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
                  const selectableStaticFields = getStaticFieldOptions(viewConfig.groupBy, index);

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

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:col-span-2 lg:col-span-3">
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
              {(dynamicFilterFieldType === 'date' || dynamicFilterFieldType === 'datetime') && (
                <span className="text-xs text-muted">
                  Tip: You can use date presets like UPCOMING_SUNDAY, MONTH_JULY,
                  YEAR_MONTH_2026_JULY, YEAR_2026, or PREVIOUS_3_WEEKS.
                </span>
              )}
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
            <div className="flex flex-wrap items-center gap-2 md:col-span-2 lg:col-span-3">
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
        </div>
      </CollapsibleSectionCard>
    </>
  );
}
