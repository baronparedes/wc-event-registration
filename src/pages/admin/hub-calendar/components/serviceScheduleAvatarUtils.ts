export function getConfidenceBorderVariant(
  turnupRate?: number | null,
): 'success' | 'accent' | 'destructive' | 'none' {
  if (turnupRate === undefined || turnupRate === null) return 'none';
  if (turnupRate >= 0.8) return 'success';
  if (turnupRate >= 0.4) return 'accent';
  return 'destructive';
}

// Backward-compatible alias
export const getAttendanceScoreBorderVariant = getConfidenceBorderVariant;
