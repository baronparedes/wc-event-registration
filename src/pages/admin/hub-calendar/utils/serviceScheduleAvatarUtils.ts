import { CONFIDENCE_THRESHOLDS } from '@/lib/domain/hub-calendar';

export function getConfidenceBorderVariant(
  turnupRate?: number | null,
): 'success' | 'accent' | 'destructive' | 'none' {
  if (turnupRate === undefined || turnupRate === null) return 'none';
  if (turnupRate >= CONFIDENCE_THRESHOLDS.SOLID) return 'success';
  if (turnupRate >= CONFIDENCE_THRESHOLDS.MODERATE) return 'accent';
  return 'destructive';
}

// Backward-compatible alias
export const getAttendanceScoreBorderVariant = getConfidenceBorderVariant;
