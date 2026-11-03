const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function calculateAge(dateOfBirth: string, today = new Date()): number | null {
  const [year, month, day] = dateOfBirth.split('-').map(Number);
  if (!year || !month || !day) return null;

  let age = today.getFullYear() - year;
  const birthdayHasPassed =
    today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  if (!birthdayHasPassed) age -= 1;
  return age;
}

export function toMonthInput(value: string | undefined): string {
  if (!value) return '';
  const [year, monthLabel] = value.split(' ');
  const month = MONTH_LABELS.indexOf(monthLabel as (typeof MONTH_LABELS)[number]) + 1;
  if (!year || month < 1) return '';
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function fromMonthInput(value: string): string {
  const [year, month] = value.split('-');
  const monthIndex = Number(month) - 1;
  const label = MONTH_LABELS[monthIndex];
  return year && label ? `${year} ${label}` : '';
}

export function monthsSinceMonthYear(value: string, today = new Date()): number | null {
  const [yearText, monthLabel] = value.split(' ');
  const year = Number(yearText);
  const monthIndex = MONTH_LABELS.indexOf(monthLabel as (typeof MONTH_LABELS)[number]);
  if (!Number.isInteger(year) || monthIndex < 0) return null;
  return (today.getFullYear() - year) * 12 + today.getMonth() - monthIndex;
}

export function formatMonthYearDuration(value: string): string | null {
  const months = monthsSinceMonthYear(value);
  if (months === null) return null;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${months} ${months === 1 ? 'month' : 'months'}`;
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'year' : 'years'}`;
  return `${years} ${years === 1 ? 'year' : 'years'} and ${remainingMonths} ${remainingMonths === 1 ? 'month' : 'months'}`;
}
