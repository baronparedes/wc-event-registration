import { useEffect, useRef, useState } from 'react';

import { SlidersHorizontal } from 'lucide-react';

import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';
import type {
  AttendeeViewConfig,
  AttendeeViewGroupSort,
  DynamicFieldOption,
  DynamicFilterCombination,
} from '@/lib/domain/attendance-views';

import { AttendanceAdvancedFiltersCard } from './AttendanceAdvancedFiltersCard';
import { AttendanceGroupLevelsCard } from './AttendanceGroupLevelsCard';
import { AttendancePrimaryFilters } from './AttendancePrimaryFilters';
import { AttendanceSecondaryFilters } from './AttendanceSecondaryFilters';

export type AttendanceViewControlsProps = {
  viewConfig: AttendeeViewConfig;
  canClearFilters: boolean;
  roleOptions: string[];
  categoryOptions: string[];
  dynamicFieldOptions: DynamicFieldOption[];
  registrationDynamicFieldOptions: DynamicFieldOption[];
  attendanceDynamicFieldOptions: DynamicFieldOption[];
  memberDynamicFieldOptions: DynamicFieldOption[];
  dynamicFilterFieldToken: string;
  dynamicFilterValue: string;
  dynamicFilterCombination: DynamicFilterCombination;
  dynamicFilterFieldLabel: string | null;
  dynamicFilterFieldType?: DynamicFieldOption['fieldType'] | null;
  onNameOrMemberQueryChange: (value: string) => void;
  onRoleChange: (value: string[]) => void;
  onCategoryChange: (value: string) => void;
  onCheckInStatusChange: (value: AttendeeViewConfig['checkInStatus']) => void;
  onAddGroupingLevel: () => void;
  onGroupingFieldChange: (index: number, token: string) => void;
  onGroupingSortChange: (index: number, value: AttendeeViewGroupSort) => void;
  onMoveGroupingLevel: (index: number, direction: 'up' | 'down') => void;
  onRemoveGroupingLevel: (index: number) => void;
  onClearViewControls: () => void;
  onDynamicFilterFieldTokenChange: (value: string) => void;
  onDynamicFilterValueChange: (value: string) => void;
  onDynamicFilterCombinationChange: (value: DynamicFilterCombination) => void;
  onApplyDynamicFilter: () => void;
  onApplyCustomFilterJson: (rawJson: string) => { ok: boolean; error?: string };
  onRemoveDynamicFilter: (token: string, value: string) => void;
  onToggleVisibleField: (token: string) => void;
};

