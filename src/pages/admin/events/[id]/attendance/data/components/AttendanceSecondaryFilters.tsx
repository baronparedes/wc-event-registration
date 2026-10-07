import { FormMultiSelectDropdownField, FormSelectField } from '@/components/ui';
import type { AttendeeViewConfig } from '@/lib/domain/attendance-views';

type AttendanceSecondaryFiltersProps = {
  viewConfig: Pick<AttendeeViewConfig, 'role' | 'category' | 'checkInStatus'>;
  roleOptions: string[];
  categoryOptions: string[];
  selectedRoleLabel: string;
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
        clearButtonLabel="All roles"
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
        />
      </div>
    </>
  );
}
