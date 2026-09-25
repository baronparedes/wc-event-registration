import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';

import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Users } from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { FormInputField } from '@/components/ui/FormInputField';
import { FormMultiSelectDropdownField } from '@/components/ui/FormMultiSelectDropdownField';
import { FormSelectField } from '@/components/ui/FormSelectField';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { SectionCard } from '@/components/ui/SectionCard';
import type { CommitmentDashboardStat } from '@/hooks/domain/services';
import { SERVICE_ROLES } from '@/pages/admin/services/constants';

export type VolunteerSortField =
  | 'full_name'
  | 'role'
  | 'category'
  | 'start_date'
  | 'committed'
  | 'attended'
  | 'absences'
  | 'excused'
  | 'wi_9am_3pm'
  | 'wi_12nn'
  | 'attendance_score';

export type SortOrder = 'asc' | 'desc';

interface VolunteerListTableProps {
  stats: CommitmentDashboardStat[];
  totalVolunteers: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedRoles: string[];
  onSelectedRolesChange: (roles: string[]) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  roles: string[];
  categories: string[];
  isLoading: boolean;
  onRowClick?: (stat: CommitmentDashboardStat) => void;
}

export const VolunteerListTable = forwardRef<HTMLDivElement, VolunteerListTableProps>(
  (
    {
      stats,
      totalVolunteers,
      searchQuery,
      onSearchChange,
      selectedRoles,
      onSelectedRolesChange,
      categoryFilter,
      onCategoryFilterChange,
      roles,
      categories,
      isLoading,
      onRowClick,
    },
    ref,
  ) => {
    const [sortBy, setSortBy] = useState<VolunteerSortField>('attendance_score');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const roleDropdownRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!isRoleDropdownOpen) return;

      function handleDocumentMouseDown(event: MouseEvent) {
        const target = event.target;
        if (!(target instanceof Node)) return;
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

    const handleToggleRole = (roleToToggle: string) => {
      const isSelected = selectedRoles.includes(roleToToggle);
      const nextRoles = isSelected
        ? selectedRoles.filter((r) => r !== roleToToggle)
        : [...selectedRoles, roleToToggle];
      onSelectedRolesChange(nextRoles);
    };

    const selectedRoleLabel = useMemo(() => {
      if (selectedRoles.length === 0) return 'All Roles';
      if (selectedRoles.length === 1) return selectedRoles[0];
      return `${selectedRoles.length} roles selected`;
    }, [selectedRoles]);

    const handleSort = (field: VolunteerSortField) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(field);
        const isText = ['full_name', 'role', 'category', 'start_date'].includes(field);
        setSortOrder(isText ? 'asc' : 'desc');
      }
    };

    const sortedStats = useMemo(() => {
      return [...stats].sort((a, b) => {
        let comparison: number;
        switch (sortBy) {
          case 'full_name':
            comparison = a.full_name.localeCompare(b.full_name);
            break;
          case 'role':
            comparison = (a.role || '').localeCompare(b.role || '');
            break;
          case 'category':
            comparison = (a.category || '').localeCompare(b.category || '');
            break;
          case 'start_date':
            comparison = (a.start_date || '').localeCompare(b.start_date || '');
            break;
          case 'committed':
            comparison = a.committed - b.committed;
            break;
          case 'attended':
            comparison = a.attended - b.attended;
            break;
          case 'absences':
            comparison = a.absences - b.absences;
            break;
          case 'excused':
            comparison = a.excused - b.excused;
            break;
          case 'wi_9am_3pm':
            comparison = a.wi_9am_3pm - b.wi_9am_3pm;
            break;
          case 'wi_12nn':
            comparison = a.wi_12nn - b.wi_12nn;
            break;
          case 'attendance_score':
          default:
            comparison = a.attendance_score - b.attendance_score;
            break;
        }

        if (comparison === 0) {
          return a.full_name.localeCompare(b.full_name);
        }

        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }, [stats, sortBy, sortOrder]);

    const renderSortIcon = (field: VolunteerSortField) => {
      if (sortBy === field) {
        return sortOrder === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-primary" />
        );
      }
      return <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-100" />;
    };

    const categoryOptions = useMemo(
      () => [
        { value: 'All Categories', label: 'All Categories' },
        ...categories.map((c) => ({ value: c, label: c })),
      ],
      [categories],
    );

    const allRoleOptions = useMemo(() => {
      const combined = Array.from(new Set([...SERVICE_ROLES, ...roles]));
      return combined.map((r) => ({ value: r, label: r }));
    }, [roles]);

    return (
      <SectionCard
        wrapperClassName="rounded-2xl border border-border bg-surface p-0 shadow-sm overflow-hidden"
        title={
          <div className="flex items-center gap-2.5 px-6 pt-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <span className="font-heading text-lg font-semibold text-text">Volunteer List</span>
          </div>
        }
        headerAction={
          <div className="px-6 pt-5">
            <Badge variant="default">{totalVolunteers} volunteers</Badge>
          </div>
        }
      >
        <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:px-6">
          <FormInputField
            ariaLabel="Search name or nickname"
            placeholder="Search name or nickname..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1"
          />
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <FormSelectField
              ariaLabel="Filter by Category"
              value={categoryFilter}
              onChange={onCategoryFilterChange}
              options={categoryOptions}
              selectClassName="w-full sm:w-[180px]"
            />
            <FormMultiSelectDropdownField
              triggerAriaLabel="Filter by Role"
              optionsAriaLabel="Role options"
              selectedLabel={selectedRoleLabel}
              options={allRoleOptions}
              selectedValues={selectedRoles}
              isOpen={isRoleDropdownOpen}
              containerRef={roleDropdownRef}
              clearButtonLabel="All Roles"
              buttonClassName="rounded-xl px-3 py-2 text-sm leading-6"
              className="w-full sm:w-[180px]"
              onToggleDropdown={() => setIsRoleDropdownOpen((prev) => !prev)}
              onCloseDropdown={() => setIsRoleDropdownOpen(false)}
              onClearSelection={() => onSelectedRolesChange([])}
              onToggleSelection={handleToggleRole}
            />
          </div>
        </div>

        <ListTable>
          <ListTableHead>
            <ListTableHeaderRow>
              <ListTableHeaderCell className="sticky left-0 z-20 bg-white shadow-[1px_0_0_0_var(--color-border)]">
                <button
                  type="button"
                  onClick={() => handleSort('full_name')}
                  className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Volunteer</span>
                  {renderSortIcon('full_name')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell>
                <button
                  type="button"
                  onClick={() => handleSort('role')}
                  className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Role</span>
                  {renderSortIcon('role')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell>
                <button
                  type="button"
                  onClick={() => handleSort('category')}
                  className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Category</span>
                  {renderSortIcon('category')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell>
                <button
                  type="button"
                  onClick={() => handleSort('start_date')}
                  className="group inline-flex items-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Start Date</span>
                  {renderSortIcon('start_date')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort('attendance_score')}
                  className="group inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Attendance</span>
                  {renderSortIcon('attendance_score')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort('committed')}
                  className="group inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Committed</span>
                  {renderSortIcon('committed')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort('attended')}
                  className="group inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Attended</span>
                  {renderSortIcon('attended')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort('absences')}
                  className="group inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Absences</span>
                  {renderSortIcon('absences')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort('excused')}
                  className="group inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>Excused</span>
                  {renderSortIcon('excused')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort('wi_9am_3pm')}
                  className="group inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>WI 9AM/3PM</span>
                  {renderSortIcon('wi_9am_3pm')}
                </button>
              </ListTableHeaderCell>
              <ListTableHeaderCell className="text-center">
                <button
                  type="button"
                  onClick={() => handleSort('wi_12nn')}
                  className="group inline-flex items-center justify-center gap-1 font-semibold uppercase tracking-wider text-muted hover:text-text transition-colors focus:outline-none"
                >
                  <span>WI 12NN</span>
                  {renderSortIcon('wi_12nn')}
                </button>
              </ListTableHeaderCell>
            </ListTableHeaderRow>
          </ListTableHead>
          <ListTableBody>
            {sortedStats.map((stat) => (
              <ListTableRow
                key={stat.user_id}
                className={`group ${onRowClick ? 'cursor-pointer hover:bg-surface-hover' : ''}`}
                onClick={() => onRowClick?.(stat)}
              >
                <ListTableCell
                  className={`sticky left-0 z-10 bg-white group-even:bg-slate-100 group-hover:bg-slate-300 shadow-[1px_0_0_0_var(--color-border)] whitespace-nowrap transition-colors ${onRowClick ? 'group-hover:bg-slate-200' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={stat.full_name}
                      avatarObjectKey={stat.avatar_object_key}
                      size="sm"
                      className="h-8 w-8 text-xs shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-heading font-semibold text-text truncate">
                        {stat.full_name}
                      </div>
                      <div className="text-xs text-muted truncate">{stat.nickname || '-'}</div>
                    </div>
                  </div>
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap">
                  {stat.role ? (
                    <Badge variant="outline" className="text-xs">
                      {stat.role}
                    </Badge>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-text">
                  {stat.category || '-'}
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-muted">
                  {stat.start_date || '-'}
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-center">
                  <Badge
                    variant={stat.attendance_score < 0 ? 'destructive' : 'default'}
                    className="font-bold"
                  >
                    {stat.attendance_score}
                  </Badge>
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-center text-text font-medium">
                  {stat.committed}
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-center">
                  <Badge variant="secondary">{stat.attended}</Badge>
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-center">
                  {stat.absences > 0 ? (
                    <Badge variant="destructive">{stat.absences}</Badge>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-center">
                  {stat.excused > 0 ? (
                    <Badge variant="accent">{stat.excused}</Badge>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-center">
                  {stat.wi_9am_3pm > 0 ? (
                    <Badge variant="outline">+{stat.wi_9am_3pm}</Badge>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </ListTableCell>
                <ListTableCell className="whitespace-nowrap text-center">
                  {stat.wi_12nn > 0 ? (
                    <Badge variant="outline">+{stat.wi_12nn}</Badge>
                  ) : (
                    <span className="text-muted">0</span>
                  )}
                </ListTableCell>
              </ListTableRow>
            ))}

            {sortedStats.length === 0 && !isLoading && (
              <ListTableRow hover="none">
                <ListTableCell colSpan={11} className="py-12">
                  <EmptyState
                    icon={<Users className="h-8 w-8 text-muted" />}
                    title="No volunteers found"
                    description="No volunteers matched your search criteria or filters."
                  />
                </ListTableCell>
              </ListTableRow>
            )}
          </ListTableBody>
        </ListTable>

        <div ref={ref} className="h-4 w-full" />
        {isLoading && (
          <div className="flex justify-center p-6 border-t border-border">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </SectionCard>
    );
  },
);

VolunteerListTable.displayName = 'VolunteerListTable';
