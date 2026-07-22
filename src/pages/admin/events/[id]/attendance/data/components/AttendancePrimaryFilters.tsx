import { RotateCcw, Search } from 'lucide-react';

import { FormInputField } from '@/components/ui/FormInputField';
import { FormMultiSelectDropdownField } from '@/components/ui/FormMultiSelectDropdownField';
import { FormSelectField } from '@/components/ui/FormSelectField';
import type { AttendeeViewConfig, DynamicFieldOption } from '@/lib/domain/attendance-views';

import { AttendanceColumnsButton } from './AttendanceColumnsButton';

type AttendancePrimaryFiltersProps = {
  viewConfig: Pick<
    AttendeeViewConfig,
    'nameOrMemberQuery' | 'role' | 'category' | 'checkInStatus' | 'visibleFields'
  >;
  roleOptions: string[];
  categoryOptions: string[];
  registrationDynamicFieldOptions: DynamicFieldOption[];
  attendanceDynamicFieldOptions: DynamicFieldOption[];
  selectedRoleLabel: string;
  isRoleDropdownOpen: boolean;
  roleDropdownRef: React.RefObject<HTMLDivElement | null>;
  onNameOrMemberQueryChange: (value: string) => void;
  onToggleRoleDropdown: () => void;
  onCloseRoleDropdown: () => void;
  onRoleChange: (value: string[]) => void;
  onToggleRoleSelection: (role: string) => void;
  onCategoryChange: (value: string) => void;
  onCheckInStatusChange: (value: AttendeeViewConfig['checkInStatus']) => void;
  onToggleVisibleField: (token: string) => void;
  hasActiveFilters: boolean;
  onClearViewControls: () => void;
};

export function AttendancePrimaryFilters({
  viewConfig,
  roleOptions,
  categoryOptions,
  registrationDynamicFieldOptions,
  attendanceDynamicFieldOptions,
  selectedRoleLabel,
  isRoleDropdownOpen,
  roleDropdownRef,
  onNameOrMemberQueryChange,
  onToggleRoleDropdown,
  onCloseRoleDropdown,
  onRoleChange,
  onToggleRoleSelection,
  onCategoryChange,
  onCheckInStatusChange,
  onToggleVisibleField,
  hasActiveFilters,
  onClearViewControls,
}: AttendancePrimaryFiltersProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
      <div className="lg:col-span-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <FormInputField
              value={viewConfig.nameOrMemberQuery}
              onChange={(event) => onNameOrMemberQueryChange(event.target.value)}
              ariaLabel="Name or Member ID"
              placeholder="Search by attendee name, email, or RFID..."
              inputClassName="rounded-xl px-3 py-2 leading-normal pl-11"
            />
          </div>
          <button
            type="button"
            onClick={onClearViewControls}
            disabled={!hasActiveFilters}
            aria-label="Reset all filters"
            title="Reset all filters"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary text-white outline-none transition hover:bg-primary/90 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      <FormMultiSelectDropdownField
        triggerAriaLabel="Role"
        optionsAriaLabel="Role options"
        selectedLabel={selectedRoleLabel}
        options={roleOptions}
        selectedValues={viewConfig.role}
        isOpen={isRoleDropdownOpen}
        containerRef={roleDropdownRef}
        clearButtonLabel="All roles"
        onToggleDropdown={onToggleRoleDropdown}
        onCloseDropdown={onCloseRoleDropdown}
        onClearSelection={() => onRoleChange([])}
        onToggleSelection={onToggleRoleSelection}
      />

      <div>
        <FormSelectField
          value={viewConfig.category}
          onChange={onCategoryChange}
          ariaLabel="Category"
          options={[
            { value: 'all', label: 'All categories' },
            ...categoryOptions.map((category) => ({ value: category, label: category })),
          ]}
          selectClassName="h-10 rounded-xl px-3 py-2 leading-normal"
        />
      </div>

      <div>
        <FormSelectField
          value={viewConfig.checkInStatus}
          onChange={(value) => onCheckInStatusChange(value as AttendeeViewConfig['checkInStatus'])}
          ariaLabel="Check-in status"
          options={[
            { value: 'all', label: 'All check-in states' },
            { value: 'checked_in', label: 'Checked in' },
            { value: 'not_checked_in', label: 'Not checked in' },
          ]}
          selectClassName="h-10 rounded-xl px-3 py-2 leading-normal"
        />
      </div>

      <AttendanceColumnsButton
        selectedFields={viewConfig.visibleFields}
        registrationFieldOptions={registrationDynamicFieldOptions}
        attendanceFieldOptions={attendanceDynamicFieldOptions}
        onToggleField={onToggleVisibleField}
      />
    </div>
  );
}
