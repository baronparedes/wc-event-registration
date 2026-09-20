import type { ServiceAttendanceCsvPreviewRow } from '@/lib/domain/services';

export type StatusFilter = 'all' | 'failed' | 'valid';

export type EnrichedServiceAttendanceRow = ServiceAttendanceCsvPreviewRow;

export function getMemberNameFromRow(originalData: Record<string, string>): string {
  const candidateKeys = ['name', 'full name', 'member name'];
  for (const [key, value] of Object.entries(originalData)) {
    if (candidateKeys.includes(key.trim().toLowerCase()) && value.trim()) {
      return value.trim();
    }
  }
  return '';
}
