import { useMemo, useState } from 'react';

import { endOfMonth, format, parseISO } from 'date-fns';
import { SearchX, UserX } from 'lucide-react';

import {
  Avatar,
  Badge,
  Button,
  ContactButtons,
  Dialog,
  EmptyState,
  FormSelectField,
  LoadingState,
  SearchInputField,
} from '@/components/ui';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { env } from '@/config/env';
import { useMissedServiceCommitmentsQuery } from '@/hooks/domain/services';

import { type FilterMode, type ServiceTimeSlot, TIME_SLOTS } from '../constants';
import { ExportMissedCommitmentsButton } from './ExportMissedCommitmentsButton';

export interface MissedCommitmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterMode: FilterMode;
  selectedSunday?: string;
  selectedYear?: number;
  selectedMonth?: number;
  initialTimeSlot?: ServiceTimeSlot | 'All';
  initialRole?: string;
}

export function MissedCommitmentsModal({
  isOpen,
  onClose,
  filterMode,
  selectedSunday,
  selectedYear,
  selectedMonth,
  initialTimeSlot = 'All',
  initialRole = 'All Roles',
}: MissedCommitmentsModalProps) {
  const [selectedSlot, setSelectedSlot] = useState<ServiceTimeSlot | 'All'>(initialTimeSlot);
  const [statusFilter, setStatusFilter] = useState<'All' | 'absent' | 'excused'>('All');
  const [selectedRole, setSelectedRole] = useState<string>(initialRole);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync state during render when initial props change
  const [prevInitialTimeSlot, setPrevInitialTimeSlot] = useState(initialTimeSlot);
  const [prevInitialRole, setPrevInitialRole] = useState(initialRole);

  if (prevInitialTimeSlot !== initialTimeSlot) {
    setPrevInitialTimeSlot(initialTimeSlot);
    setSelectedSlot(initialTimeSlot);
  }
  if (prevInitialRole !== initialRole) {
    setPrevInitialRole(initialRole);
    setSelectedRole(initialRole);
  }

  // Date range calculation for query and export
  const { startDate, endDate, dateSubtitle } = useMemo(() => {
    if (filterMode === 'sunday' && selectedSunday) {
      const parsed = parseISO(selectedSunday);
      return {
        startDate: selectedSunday,
        endDate: selectedSunday,
        dateSubtitle: !isNaN(parsed.getTime())
          ? format(parsed, 'EEEE, MMMM d, yyyy')
          : selectedSunday,
      };
    }
    if (filterMode === 'month' && selectedYear && selectedMonth) {
      const monthDate = new Date(selectedYear, selectedMonth - 1, 1);
      return {
        startDate: format(monthDate, 'yyyy-MM-dd'),
        endDate: format(endOfMonth(monthDate), 'yyyy-MM-dd'),
        dateSubtitle: format(monthDate, 'MMMM yyyy'),
      };
    }
    if (filterMode === 'annual' && selectedYear) {
      return {
        startDate: `${selectedYear}-01-01`,
        endDate: `${selectedYear}-12-31`,
        dateSubtitle: `Year ${selectedYear}`,
      };
    }
    return {
      startDate: undefined,
      endDate: undefined,
      dateSubtitle: '',
    };
  }, [filterMode, selectedSunday, selectedYear, selectedMonth]);

  const queryFilters = useMemo(
    () => ({
      sunday_date: filterMode === 'sunday' ? selectedSunday : undefined,
      year: filterMode !== 'sunday' ? selectedYear : undefined,
      month: filterMode === 'month' ? selectedMonth : undefined,
      excuse_event_id: env.excuseEventId,
    }),
    [filterMode, selectedSunday, selectedYear, selectedMonth],
  );

  const { data: rawRecords = [], isLoading } = useMissedServiceCommitmentsQuery(
    queryFilters,
    isOpen,
  );

  // Extract unique roles for dropdown filter
  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    rawRecords.forEach((r) => {
      if (r.role) roles.add(r.role);
    });
    return Array.from(roles).sort();
  }, [rawRecords]);

  // Apply in-memory filters for slot, role, status, search
  const filteredRecords = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return rawRecords.filter((record) => {
      // Slot filter
      if (selectedSlot !== 'All' && record.time_slot !== selectedSlot) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'All' && record.status !== statusFilter) {
        return false;
      }
      // Role filter
      if (selectedRole !== 'All Roles' && record.role !== selectedRole) {
        return false;
      }
      // Search query
      if (normalizedQuery) {
        const matchesName = record.full_name.toLowerCase().includes(normalizedQuery);
        const matchesNick = record.nickname?.toLowerCase().includes(normalizedQuery);
        const matchesMemberId = record.member_id.toLowerCase().includes(normalizedQuery);
        const matchesRole = record.role.toLowerCase().includes(normalizedQuery);
        const matchesPhone = record.phone?.toLowerCase().includes(normalizedQuery);
        if (!matchesName && !matchesNick && !matchesMemberId && !matchesRole && !matchesPhone) {
          return false;
        }
      }
      return true;
    });
  }, [rawRecords, selectedSlot, statusFilter, selectedRole, searchQuery]);

  // Group filtered records by volunteer
  const groupedVolunteers = useMemo(() => {
    interface GroupedMissedCommitment {
      service_date: string;
      time_slot: string;
      status: 'absent' | 'excused';
      role: string;
    }

    interface GroupedVolunteer {
      user_id: string;
      member_id: string;
      full_name: string;
      nickname: string | null;
      phone: string | null;
      avatar_object_key: string | null;
      category?: string | null;
      roles: string[];
      commitments: GroupedMissedCommitment[];
      totalAbsent: number;
      totalExcused: number;
    }

    const map = new Map<string, GroupedVolunteer>();

    filteredRecords.forEach((record) => {
      const key = record.user_id || record.member_id || record.full_name;
      let existing = map.get(key);

      if (!existing) {
        existing = {
          user_id: record.user_id,
          member_id: record.member_id,
          full_name: record.full_name,
          nickname: record.nickname,
          phone: record.phone,
          avatar_object_key: record.avatar_object_key,
          category: record.category,
          roles: [],
          commitments: [],
          totalAbsent: 0,
          totalExcused: 0,
        };
        map.set(key, existing);
      }

      if (record.role && !existing.roles.includes(record.role)) {
        existing.roles.push(record.role);
      }

      existing.commitments.push({
        service_date: record.service_date,
        time_slot: record.time_slot,
        status: record.status,
        role: record.role,
      });

      if (record.status === 'absent') {
        existing.totalAbsent += 1;
      } else if (record.status === 'excused') {
        existing.totalExcused += 1;
      }
    });

    // Sort commitments inside each volunteer chronologically
    map.forEach((volunteer) => {
      volunteer.commitments.sort((a, b) => {
        if (a.service_date !== b.service_date) {
          return a.service_date.localeCompare(b.service_date);
        }
        return (
          TIME_SLOTS.indexOf(a.time_slot as ServiceTimeSlot) -
          TIME_SLOTS.indexOf(b.time_slot as ServiceTimeSlot)
        );
      });
    });

    return Array.from(map.values());
  }, [filteredRecords]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      size="7xl"
      containerClassName="overflow-x-hidden"
      className="max-md:max-w-[calc(100vw-2rem)] min-w-0"
    >
      <Dialog.Header showCloseButton>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between pr-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-danger/10 text-danger">
                <UserX className="h-4 w-4" />
              </div>
              <Dialog.Title className="text-xl font-bold font-heading text-text">
                Missed Commitments
              </Dialog.Title>
              <Badge variant="destructive" className="ml-1 text-xs">
                {groupedVolunteers.length}{' '}
                {groupedVolunteers.length === 1 ? 'Volunteer' : 'Volunteers'}
              </Badge>
              {filteredRecords.length !== groupedVolunteers.length && (
                <Badge variant="outline" className="text-xs font-normal">
                  {filteredRecords.length} {filteredRecords.length === 1 ? 'slot' : 'slots'}
                </Badge>
              )}
            </div>
            {dateSubtitle && <h1 className="text-muted mt-1">{dateSubtitle}</h1>}
          </div>
          <div className="mt-2 sm:mt-0">
            <ExportMissedCommitmentsButton
              records={filteredRecords}
              startDate={startDate}
              endDate={endDate}
              disabled={isLoading || filteredRecords.length === 0}
            />
          </div>
        </div>
      </Dialog.Header>

      <Dialog.Body className="mt-4 flex flex-col gap-4 min-w-0 max-w-full">
        {/* Standard Filters Toolbar matching /admin/members */}
        <div className="rounded-xl border border-border bg-surface p-3 sm:p-4">
          <div
            className={`grid gap-3 sm:items-end ${
              availableRoles.length > 0
                ? 'sm:grid-cols-2 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]'
                : 'sm:grid-cols-2 md:grid-cols-[minmax(0,2fr)_repeat(2,minmax(0,1fr))_auto]'
            }`}
          >
            <SearchInputField
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery('')}
              placeholder="Search by name, role, phone..."
            />
            <div className="flex w-full flex-col gap-1 text-sm text-muted">
              <FormSelectField
                ariaLabel="Slot"
                value={selectedSlot}
                onChange={(val) => setSelectedSlot(val as ServiceTimeSlot | 'All')}
                options={[
                  { value: 'All', label: 'All Slots' },
                  ...TIME_SLOTS.map((slot) => ({ value: slot, label: slot })),
                ]}
              />
            </div>
            <div className="flex w-full flex-col gap-1 text-sm text-muted">
              <FormSelectField
                ariaLabel="Status"
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as 'All' | 'absent' | 'excused')}
                options={[
                  { value: 'All', label: 'All Statuses' },
                  { value: 'absent', label: 'Unexcused' },
                  { value: 'excused', label: 'Excused' },
                ]}
              />
            </div>
            {availableRoles.length > 0 && (
              <div className="flex w-full flex-col gap-1 text-sm text-muted">
                <FormSelectField
                  ariaLabel="Role"
                  value={selectedRole}
                  onChange={setSelectedRole}
                  options={[
                    { value: 'All Roles', label: 'All Roles' },
                    ...availableRoles.map((role) => ({ value: role, label: role })),
                  ]}
                />
              </div>
            )}
            <Button
              type="button"
              variant="primaryOutline"
              className="w-full sm:w-auto"
              onClick={() => {
                setSelectedSlot('All');
                setStatusFilter('All');
                setSelectedRole('All Roles');
                setSearchQuery('');
              }}
              disabled={
                selectedSlot === 'All' &&
                statusFilter === 'All' &&
                selectedRole === 'All Roles' &&
                searchQuery.trim().length === 0
              }
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Content Table / Empty / Loading */}
        {isLoading ? (
          <div className="flex h-56 items-center justify-center">
            <LoadingState message="Loading missed commitments..." />
          </div>
        ) : groupedVolunteers.length === 0 ? (
          <EmptyState
            icon={<SearchX className="h-8 w-8 text-muted" />}
            title="No missed commitments found"
            description={
              rawRecords.length === 0
                ? 'All committed volunteers attended their scheduled service slots.'
                : 'No volunteers match your current search or filter criteria.'
            }
          />
        ) : (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-3 px-1 text-xs">
              <span className="font-semibold text-muted">Legend:</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger shrink-0" />
                <span className="font-medium text-text">Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent shrink-0" />
                <span className="font-medium text-text">Excused</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-border bg-background">
              <ListTable>
                <ListTableHead>
                  <ListTableHeaderRow>
                    <ListTableHeaderCell>Volunteer</ListTableHeaderCell>
                    <ListTableHeaderCell>Role</ListTableHeaderCell>
                    <ListTableHeaderCell>Missed Commitments</ListTableHeaderCell>
                    <ListTableHeaderCell>Contact Number</ListTableHeaderCell>
                  </ListTableHeaderRow>
                </ListTableHead>
                <ListTableBody>
                  {groupedVolunteers.map((volunteer) => {
                    const key = volunteer.user_id || volunteer.member_id || volunteer.full_name;
                    return (
                      <ListTableRow key={key}>
                        {/* Volunteer Name & Avatar */}
                        <ListTableCell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              name={volunteer.full_name}
                              avatarObjectKey={volunteer.avatar_object_key}
                              size="sm"
                              className="h-8 w-8 shrink-0 text-xs"
                            />
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate font-semibold text-text text-sm">
                                  {volunteer.full_name}
                                </span>
                                {volunteer.nickname && (
                                  <span className="text-xs text-muted shrink-0">
                                    ({volunteer.nickname})
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-muted">
                                {volunteer.member_id}
                                {volunteer.category ? ` • ${volunteer.category}` : ''}
                              </span>
                            </div>
                          </div>
                        </ListTableCell>

                        {/* Role */}
                        <ListTableCell>
                          <div className="flex flex-wrap gap-1">
                            {volunteer.roles.length > 0 ? (
                              volunteer.roles.map((role) => (
                                <Badge key={role} variant="default" className="text-xs">
                                  {role}
                                </Badge>
                              ))
                            ) : (
                              <Badge variant="default" className="text-xs">
                                Volunteer
                              </Badge>
                            )}
                          </div>
                        </ListTableCell>

                        {/* Missed Commitments (Grouped Slots/Dates) */}
                        <ListTableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {volunteer.commitments.length > 1 && (
                              <span className="rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-surface-hover dark:text-text border border-border/40">
                                {volunteer.commitments.length}×
                              </span>
                            )}
                            {volunteer.commitments.map((commitment, idx) => {
                              const isExcused = commitment.status === 'excused';
                              const datePrefix =
                                filterMode !== 'sunday'
                                  ? `${format(parseISO(commitment.service_date), 'MMM d')} • `
                                  : '';
                              return (
                                <Badge
                                  key={`${commitment.service_date}-${commitment.time_slot}-${idx}`}
                                  variant={isExcused ? 'accent' : 'destructive'}
                                  className="text-xs font-medium py-0.5 px-2"
                                  title={isExcused ? 'Excused' : 'Absent'}
                                >
                                  {datePrefix}
                                  {commitment.time_slot}
                                </Badge>
                              );
                            })}
                          </div>
                        </ListTableCell>

                        {/* Contact Number */}
                        <ListTableCell onClick={(e) => e.stopPropagation()}>
                          {volunteer.phone ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-text">
                                {volunteer.phone}
                              </span>
                              <ContactButtons
                                phone={volunteer.phone}
                                size="sm"
                                variant="icon"
                                showCopyFallback={false}
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted">—</span>
                          )}
                        </ListTableCell>
                      </ListTableRow>
                    );
                  })}
                </ListTableBody>
              </ListTable>
            </div>
          </div>
        )}
      </Dialog.Body>
    </Dialog>
  );
}
