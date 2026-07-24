import { FormMultiSelectDropdownField, FormSelectField } from '@/components/ui';
import type { AttendeeViewConfig } from '@/lib';

type AttendanceSecondaryFiltersProps = {
  viewConfig: Pick<AttendeeViewConfig, 'role' | 'category' | 'checkInStatus'>;
  roleOptions: string[];
  categoryOptions: string[];
  selectedRoleLabel: string;
  isRoleDropdownOpen: boolean;
  roleDropdownRef: React.RefObject<HTMLDivElement | null>;
  onToggleRoleDropdown: () => void;
  onCloseRoleDropdown: () => void;
  onRoleChange: (value: string[]) => void;
  onToggleRoleSelection: (role: string) => void;
  onCategoryChange: (value: string) => void;
  onCheckInStatusChange: (value: AttendeeViewConfig['checkInStatus']) => void;
};

export function AttendanceSecondaryFilters({
  viewConfig,
  roleOptions,
  categoryOptions,
  selectedRoleLabel,
  isRoleDropdownOpen,
  roleDropdownRef,
  onToggleRoleDropdown,
  onCloseRoleDropdown,
  onRoleChange,
  onToggleRoleSelection,
  onCategoryChange,
  onCheckInStatusChange,
}: AttendanceSecondaryFiltersProps) {
  return (
    <>
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
    </>
  );
}
