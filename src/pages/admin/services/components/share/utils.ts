export function getTurnupPercentage(present: number, committed: number): number {
  if (committed === 0) return 0;
  return Math.round((present / committed) * 100);
}

export function getServiceDashboardExportFilename(
  filterMode: 'sunday' | 'month' | 'annual',
  selectedSunday: string,
  selectedYear: number,
  selectedMonth: number,
): string {
  if (filterMode === 'sunday' && selectedSunday) {
    return `service-dashboard-${selectedSunday}.jpg`;
  }
  if (filterMode === 'month' && selectedYear && selectedMonth) {
    return `service-dashboard-${selectedYear}-${String(selectedMonth).padStart(2, '0')}.jpg`;
  }
  if (selectedYear) {
    return `service-dashboard-${selectedYear}.jpg`;
  }
  return 'service-dashboard-metrics.jpg';
}
