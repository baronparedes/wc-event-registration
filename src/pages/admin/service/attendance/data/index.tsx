import { useEffect, useMemo, useRef, useState } from 'react';

import { format } from 'date-fns';
import { Loader2, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
import { useServiceAttendanceQuery } from '@/hooks/domain/services';
import { ServiceNavigationLinks } from '@/pages/admin/service/components/ServiceNavigationLinks';
import {
  SERVICE_ROLES,
  TIME_SLOTS,
  getNearestPreviousSunday,
} from '@/pages/admin/service/constants';

export function AdminServiceAttendanceDataPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const serviceStartDate = searchParams.get('service_start_date') || '';
  const serviceEndDate = searchParams.get('service_end_date') || '';
  const timeSlot = searchParams.get('time_slot') || '';
  const roleParam = searchParams.get('role') || '';
  const isWalkIn = searchParams.get('is_walk_in') || '';
  const isLateTardy = searchParams.get('is_late_tardy') || '';

  const selectedRoles = useMemo(() => {
    return roleParam
      ? roleParam
          .split(',')
          .map((r) => r.trim())
          .filter(Boolean)
      : [];
  }, [roleParam]);

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
    let nextRoles: string[];

    if (isSelected) {
      nextRoles = selectedRoles.filter((r) => r !== roleToToggle);
    } else {
      nextRoles = [...selectedRoles, roleToToggle];
    }

    updateSearchParam('role', nextRoles.join(','));
  };

  const selectedRoleLabel = useMemo(() => {
    if (selectedRoles.length === 0) return 'All roles';
    if (selectedRoles.length === 1) return selectedRoles[0];
    return `${selectedRoles.length} roles selected`;
  }, [selectedRoles]);

  const [fallbackDate] = useState(() => getNearestPreviousSunday());

  const queryFilters = useMemo(() => {
    const filters: {
      start_date?: string;
      end_date?: string;
      time_slot?: string;
      is_walk_in?: boolean;
      is_override?: boolean;
    } = {};
    // When no dates are selected, default to the nearest previous Sunday
    filters.start_date = serviceStartDate || fallbackDate;
    filters.end_date = serviceEndDate || fallbackDate;
    if (timeSlot) filters.time_slot = timeSlot;
    if (isWalkIn === 'true') filters.is_walk_in = true;
    else if (isWalkIn === 'false') filters.is_walk_in = false;
    if (isLateTardy === 'true') filters.is_override = true;
    else if (isLateTardy === 'false') filters.is_override = false;
    return filters;
  }, [serviceStartDate, serviceEndDate, timeSlot, fallbackDate, isWalkIn, isLateTardy]);

  const attendanceQuery = useServiceAttendanceQuery(queryFilters);

  const pages = attendanceQuery.data?.pages;
  const attendanceData = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const totalCount = pages?.[0]?.totalCount ?? 0;
  const hasNextPage = Boolean(attendanceQuery.hasNextPage);
  const isFetchingNextPage = Boolean(attendanceQuery.isFetchingNextPage);
  const fetchNextPage = attendanceQuery.fetchNextPage;
  const isLoading = attendanceQuery.isLoading;

  const filteredData = useMemo(() => {
    // Role is in JSONB metadata — filtered client-side
    if (selectedRoles.length === 0) return attendanceData;
    return attendanceData.filter((record) => {
      const recordRole = (record.metadata?.role as string) || '';
      return selectedRoles.some(
        (role) => recordRole.toLowerCase() === role.toLowerCase() || recordRole.includes(role),
      );
    });
  }, [attendanceData, selectedRoles]);

  // Infinite scroll sentinel
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    const currentElement = loadMoreRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const updateSearchParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const hasActiveFilters = Boolean(
    serviceStartDate ||
    serviceEndDate ||
    timeSlot ||
    selectedRoles.length > 0 ||
    isWalkIn ||
    isLateTardy,
  );

  const handleClearFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('service_start_date');
    newParams.delete('service_end_date');
    newParams.delete('time_slot');
    newParams.delete('role');
    newParams.delete('is_walk_in');
    newParams.delete('is_late_tardy');
    setSearchParams(newParams);
  };

  function getCountBadgeLabel() {
    if (filteredData.length === 0) return 'No records found';
    // When role filter is active the displayed count can differ from server total
    const hasRoleFilter = selectedRoles.length > 0;
    if (hasRoleFilter) {
      return `${filteredData.length} record${filteredData.length === 1 ? '' : 's'} found`;
    }
    if (hasNextPage) {
      return `Showing ${filteredData.length} of ${totalCount} records`;
    }
    return `${totalCount} record${totalCount === 1 ? '' : 's'} found`;
  }

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Service Attendance Data"
        description="View detailed service attendance records."
      />
      <ServiceNavigationLinks />
      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(6,minmax(0,1fr))_auto] sm:items-end">
          <FormInputField
            type="date"
            label="Start Date"
            value={serviceStartDate || fallbackDate}
            onChange={(e) => {
              const next = e.target.value;
              // When start date is cleared, also wipe end date
              if (!next) {
                const newParams = new URLSearchParams(searchParams);
                newParams.delete('service_start_date');
                newParams.delete('service_end_date');
                setSearchParams(newParams);
              } else {
                updateSearchParam('service_start_date', next);
              }
            }}
          />
          <FormInputField
            type="date"
            label="End Date"
            value={serviceStartDate ? serviceEndDate : fallbackDate}
            disabled={!serviceStartDate}
            onChange={(e) => updateSearchParam('service_end_date', e.target.value)}
          />
          <FormSelectField
            label="Time Slot"
            value={timeSlot}
            options={[
              { label: 'All', value: '' },
              ...TIME_SLOTS.map((ts) => ({ label: ts, value: ts })),
            ]}
            onChange={(val) => updateSearchParam('time_slot', val)}
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
            onToggleDropdown={() => setIsRoleDropdownOpen((prev) => !prev)}
            onCloseDropdown={() => setIsRoleDropdownOpen(false)}
            onClearSelection={() => updateSearchParam('role', '')}
            onToggleSelection={handleToggleRole}
          />
          <FormSelectField
            label="Walk-in"
            value={isWalkIn}
            options={[
              { label: 'All', value: '' },
              { label: 'Yes', value: 'true' },
              { label: 'No', value: 'false' },
            ]}
            onChange={(val) => updateSearchParam('is_walk_in', val)}
          />
          <FormSelectField
            label="Late / Tardy"
            value={isLateTardy}
            options={[
              { label: 'All', value: '' },
              { label: 'Yes', value: 'true' },
              { label: 'No', value: 'false' },
            ]}
            onChange={(val) => updateSearchParam('is_late_tardy', val)}
          />
          <div className="space-y-1.5">
            <Button
              type="button"
              onClick={handleClearFilters}
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

      <AdminPageShell.Content className="space-y-6">
        {!isLoading && (
          <div className="flex justify-center sm:justify-end">
            <Badge variant="secondary">{getCountBadgeLabel()}</Badge>
          </div>
        )}
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell>Name</ListTableHeaderCell>
                  <ListTableHeaderCell>RFID</ListTableHeaderCell>
                  <ListTableHeaderCell>Date</ListTableHeaderCell>
                  <ListTableHeaderCell>Time Slot</ListTableHeaderCell>
                  <ListTableHeaderCell>Role</ListTableHeaderCell>
                  <ListTableHeaderCell>Status</ListTableHeaderCell>
                  <ListTableHeaderCell>Checked In</ListTableHeaderCell>
                  <ListTableHeaderCell>Table</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>
                {filteredData.length === 0 ? (
                  <ListTableRow>
                    <ListTableCell colSpan={8} className="py-8 text-center text-sm text-muted">
                      No attendance records found matching filters.
                    </ListTableCell>
                  </ListTableRow>
                ) : (
                  filteredData.map((record) => (
                    <ListTableRow key={record.id}>
                      <ListTableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={record.user?.full_name || record.user?.nickname || 'Volunteer'}
                            avatarObjectKey={record.user?.avatar_object_key}
                            size="sm"
                            className="shrink-0"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-text">
                              {record.user?.full_name || '—'}
                            </span>
                            {record.user?.nickname && (
                              <span className="text-xs text-muted">{record.user.nickname}</span>
                            )}
                          </div>
                        </div>
                      </ListTableCell>
                      <ListTableCell className="font-mono text-xs">{record.rfid}</ListTableCell>
                      <ListTableCell>{record.service_date}</ListTableCell>
                      <ListTableCell>{record.time_slot}</ListTableCell>
                      <ListTableCell>{(record.metadata?.role as string) || '—'}</ListTableCell>
                      <ListTableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {record.is_walk_in && <Badge variant="secondary">Walk-in</Badge>}
                          {record.is_override && <Badge variant="accent">Late/Tardy</Badge>}
                          {!record.is_walk_in && !record.is_override && (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </div>
                      </ListTableCell>
                      <ListTableCell>
                        {record.checked_in_at ? format(new Date(record.checked_in_at), 'p') : '—'}
                      </ListTableCell>
                      <ListTableCell>
                        {record.service_seats ? `${record.service_seats.table_number || ''}` : '—'}
                      </ListTableCell>
                    </ListTableRow>
                  ))
                )}
              </ListTableBody>
            </ListTable>
          )}

          {/* Infinite scroll footer */}
          {!isLoading && filteredData.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-muted">{getCountBadgeLabel()}</p>
              {hasNextPage && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primaryOutline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
          {/* IntersectionObserver sentinel for auto-loading */}
          <div ref={loadMoreRef} className="h-1" />
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
