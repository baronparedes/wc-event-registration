import type { ServiceAttendanceCsvPreviewRow } from '@/lib/domain/services';

export type StatusFilter = 'all' | 'failed' | 'valid';

export interface RowOverride {
  userId: string;
  memberName: string;
  rfid: string;
}

export type EnrichedServiceAttendanceRow = ServiceAttendanceCsvPreviewRow & {
  isManuallyMatched?: boolean;
};

export function getMemberNameFromRow(originalData: Record<string, string>): string {
  const candidateKeys = ['name', 'full name', 'member name'];
  for (const [key, value] of Object.entries(originalData)) {
    if (candidateKeys.includes(key.trim().toLowerCase()) && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function findMatchingFailedRows(
  targetRow: EnrichedServiceAttendanceRow,
  allRows: EnrichedServiceAttendanceRow[],
): EnrichedServiceAttendanceRow[] {
  const targetName = getMemberNameFromRow(targetRow.originalData).trim().toLowerCase();
  const targetRfid = (targetRow.rfid || '').trim().toLowerCase();

  return allRows.filter((row) => {
    if (row.row_number === targetRow.row_number) return false;
    if (row.isValid) return false;

    const rowName = getMemberNameFromRow(row.originalData).trim().toLowerCase();
    const rowRfid = (row.rfid || '').trim().toLowerCase();

    const matchesName = targetName.length > 0 && rowName === targetName;
    const matchesRfid = targetRfid.length > 0 && rowRfid === targetRfid;

    return matchesName || matchesRfid;
  });
}
