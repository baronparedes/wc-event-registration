import { useMemo } from 'react';

import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { FormInputField } from '@/components/ui/FormInputField';
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
import { TIME_SLOTS } from '@/pages/admin/service/constants';

export function AdminServiceAttendanceDataPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const serviceDate = searchParams.get('service_date') || '';
  const timeSlot = searchParams.get('time_slot') || '';
  const role = searchParams.get('role') || '';
  const isWalkIn = searchParams.get('is_walk_in') || '';
  const isLateTardy = searchParams.get('is_late_tardy') || '';

  const { data: attendanceData, isLoading } = useServiceAttendanceQuery({
    service_date: serviceDate || undefined,
    time_slot: timeSlot || undefined,
  });

  const filteredData = useMemo(() => {
    if (!attendanceData) return [];

    return attendanceData.filter((record) => {
      if (role && record.metadata?.role !== role) {
        return false;
      }
      if (isWalkIn === 'true' && !record.is_walk_in) {
        return false;
      }
      if (isLateTardy === 'true' && !record.is_override) {
        // assuming late_tardy means is_override in the dashboard calculation
        return false;
      }
      return true;
    });
  }, [attendanceData, role, isWalkIn, isLateTardy]);

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
      <AdminPageShell.Content className="mt-6 space-y-6">
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
          <FormInputField
            label="Role"
            value={role}
            placeholder="e.g. Usher"
            onChange={(e) => updateSearchParam('role', e.target.value)}
          />
          <FormSelectField
            label="Walk-in"
            value={isWalkIn}
            options={[
              { label: 'All', value: '' },
              { label: 'Yes', value: 'true' },
            ]}
            onChange={(val) => updateSearchParam('is_walk_in', val)}
          />
          <FormSelectField
            label="Late / Tardy"
            value={isLateTardy}
            options={[
              { label: 'All', value: '' },
              { label: 'Yes', value: 'true' },
            ]}
            onChange={(val) => updateSearchParam('is_late_tardy', val)}
          />
        </div>

        <div className="rounded-xl border border-border bg-surface">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <ListTable>
                <ListTableHead>
                  <ListTableHeaderRow>
                    <ListTableHeaderCell>Name</ListTableHeaderCell>
                    <ListTableHeaderCell>RFID</ListTableHeaderCell>
                    <ListTableHeaderCell>Date</ListTableHeaderCell>
                    <ListTableHeaderCell>Time Slot</ListTableHeaderCell>
                    <ListTableHeaderCell>Role</ListTableHeaderCell>
                    <ListTableHeaderCell>Checked In</ListTableHeaderCell>
                    <ListTableHeaderCell>Table</ListTableHeaderCell>
                  </ListTableHeaderRow>
                </ListTableHead>
                <ListTableBody>
                  {filteredData.length === 0 ? (
                    <ListTableRow>
                      <ListTableCell colSpan={7} className="py-8 text-center text-sm text-muted">
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
                        <ListTableCell>
                          <div className="flex flex-col gap-1 items-start">
                            <span>{(record.metadata?.role as string) || '—'}</span>
                            {record.is_walk_in && (
                              <span className="inline-flex items-center rounded-sm border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                                Walk-in
                              </span>
                            )}
                            {record.is_override && (
                              <span className="inline-flex items-center rounded-sm border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                                Late/Tardy
                              </span>
                            )}
                          </div>
                        </ListTableCell>
                        <ListTableCell>
                          {record.checked_in_at ? format(new Date(record.checked_in_at), 'p') : '—'}
                        </ListTableCell>
                        <ListTableCell>
                          {record.service_seats
                            ? `${record.service_seats.table_number || ''}`
                            : '—'}
                        </ListTableCell>
                      </ListTableRow>
                    ))
                  )}
                </ListTableBody>
              </ListTable>
            </div>
          )}
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
