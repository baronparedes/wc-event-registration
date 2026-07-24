import { RotateCcw, Search } from 'lucide-react';

import { FormInputField } from '@/components/ui/FormInputField';
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
  memberDynamicFieldOptions: DynamicFieldOption[];
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
  canClearFilters: boolean;
  onClearViewControls: () => void;
};

export function AttendancePrimaryFilters({
  viewConfig,
  registrationDynamicFieldOptions,
  attendanceDynamicFieldOptions,
  memberDynamicFieldOptions,
  onNameOrMemberQueryChange,
  onToggleVisibleField,
  canClearFilters,
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
          <AttendanceColumnsButton
            selectedFields={viewConfig.visibleFields}
            registrationFieldOptions={registrationDynamicFieldOptions}
            attendanceFieldOptions={attendanceDynamicFieldOptions}
            memberFieldOptions={memberDynamicFieldOptions}
            onToggleField={onToggleVisibleField}
          />
          <button
            type="button"
            onClick={onClearViewControls}
            disabled={!canClearFilters}
            aria-label="Clear filters"
            title="Clear filters"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary bg-primary text-white outline-none transition hover:bg-primary/90 focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
