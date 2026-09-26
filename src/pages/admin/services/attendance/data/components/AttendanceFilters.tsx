import { RotateCcw } from 'lucide-react';

import { AdminPageShell } from '@/components/layout';
import { Button, SearchInputField } from '@/components/ui';
import { FormInputField } from '@/components/ui/FormInputField';
import { FormMultiSelectDropdownField } from '@/components/ui/FormMultiSelectDropdownField';
import { FormSelectField } from '@/components/ui/FormSelectField';
import { SERVICE_ROLES, TIME_SLOTS } from '@/pages/admin/services/constants';

export interface AttendanceFiltersProps {
  serviceStartDate: string;
  serviceEndDate: string;
  timeSlot: string;
  isWalkIn: string;
  isLateTardy: string;
  searchTerm: string;
  selectedRoles: string[];
  selectedRoleLabel: string;
  isRoleDropdownOpen: boolean;
  roleDropdownRef: React.RefObject<HTMLDivElement | null>;
  hasActiveFilters: boolean;
  fallbackDate: string;
  onUpdateSearchParam: (key: string, value: string) => void;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  onClearFilters: () => void;
  onToggleRoleDropdown: () => void;
  onCloseRoleDropdown: () => void;
  onToggleRole: (role: string) => void;
  onClearStartDate: () => void;
}

export function AttendanceFilters({
  serviceStartDate,
  serviceEndDate,
  timeSlot,
  isWalkIn,
  isLateTardy,
  searchTerm,
  selectedRoles,
  selectedRoleLabel,
  isRoleDropdownOpen,
  roleDropdownRef,
  hasActiveFilters,
  fallbackDate,
  onUpdateSearchParam,
  onSearchChange,
  onClearSearch,
  onClearFilters,
  onToggleRoleDropdown,
  onCloseRoleDropdown,
  onToggleRole,
  onClearStartDate,
}: AttendanceFiltersProps) {
  return (
    <AdminPageShell.Filters>
      <div className="mb-3">
        <SearchInputField
          value={searchTerm}
          onChange={onSearchChange}
          onClear={onClearSearch}
          placeholder="Search by name or nickname"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto] sm:items-end">
        <FormInputField
          type="date"
          label="Start Date"
          value={serviceStartDate || fallbackDate}
          onChange={(e) => {
            const next = e.target.value;
            // When start date is cleared, also wipe end date
            if (!next) {
              onClearStartDate();
            } else {
              onUpdateSearchParam('service_start_date', next);
            }
          }}
        />
        <FormInputField
          type="date"
          label="End Date"
          value={serviceStartDate ? serviceEndDate : fallbackDate}
          disabled={!serviceStartDate}
          onChange={(e) => onUpdateSearchParam('service_end_date', e.target.value)}
        />
        <FormSelectField
          label="Time Slot"
          value={timeSlot}
          options={[
            { label: 'All', value: '' },
            ...TIME_SLOTS.map((ts) => ({ label: ts, value: ts })),
          ]}
          onChange={(val) => onUpdateSearchParam('time_slot', val)}
        />
        <FormMultiSelectDropdownField
          label="Role"
          triggerAriaLabel="Role"
          optionsAriaLabel="Role options"
          selectedLabel={selectedRoleLabel}
          options={SERVICE_ROLES.map((r) => ({ value: r, label: r }))}
          selectedValues={selectedRoles}
          isOpen={isRoleDropdownOpen}
          containerRef={roleDropdownRef}
          clearButtonLabel="All roles"
          buttonClassName="rounded-md px-3.5 py-2.5 leading-6"
          onToggleDropdown={onToggleRoleDropdown}
          onCloseDropdown={onCloseRoleDropdown}
          onClearSelection={() => onUpdateSearchParam('role', '')}
          onToggleSelection={onToggleRole}
        />
        <FormSelectField
          label="Walk-in"
          value={isWalkIn}
          options={[
            { label: 'All', value: '' },
            { label: 'Yes', value: 'true' },
            { label: 'No', value: 'false' },
          ]}
          onChange={(val) => onUpdateSearchParam('is_walk_in', val)}
        />
        <FormSelectField
          label="Late Check-In"
          value={isLateTardy}
          options={[
            { label: 'All', value: '' },
            { label: 'Yes', value: 'true' },
            { label: 'No', value: 'false' },
          ]}
          onChange={(val) => onUpdateSearchParam('is_late_tardy', val)}
        />
        <div className="space-y-1.5">
          <Button
            type="button"
            onClick={onClearFilters}
            disabled={!hasActiveFilters}
            aria-label="Clear filters"
            title="Clear filters"
            className="h-[46px] w-full min-w-[50px] rounded-md p-0 sm:w-[50px]"
          >
            <RotateCcw className="h-5 w-5 stroke-[2.25]" />
          </Button>
        </div>
      </div>
    </AdminPageShell.Filters>
  );
}
