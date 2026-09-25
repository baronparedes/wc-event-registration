import { useEffect, useMemo, useRef, useState } from 'react';

import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Badge } from '@/components/ui/Badge';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { ROUTE_PATHS } from '@/config/constants';
import { useServiceAttendanceQuery } from '@/hooks/domain/services';
import { useInfiniteScrollTrigger } from '@/hooks/utils';
import { useIsMobileViewport } from '@/hooks/utils/useIsMobileViewport';
import { ServiceNavigationLinks } from '@/pages/admin/services/components/ServiceNavigationLinks';
import { getNearestPreviousSunday } from '@/pages/admin/services/constants';

import {
  AttendanceDateGroupHeader,
  AttendanceDateMobileGroupHeader,
  AttendanceFilters,
  AttendanceMobileCard,
  AttendanceTableFooter,
  AttendanceTableRow,
  ExportServiceAttendanceButton,
} from './components';

export function AdminServiceAttendanceDataPage() {
  const isMobileViewport = useIsMobileViewport();
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
    const nextRoles = isSelected
      ? selectedRoles.filter((r) => r !== roleToToggle)
      : [...selectedRoles, roleToToggle];
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

  // Two-level grouping: service_date → member → [records]
  // Within each member group records are sorted by time_slot so check-ins appear in order.
  const groupedByDate = useMemo(() => {
    // First pass: bucket records into date → memberKey → records[]
    type MemberGroup = { memberKey: string; records: typeof filteredData };
    const dateMap = new Map<string, Map<string, MemberGroup>>();

    for (const record of filteredData) {
      const date = record.service_date ?? 'Unknown';
      // Use rfid as the member key (unique per member in service domain)
      const memberKey = record.rfid ?? record.id;

      if (!dateMap.has(date)) dateMap.set(date, new Map());
      const memberMap = dateMap.get(date)!;

      if (!memberMap.has(memberKey)) {
        memberMap.set(memberKey, { memberKey, records: [] });
      }
      memberMap.get(memberKey)!.records.push(record);
    }

    // Second pass: sort dates asc, members within each date by full_name asc,
    // and individual check-ins within each member group by time_slot asc.
    return Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, memberMap]) => ({
        date,
        memberGroups: Array.from(memberMap.values())
          .sort((a, b) =>
            (a.records[0]?.user?.full_name ?? '').localeCompare(
              b.records[0]?.user?.full_name ?? '',
            ),
          )
          .map((mg) => ({
            ...mg,
            records: [...mg.records].sort((a, b) => {
              const aTime = a.checked_in_at ? new Date(a.checked_in_at).getTime() : Infinity;
              const bTime = b.checked_in_at ? new Date(b.checked_in_at).getTime() : Infinity;
              return aTime - bTime;
            }),
          })),
      }));
  }, [filteredData]);

  // Infinite scroll sentinel
  const { sentinelRef } = useInfiniteScrollTrigger({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  const updateSearchParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleClearStartDate = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('service_start_date');
    newParams.delete('service_end_date');
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
        actions={
          <ExportServiceAttendanceButton
            records={filteredData}
            startDate={serviceStartDate || fallbackDate}
            endDate={serviceEndDate || fallbackDate}
            disabled={isLoading}
          />
        }
        breadcrumbs={[{ label: 'Services', to: ROUTE_PATHS.adminServices }, { label: 'Data' }]}
      />
      <ServiceNavigationLinks />

      <AttendanceFilters
        serviceStartDate={serviceStartDate}
        serviceEndDate={serviceEndDate}
        timeSlot={timeSlot}
        isWalkIn={isWalkIn}
        isLateTardy={isLateTardy}
        selectedRoles={selectedRoles}
        selectedRoleLabel={selectedRoleLabel}
        isRoleDropdownOpen={isRoleDropdownOpen}
        roleDropdownRef={roleDropdownRef}
        hasActiveFilters={hasActiveFilters}
        fallbackDate={fallbackDate}
        onUpdateSearchParam={updateSearchParam}
        onClearFilters={handleClearFilters}
        onToggleRoleDropdown={() => setIsRoleDropdownOpen((prev) => !prev)}
        onCloseRoleDropdown={() => setIsRoleDropdownOpen(false)}
        onToggleRole={handleToggleRole}
        onClearStartDate={handleClearStartDate}
      />

      <AdminPageShell.Content className="space-y-6">
        {!isLoading && (
          <div className="flex justify-center sm:justify-end">
            <Badge variant="secondary">{getCountBadgeLabel()}</Badge>
          </div>
        )}
        <div
          className={
            isMobileViewport
              ? ''
              : 'overflow-hidden rounded-2xl border border-border bg-surface shadow-xs'
          }
        >
          {isLoading ? (
            <div
              className={`flex h-64 items-center justify-center ${isMobileViewport ? 'rounded-2xl border border-border bg-surface shadow-xs' : ''}`}
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isMobileViewport ? (
            <div className="space-y-4 pb-4">
              {filteredData.length === 0 ? (
                <div className="rounded-2xl border border-border bg-surface shadow-xs py-12 text-center text-sm text-muted">
                  No attendance records found matching filters.
                </div>
              ) : (
                groupedByDate.map(({ date, memberGroups }) => {
                  const totalRecords = memberGroups.reduce((sum, mg) => sum + mg.records.length, 0);

                  return (
                    <div key={`group-${date}`} className="mb-6 last:mb-0">
                      <AttendanceDateMobileGroupHeader
                        date={date}
                        memberCount={memberGroups.length}
                        totalRecords={totalRecords}
                      />
                      <div className="space-y-4">
                        {memberGroups.map(({ memberKey, records }) => (
                          <AttendanceMobileCard
                            key={memberKey}
                            memberKey={memberKey}
                            records={records}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell>Name</ListTableHeaderCell>
                  <ListTableHeaderCell>RFID</ListTableHeaderCell>
                  <ListTableHeaderCell>Role</ListTableHeaderCell>
                  <ListTableHeaderCell>Date</ListTableHeaderCell>
                  <ListTableHeaderCell>Time Slot</ListTableHeaderCell>
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
                  groupedByDate.flatMap(({ date, memberGroups }) => {
                    const totalRecords = memberGroups.reduce(
                      (sum, mg) => sum + mg.records.length,
                      0,
                    );
                    return [
                      <AttendanceDateGroupHeader
                        key={`group-${date}`}
                        date={date}
                        memberCount={memberGroups.length}
                        totalRecords={totalRecords}
                      />,
                      ...memberGroups.map(({ memberKey, records }) => (
                        <AttendanceTableRow
                          key={memberKey}
                          memberKey={memberKey}
                          records={records}
                        />
                      )),
                    ];
                  })
                )}
              </ListTableBody>
            </ListTable>
          )}

          <AttendanceTableFooter
            filteredDataLength={filteredData.length}
            countBadgeLabel={getCountBadgeLabel()}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            loadMoreRef={sentinelRef}
            onLoadMore={() => fetchNextPage()}
          />
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