export function AttendanceViewControls({
  viewConfig,
  canClearFilters,
  roleOptions,
  categoryOptions,
  dynamicFieldOptions,
  registrationDynamicFieldOptions,
  attendanceDynamicFieldOptions,
  memberDynamicFieldOptions,
  dynamicFilterFieldToken,
  dynamicFilterValue,
  dynamicFilterCombination,
  dynamicFilterFieldLabel,
  dynamicFilterFieldType = null,
  onNameOrMemberQueryChange,
  onRoleChange,
  onCategoryChange,
  onCheckInStatusChange,
  onAddGroupingLevel,
  onGroupingFieldChange,
  onGroupingSortChange,
  onMoveGroupingLevel,
  onRemoveGroupingLevel,
  onClearViewControls,
  onDynamicFilterFieldTokenChange,
  onDynamicFilterValueChange,
  onDynamicFilterCombinationChange,
  onApplyDynamicFilter,
  onApplyCustomFilterJson,
  onRemoveDynamicFilter,
  onToggleVisibleField,
}: AttendanceViewControlsProps) {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [customFilterJson, setCustomFilterJson] = useState('');
  const [customFilterJsonError, setCustomFilterJsonError] = useState<string | null>(null);
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

  function handleApplyCustomJson() {
    const result = onApplyCustomFilterJson(customFilterJson);
    if (!result.ok) {
      setCustomFilterJsonError(result.error ?? 'Unable to apply custom JSON filter.');
      return;
    }

    setCustomFilterJsonError(null);
  }

  function handleCustomFilterJsonChange(value: string) {
    setCustomFilterJson(value);
    if (customFilterJsonError) {
      setCustomFilterJsonError(null);
    }
  }

  const filtersAndGroupingsCount =
    viewConfig.groupBy.length +
    viewConfig.dynamicFilters.length +
    viewConfig.role.length +
    (viewConfig.category !== 'all' ? 1 : 0) +
    (viewConfig.checkInStatus !== 'all' ? 1 : 0);

  console.info(viewConfig, 'viewConfig');

  return (
    <div className="print:hidden">
      <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <AttendancePrimaryFilters
          viewConfig={viewConfig}
          roleOptions={roleOptions}
          categoryOptions={categoryOptions}
          registrationDynamicFieldOptions={registrationDynamicFieldOptions}
          attendanceDynamicFieldOptions={attendanceDynamicFieldOptions}
          memberDynamicFieldOptions={memberDynamicFieldOptions}
          selectedRoleLabel={selectedRoleLabel}
          isRoleDropdownOpen={isRoleDropdownOpen}
          roleDropdownRef={roleDropdownRef}
          onNameOrMemberQueryChange={onNameOrMemberQueryChange}
          onToggleRoleDropdown={() => setIsRoleDropdownOpen((current) => !current)}
          onCloseRoleDropdown={() => setIsRoleDropdownOpen(false)}
          onRoleChange={onRoleChange}
          onToggleRoleSelection={toggleRoleSelection}
          onCategoryChange={onCategoryChange}
          onCheckInStatusChange={onCheckInStatusChange}
          onToggleVisibleField={onToggleVisibleField}
          canClearFilters={canClearFilters}
          onClearViewControls={onClearViewControls}
        />

        <CollapsibleSectionCard
          title={
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide">
              <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
              <span>FILTERS & GROUPINGS</span>
              {filtersAndGroupingsCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold leading-none text-white">
                  {filtersAndGroupingsCount}
                </span>
              )}
            </span>
          }
          defaultExpanded={false}
          expandLabel="Expand filters"
          collapseLabel="Collapse filters"
          wrapperClassName="mt-4 border-t border-border pt-4"
          titleClassName="font-heading text-sm font-semibold text-muted"
        >
          <div className="grid gap-3 pt-4 md:grid-cols-3">
            <AttendanceSecondaryFilters
              viewConfig={viewConfig}
              roleOptions={roleOptions}
              categoryOptions={categoryOptions}
              selectedRoleLabel={selectedRoleLabel}
              isRoleDropdownOpen={isRoleDropdownOpen}
              roleDropdownRef={roleDropdownRef}
              onToggleRoleDropdown={() => setIsRoleDropdownOpen((current) => !current)}
              onCloseRoleDropdown={() => setIsRoleDropdownOpen(false)}
              onRoleChange={onRoleChange}
              onToggleRoleSelection={toggleRoleSelection}
              onCategoryChange={onCategoryChange}
              onCheckInStatusChange={onCheckInStatusChange}
            />
            <AttendanceGroupLevelsCard
              groupBy={viewConfig.groupBy}
              dynamicFieldOptions={dynamicFieldOptions}
              onAddGroupingLevel={onAddGroupingLevel}
              onGroupingFieldChange={onGroupingFieldChange}
              onGroupingSortChange={onGroupingSortChange}
              onMoveGroupingLevel={onMoveGroupingLevel}
              onRemoveGroupingLevel={onRemoveGroupingLevel}
            />
            <AttendanceAdvancedFiltersCard
              dynamicFilterCombination={dynamicFilterCombination}
              dynamicFilterFieldToken={dynamicFilterFieldToken}
              dynamicFilterValue={dynamicFilterValue}
              dynamicFilterFieldLabel={dynamicFilterFieldLabel}
              dynamicFilterFieldType={dynamicFilterFieldType}
              registrationDynamicFieldOptions={registrationDynamicFieldOptions}
              attendanceDynamicFieldOptions={attendanceDynamicFieldOptions}
              customFilterJson={customFilterJson}
              customFilterJsonError={customFilterJsonError}
              dynamicFilters={viewConfig.dynamicFilters}
              onDynamicFilterCombinationChange={onDynamicFilterCombinationChange}
              onDynamicFilterFieldTokenChange={onDynamicFilterFieldTokenChange}
              onDynamicFilterValueChange={onDynamicFilterValueChange}
              onApplyDynamicFilter={onApplyDynamicFilter}
              onCustomFilterJsonChange={handleCustomFilterJsonChange}
              onApplyCustomJson={handleApplyCustomJson}
              onRemoveDynamicFilter={onRemoveDynamicFilter}
            />
          </div>
        </CollapsibleSectionCard>
      </div>
    </div>
  );
}
