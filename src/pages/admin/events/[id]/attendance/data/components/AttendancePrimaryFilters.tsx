import { ChevronDown, RotateCcw, Search } from 'lucide-react';

import { FormInputField } from '@/components/ui/FormInputField';
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

      <div className="relative" ref={roleDropdownRef}>
        <button
          type="button"
          onClick={onToggleRoleDropdown}
          className="flex h-10 w-full items-center justify-between rounded-xl border border-border bg-background px-3 py-2 text-left text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
                onCloseRoleDropdown();
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
                    onChange={() => onToggleRoleSelection(role)}
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

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
