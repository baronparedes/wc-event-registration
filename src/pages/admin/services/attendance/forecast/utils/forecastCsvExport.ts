import { escapeCsvValue } from '@/lib/domain/hub-calendar';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';

export type BuildSundayForecastCsvExportParams = {
  sundays: SundayForecastData[];
  year: number;
  monthIndex: number;
  selectedSundayKey?: string;
};

const TIME_SLOT_LABELS: Record<string, string> = {
  '9AM': '9:00 AM',
  '12NN': '12:00 NN',
  '3PM': '3:00 PM',
};

export function buildSundayForecastCsvExport({
  sundays,
  year,
  monthIndex,
  selectedSundayKey,
}: BuildSundayForecastCsvExportParams): { csvText: string; filename: string } {
  const rows: string[][] = [
    [
      'Sunday Date',
      'Sunday Label',
      'Time Slot',
      'Role',
      'Target',
      'Scheduled',
      'Excused',
      'Expected Turnup',
      'Deficit',
      'Surplus',
      'Fulfillment Rate',
    ],
  ];

  const targetSundays =
    selectedSundayKey && selectedSundayKey !== 'ALL'
      ? sundays.filter((s) => s.isoDateKey === selectedSundayKey)
      : sundays;

  for (const sunday of targetSundays) {
    const breakdowns =
      sunday.forecast?.slotBreakdowns && sunday.forecast.slotBreakdowns.length > 0
        ? sunday.forecast.slotBreakdowns
        : [sunday.forecast];

    for (const slotGroup of breakdowns) {
      if (!slotGroup) continue;
      const slotKey = slotGroup.slot ?? 'ALL';
      const slotLabel = TIME_SLOT_LABELS[slotKey] ?? (slotKey === 'ALL' ? 'All Sessions' : slotKey);

      for (const item of slotGroup.roleBreakdown) {
        const percent =
          item.fulfillmentPercentage ??
          (item.target > 0
            ? Math.min(100, Math.round((item.expectedTurnup / item.target) * 100))
            : 100);

        rows.push([
          sunday.isoDateKey,
          sunday.ordinalLabel,
          slotLabel,
          item.role,
          String(item.target),
          String(item.committed),
          String(item.excused),
          String(item.expectedTurnup),
          String(item.needed),
          String(item.surplus),
          `${percent}%`,
        ]);
      }
    }
  }

  const csvText = rows.map((row) => row.map((value) => escapeCsvValue(value)).join(',')).join('\n');
  const filename =
    selectedSundayKey && selectedSundayKey !== 'ALL'
      ? `attendance-forecast-${selectedSundayKey}.csv`
      : `attendance-forecast-${year}-${String(monthIndex + 1).padStart(2, '0')}.csv`;

  return { csvText, filename };
}
