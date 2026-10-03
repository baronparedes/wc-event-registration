export function getAttendanceScoreBorderVariant(
  score?: number | null,
): 'primary' | 'secondary' | 'destructive' | 'accent' | 'none' {
  if (score === undefined || score === null) return 'none';
  if (score >= 5) return 'primary';
  if (score >= 0) return 'accent';
  return 'destructive';
}
