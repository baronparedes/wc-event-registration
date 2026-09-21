import { format } from 'date-fns';

import type { ServiceAttendance } from './types';

export function escapeServiceCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export function formatServiceAttendanceStatus(record: ServiceAttendance): string {
  if (record.is_walk_in && record.is_override) {
    return 'Walk-in, Late / Tardy';
  }
  if (record.is_walk_in) {
    return 'Walk-in';
  }
  if (record.is_override) {
    return 'Late / Tardy';
  }
  return 'Regular';
}

export function formatCheckedInTime(timestamp: string | null | undefined): string {
  if (!timestamp) return '';
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return format(parsed, 'yyyy-MM-dd hh:mm:ss a');
}

export interface BuildServiceAttendanceCsvExportParams {
  records: ServiceAttendance[];
  startDate?: string;
  endDate?: string;
}

export function buildServiceAttendanceCsvExport(params: BuildServiceAttendanceCsvExportParams): {
  csvText: string;
  filename: string;
} {
  const { records, startDate, endDate } = params;

  // Sort records by service_date ascending, then by member full_name ascending
  // so the CSV mirrors the grouped-by-date-then-member view in the UI.
  const sortedRecords = [...records].sort((a, b) => {
    const dateCompare = (a.service_date ?? '').localeCompare(b.service_date ?? '');
    if (dateCompare !== 0) return dateCompare;
    return (a.user?.full_name ?? '').localeCompare(b.user?.full_name ?? '');
  });

  const rows: string[][] = [
    [
      'Full Name',
      'Nickname',
      'Member ID',
      'RFID',
      'Service Date',
      'Time Slot',
      'Role',
      'Status',
      'Checked In At',
      'Table',
      'Seat',
      'Area',
    ],
    ...sortedRecords.map((record) => {
      const role = (record.metadata?.role as string) || '';
      const tableNumber = record.service_seats?.table_number || '';
      const seatNumber = record.service_seats?.seat_number || '';
      const area = record.service_seats?.area || '';

      return [
        record.user?.full_name || '',
        record.user?.nickname || '',
        record.user?.member_id || '',
        record.rfid || '',
        record.service_date,
        record.time_slot,
        role,
        formatServiceAttendanceStatus(record),
        formatCheckedInTime(record.checked_in_at),
        tableNumber,
        seatNumber,
        area,
      ];
    }),
  ];

  const csvText = rows
    .map((row) => row.map((val) => escapeServiceCsvValue(val)).join(','))
    .join('\n');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  let filename = `service-attendance-${timestamp}.csv`;

  if (startDate && endDate) {
    if (startDate === endDate) {
      filename = `service-attendance-${startDate}-${timestamp}.csv`;
    } else {
      filename = `service-attendance-${startDate}-to-${endDate}-${timestamp}.csv`;
    }
  } else if (startDate) {
    filename = `service-attendance-${startDate}-${timestamp}.csv`;
  }

  return { csvText, filename };
}
