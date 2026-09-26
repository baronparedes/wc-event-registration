import { format } from 'date-fns';

import { escapeServiceCsvValue } from './service-attendance-export';
import type { CommitmentDashboardStat } from './types';

export interface BuildCommitmentDashboardCsvExportParams {
  stats: CommitmentDashboardStat[];
  startDate?: string;
  endDate?: string;
  timeframe?: string;
}

export function buildCommitmentDashboardCsvExport(
  params: BuildCommitmentDashboardCsvExportParams,
): {
  csvText: string;
  filename: string;
} {
  const { stats, startDate, endDate, timeframe } = params;

  // Sort by attendance_score descending, then full_name ascending (mirroring default table view)
  const sortedStats = [...stats].sort((a, b) => {
    const scoreDiff = b.attendance_score - a.attendance_score;
    if (scoreDiff !== 0) return scoreDiff;
    return (a.full_name || '').localeCompare(b.full_name || '');
  });

  const rows: string[][] = [
    [
      'Full Name',
      'Nickname',
      'Member ID',
      'Email',
      'Role',
      'Category',
      'Start Date',
      'Attendance Score',
      'Committed',
      'Attended',
      'Absences',
      'Excused',
      'WI 9AM/3PM',
      'WI 12NN',
      'WI 5th Sun',
    ],
    ...sortedStats.map((stat) => [
      stat.full_name || '',
      stat.nickname || '',
      stat.member_id || '',
      stat.email || '',
      stat.role || '',
      stat.category || '',
      stat.start_date || '',
      String(stat.attendance_score ?? 0),
      String(stat.committed ?? 0),
      String(stat.attended ?? 0),
      String(stat.absences ?? 0),
      String(stat.excused ?? 0),
      String(stat.wi_9am_3pm ?? 0),
      String(stat.wi_12nn ?? 0),
      String(stat.wi_5th_sunday ?? 0),
    ]),
  ];

  const csvText = rows
    .map((row) => row.map((val) => escapeServiceCsvValue(val)).join(','))
    .join('\n');

  const timestamp = format(new Date(), 'yyyyMMdd-HHmmss');
  let filename = `service-commitment-${timestamp}.csv`;

  if (timeframe && timeframe !== 'YTD') {
    filename = `service-commitment-${timeframe.toLowerCase()}-${timestamp}.csv`;
  } else if (startDate && endDate) {
    if (startDate === endDate) {
      filename = `service-commitment-${startDate}-${timestamp}.csv`;
    } else {
      filename = `service-commitment-${startDate}-to-${endDate}-${timestamp}.csv`;
    }
  } else if (startDate) {
    filename = `service-commitment-${startDate}-${timestamp}.csv`;
  }

  return { csvText, filename };
}
