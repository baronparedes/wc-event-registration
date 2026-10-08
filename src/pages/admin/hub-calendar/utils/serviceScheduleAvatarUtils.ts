import { CONFIDENCE_THRESHOLDS } from '@/lib/domain/hub-calendar';

export function getConfidenceBorderVariant(
  turnupRate?: number | null,
  thresholds?: { solid?: number; moderate?: number },
): 'success' | 'accent' | 'destructive' | 'none' {
  if (turnupRate === undefined || turnupRate === null) return 'none';
  const solid = thresholds?.solid ?? CONFIDENCE_THRESHOLDS.SOLID;
  const moderate = thresholds?.moderate ?? CONFIDENCE_THRESHOLDS.MODERATE;
  if (turnupRate >= solid) return 'success';
  if (turnupRate >= moderate) return 'accent';
  return 'destructive';
}

// Backward-compatible alias
export const getAttendanceScoreBorderVariant = getConfidenceBorderVariant;
