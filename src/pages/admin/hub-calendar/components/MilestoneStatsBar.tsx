import { Cake, HeartIcon } from 'lucide-react';

import type { MilestoneEntry } from '../types';
import { ExportMonthMilestonesButton } from './ExportMonthMilestonesButton';

type MilestoneStatsBarProps = {
  birthdayCount: number;
  anniversaryCount: number;
  currentMonthMilestoneEntries: MilestoneEntry[];
  viewYear: number;
  viewMonthIndex: number;
};

export function MilestoneStatsBar({
  birthdayCount,
  anniversaryCount,
  currentMonthMilestoneEntries,
  viewYear,
  viewMonthIndex,
}: MilestoneStatsBarProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-border bg-surface p-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-12">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Cake className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Birthdays this month</p>
            <p className="text-2xl font-bold text-text">{birthdayCount}</p>
          </div>
        </div>

        <div className="hidden sm:block h-10 w-px bg-border" />

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700">
            <HeartIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">Wedding Anniversaries</p>
            <p className="text-2xl font-bold text-text">{anniversaryCount}</p>
          </div>
        </div>
      </div>

      <ExportMonthMilestonesButton
        milestoneEntries={currentMonthMilestoneEntries}
        year={viewYear}
        monthIndex={viewMonthIndex}
      />
    </div>
  );
}
