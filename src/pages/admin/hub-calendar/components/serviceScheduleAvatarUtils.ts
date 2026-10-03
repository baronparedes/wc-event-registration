export function getLoginCountBorderVariant(
  loginCount?: number,
  totalWeeks = 12,
): 'primary' | 'secondary' | 'destructive' | 'accent' | 'none' {
  if (loginCount === undefined) return 'none';
  const percentage = (loginCount / totalWeeks) * 100;
  if (percentage >= 75) return 'primary';
  if (percentage >= 50) return 'accent';
  return 'destructive';
}
