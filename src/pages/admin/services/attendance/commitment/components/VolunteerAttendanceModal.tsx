import { useMemo, useState } from 'react';

import { parseISO } from 'date-fns';
import { Calendar, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import type { CommitmentDashboardStat } from '@/hooks/domain/services';
import { useVolunteerAttendanceLogQuery } from '@/hooks/domain/services';

import type { DashboardTimeframe } from './CommitmentDashboardFilters';

export interface VolunteerAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer: CommitmentDashboardStat | null;
  timeframe: DashboardTimeframe;
  startDate: string;
  endDate: string;
}

type ViewMode = 'MATRIX' | 'DETAILED';

export function VolunteerAttendanceModal({
  isOpen,
  onClose,
  volunteer,
  timeframe,
  startDate,
  endDate,
}: VolunteerAttendanceModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('DETAILED');

  const { data: logs, isLoading } = useVolunteerAttendanceLogQuery({
    user_id: volunteer?.user_id ?? '',
    start_date: startDate,
    end_date: endDate,
  });

  const processedLogs = useMemo(() => {
    if (!logs) return [];

    return logs.map((log) => {
      const date = parseISO(log.service_date);
      // Week calculation
      const dayOfMonth = date.getDate();
      const weekNumber = Math.ceil(dayOfMonth / 7);

      let weekStr = '1st';
      if (weekNumber === 2) weekStr = '2nd';
      else if (weekNumber === 3) weekStr = '3rd';
      else if (weekNumber === 4) weekStr = '4th';
      else if (weekNumber === 5) weekStr = '5th';

      return {
        ...log,
        weekLabel: `${weekStr} Sunday`,
      };
    });
  }, [logs]);

  if (!volunteer) return null;

  const timeframeLabels: Record<DashboardTimeframe, string> = {
    YTD: 'YTD · Year to Date',
    Q1: 'Q1 · Jan – Mar',
    Q2: 'Q2 · Apr – Jun',
    Q3: 'Q3 · Jul – Sep',
    Q4: 'Q4 · Oct – Dec',
  };

  const titleContent = (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold font-heading text-text">
          {volunteer.full_name}{' '}
          {volunteer.nickname && (
            <span className="font-normal text-muted">({volunteer.nickname})</span>
          )}
        </h2>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {volunteer.role && (
          <Badge
            variant="secondary"
            className="font-normal text-xs bg-blue-100 text-blue-800 hover:bg-blue-100/80 rounded-full"
          >
            {volunteer.role}
          </Badge>
        )}
        {/* Placeholder for Gender as it's not strictly in the stat type right now, using • separator */}
        <span>Men</span>
        <span>&middot;</span>
        <span>Since {volunteer.start_date || 'Unknown'}</span>
        <span>&middot;</span>
        <span className="font-semibold text-primary">{timeframeLabels[timeframe]}</span>
      </div>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={titleContent}
      maxWidthClass="max-w-6xl"
      showCloseIcon
    >
      <div className="mt-6 flex flex-col gap-6">
        <div className="flex gap-4 flex-wrap">
          {/* Custom simpler cards matching the specific request screenshot */}
          <StatCard label="COMMITTED" value={volunteer.committed} />
          <StatCard label="ATTENDED" value={volunteer.attended} />
          <StatCard label="ABSENT" value={volunteer.absences} />
          <StatCard label="EXCUSED" value={volunteer.excused} />
          <StatCard label="WI 9AM/3PM" value={volunteer.wi_9am_3pm} />
          <StatCard label="WI 12NN" value={volunteer.wi_12nn} />
          <StatCard label="ATTENDANCE" value={volunteer.attendance_score} />
        </div>

        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Button
            variant={viewMode === 'MATRIX' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('MATRIX')}
          >
            MATRIX VIEW
          </Button>
          <Button
            variant={viewMode === 'DETAILED' ? 'primaryOutline' : 'outline'}
            size="sm"
            onClick={() => setViewMode('DETAILED')}
          >
            DETAILED VIEW
          </Button>
        </div>

        <div>
          {viewMode === 'DETAILED' && (
            <div className="flex flex-col">
              <div className="flex items-center gap-2 pb-3">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-bold text-primary tracking-wider text-xs font-heading">
                  LOGINS &mdash; {processedLogs.length} RECORDS
                </span>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <ListTable>
                  <ListTableHead>
                    <ListTableHeaderRow>
                      <ListTableHeaderCell>DATE</ListTableHeaderCell>
                      <ListTableHeaderCell>WEEK</ListTableHeaderCell>
                      <ListTableHeaderCell>TIME SLOT</ListTableHeaderCell>
                    </ListTableHeaderRow>
                  </ListTableHead>
                  <ListTableBody>
                    {isLoading ? (
                      <ListTableRow hover="none">
                        <ListTableCell colSpan={3} className="py-12 text-center">
                          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                        </ListTableCell>
                      </ListTableRow>
                    ) : processedLogs.length === 0 ? (
                      <ListTableRow hover="none">
                        <ListTableCell colSpan={3} className="py-12">
                          <EmptyState
                            icon={<Calendar className="h-8 w-8" />}
                            title="No logs found"
                            description="No attendance records found for this period."
                          />
                        </ListTableCell>
                      </ListTableRow>
                    ) : (
                      processedLogs.map((log) => (
                        <ListTableRow key={log.id}>
                          <ListTableCell className="font-medium text-text">
                            {log.service_date}
                          </ListTableCell>
                          <ListTableCell className="text-text">{log.weekLabel}</ListTableCell>
                          <ListTableCell>
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-700 border-emerald-200"
                            >
                              {log.time_slot}
                            </Badge>
                          </ListTableCell>
                        </ListTableRow>
                      ))
                    )}
                  </ListTableBody>
                </ListTable>
              </div>
            </div>
          )}

          {viewMode === 'MATRIX' && (
            <div className="py-12">
              <EmptyState
                icon={<Calendar className="h-8 w-8" />}
                title="Matrix View"
                description="Matrix view is coming soon."
              />
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  const isZero = value === 0;
  const isScore = label === 'ATTENDANCE' || label === 'COMMITTED' || label === 'ATTENDED';

  // Basic styling approximation to match the screenshot
  const valueColor = isZero ? 'text-orange-500' : 'text-emerald-600';
  const displayColor = isScore && value > 0 ? 'text-emerald-600' : valueColor;

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-white px-6 py-3 shadow-xs">
      <span className={`text-3xl font-black font-heading ${displayColor}`}>{value}</span>
      <span className="mt-1 text-[10px] font-bold tracking-wider text-muted uppercase">
        {label}
      </span>
    </div>
  );
}
