import { useEffect, useMemo, useRef, useState } from 'react';

import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Badge } from '@/components/ui/Badge';
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
import { SERVICE_ROLES, TIME_SLOTS } from '@/pages/admin/service/constants';

export function AdminServiceAttendanceDataPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const serviceDate = searchParams.get('service_date') || '';
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

  const selectedRoleLabel = useMemo(() => {
    if (selectedRoles.length === 0) return 'All roles';
    if (selectedRoles.length === 1) return selectedRoles[0];
    return `${selectedRoles.length} roles selected`;
  }, [selectedRoles]);

  const handleToggleRoleSelection = (toggledRole: string) => {
    const newRoles = selectedRoles.includes(toggledRole)
      ? selectedRoles.filter((r) => r !== toggledRole)
      : [...selectedRoles, toggledRole];
    updateSearchParam('role', newRoles.join(','));
  };

  const { data: attendanceData, isLoading } = useServiceAttendanceQuery({
    service_date: serviceDate || undefined,
    time_slot: timeSlot || undefined,
  });

  const filteredData = useMemo(() => {
    if (!attendanceData) return [];

    return attendanceData.filter((record) => {
      if (selectedRoles.length > 0) {
        const recordRole = (record.metadata?.role as string) || '';
        const matches = selectedRoles.some(
          (targetRole) => recordRole === targetRole || recordRole.includes(targetRole),
        );
        if (!matches) {
          return false;
        }
      }
      if (isWalkIn === 'true' && !record.is_walk_in) {
        return false;
      }
      if (isWalkIn === 'false' && record.is_walk_in) {
        return false;
      }
      if (isLateTardy === 'true' && !record.is_override) {
        // assuming late_tardy means is_override in the dashboard calculation
        return false;
      }
      if (isLateTardy === 'false' && record.is_override) {
        return false;
      }
      return true;
    });
  }, [attendanceData, selectedRoles, isWalkIn, isLateTardy]);

  const updateSearchParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Service Attendance Data"
        description="View detailed service attendance records."
      />
      <ServiceNavigationLinks />
      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <FormInputField
            type="date"
            label="Service Date"
            value={serviceDate}
            onChange={(e) => updateSearchParam('service_date', e.target.value)}
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
            onToggleSelection={handleToggleRoleSelection}
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
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content className="space-y-6">
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
                        <div className="flex flex-col">
                          <span className="font-medium text-text">
                            {record.user?.full_name || '—'}
                          </span>
                          {record.user?.nickname && (
                            <span className="text-xs text-muted">{record.user.nickname}</span>
                          )}
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
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
