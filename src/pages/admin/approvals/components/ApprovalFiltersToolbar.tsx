import { AdminPageShell } from '@/components/layout';
import { ButtonGroup, FormSelectField, SearchInputField } from '@/components/ui';
import type { ApprovalEntityType, ApprovalStatus } from '@/lib/domain/approvals';

export interface ApprovalFiltersToolbarProps {
  selectedStatus: ApprovalStatus | 'all';
  onStatusChange: (status: ApprovalStatus | 'all') => void;
  selectedEntity: ApprovalEntityType | 'all';
  onEntityChange: (entity: ApprovalEntityType | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchClear: () => void;
}

export function ApprovalFiltersToolbar({
  selectedStatus,
  onStatusChange,
  selectedEntity,
  onEntityChange,
  searchQuery,
  onSearchChange,
  onSearchClear,
}: ApprovalFiltersToolbarProps) {
  return (
    <AdminPageShell.Filters>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ButtonGroup
          size="sm"
          value={selectedStatus}
          onChange={(val) => onStatusChange(val as ApprovalStatus | 'all')}
          options={[
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Declined' },
            { value: 'all', label: 'All' },
          ]}
        />

        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="w-full sm:w-48">
            <FormSelectField
              ariaLabel="Request Type"
              value={selectedEntity}
              onChange={(value) => onEntityChange(value as ApprovalEntityType | 'all')}
              options={[
                { value: 'all', label: 'All Request Types' },
                { value: 'form_submission', label: 'Form Registrations' },
                { value: 'service_excuse', label: 'Long Leave Requests' },
                { value: 'recruitment_endorsement', label: 'Endorsements' },
              ]}
            />
          </div>

          <div className="w-full sm:w-64">
            <SearchInputField
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onClear={onSearchClear}
              placeholder="Search requester or title..."
            />
          </div>
        </div>
      </div>
    </AdminPageShell.Filters>
  );
}
