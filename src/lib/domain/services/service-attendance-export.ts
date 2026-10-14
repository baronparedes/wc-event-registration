import { format } from 'date-fns';

import type { MissedServiceCommitment, ServiceAttendance } from './types';

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
    // ⚡ Bolt: Performance Improvement
    // Use native string comparison for ISO-8601 dates instead of localeCompare
    // to avoid significant overhead in the sorting loop.
    const aDate = a.service_date ?? '';
    const bDate = b.service_date ?? '';
    const dateCompare = aDate < bDate ? -1 : aDate > bDate ? 1 : 0;

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

export interface BuildFailedServiceAttendanceCsvExportParams {
  failedRows: Array<{
    row_number: number;
    errors: string[];
    originalData: Record<string, string>;
  }>;
}

export function buildFailedServiceAttendanceCsvExport(
  params: BuildFailedServiceAttendanceCsvExportParams,
): {
  csvText: string;
  filename: string;
} {
  const { failedRows } = params;

  const originalKeySet = new Set<string>();
  failedRows.forEach((row) => {
    Object.keys(row.originalData).forEach((k) => originalKeySet.add(k));
  });

  const preferredOrder = ['RFID', 'Date', 'Time', 'Time_Slot', 'Table', 'Name', 'Role'];
  const sortedOriginalKeys = [
    ...preferredOrder.filter((k) => originalKeySet.has(k)),
    ...Array.from(originalKeySet).filter((k) => !preferredOrder.includes(k)),
  ];

  const headers = ['Row', 'Errors', ...sortedOriginalKeys];

  const rows: string[][] = [
    headers,
    ...failedRows.map((row) => {
      return [
        String(row.row_number),
        row.errors.join('; '),
        ...sortedOriginalKeys.map((k) => row.originalData[k] ?? ''),
      ];
    }),
  ];

  const csvText = rows
    .map((row) => row.map((val) => escapeServiceCsvValue(val)).join(','))
    .join('\n');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  const filename = `failed-service-attendance-migration-${timestamp}.csv`;

  return { csvText, filename };
}

export interface BuildMissedServiceCommitmentsCsvExportParams {
  records: MissedServiceCommitment[];
  startDate?: string;
  endDate?: string;
}

export function buildMissedServiceCommitmentsCsvExport(
  params: BuildMissedServiceCommitmentsCsvExportParams,
): {
  csvText: string;
  filename: string;
} {
  const { records, startDate, endDate } = params;

  const sortedRecords = [...records].sort((a, b) => {
    if (a.service_date !== b.service_date) {
      return a.service_date.localeCompare(b.service_date);
    }
    if (a.time_slot !== b.time_slot) {
      return a.time_slot.localeCompare(b.time_slot);
    }
    return a.full_name.localeCompare(b.full_name);
  });

  const headers = [
    'Member ID',
    'Full Name',
    'Nickname',
    'Role',
    'Category',
    'Service Date',
    'Committed Time Slot',
    'Contact Number',
    'Status',
  ];

  const rows: string[][] = [
    headers,
    ...sortedRecords.map((r) => [
      r.member_id || '',
      r.full_name || '',
      r.nickname || '',
      r.role || '',
      r.category || '',
      r.service_date || '',
      r.time_slot || '',
      r.phone || '',
      r.status === 'excused' ? 'Excused' : 'Absent',
    ]),
  ];

  const csvText = rows
    .map((row) => row.map((val) => escapeServiceCsvValue(val)).join(','))
    .join('\n');

  let filename = 'service-missed-commitments.csv';
  if (startDate && endDate && startDate === endDate) {
    filename = `service-missed-commitments-${startDate}.csv`;
  } else if (startDate && endDate) {
    filename = `service-missed-commitments-${startDate}_to_${endDate}.csv`;
  }

  return { csvText, filename };
}
