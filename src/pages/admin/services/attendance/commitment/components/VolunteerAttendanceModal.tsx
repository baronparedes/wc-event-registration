import { useMemo, useState } from 'react';

import { parseISO } from 'date-fns';
import {
  CalendarCheck,
  Clock,
  Handshake,
  Loader2,
  TrendingUp,
  UserCheck,
  UserX,
} from 'lucide-react';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { CollapsibleSectionCard } from '@/components/ui/CollapsibleSectionCard';
import { Dialog } from '@/components/ui/Dialog';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import type { CommitmentDashboardStat } from '@/hooks/domain/services';
import { useVolunteerAttendanceLogQuery } from '@/hooks/domain/services';

import type { DashboardTimeframe } from './CommitmentDashboardFilters';
import { CommitmentSummaryCard } from './CommitmentSummaryCards';

export interface VolunteerAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteer: CommitmentDashboardStat | null;
  timeframe: DashboardTimeframe;
  startDate: string;
  endDate: string;
  excuseEventId?: string | null;
}

type ViewMode = 'DETAILED' | 'MATRIX';

export function VolunteerAttendanceModal({
  isOpen,
  onClose,
  volunteer,
  timeframe,
  startDate,
  endDate,
  excuseEventId,
}: VolunteerAttendanceModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('DETAILED');

  const { data: logs, isLoading } = useVolunteerAttendanceLogQuery({
    user_id: volunteer?.user_id ?? '',
    start_date: startDate,
    end_date: endDate,
    excuse_event_id: excuseEventId,
  });

  const processedLogs = useMemo(() => {
    if (!logs) return [];

    return logs.map((log) => {
      const date = parseISO(log.service_date);
      const dayOfWeek = date.getDay();
      const dayOfMonth = date.getDate();
      const weekNumber = Math.ceil(dayOfMonth / 7);

      let weekStr = '1st';
      if (weekNumber === 2) weekStr = '2nd';
      else if (weekNumber === 3) weekStr = '3rd';
      else if (weekNumber === 4) weekStr = '4th';
      else if (weekNumber === 5) weekStr = '5th';

      return {
        ...log,
        weekLabel: dayOfWeek === 0 ? `${weekStr} Sunday` : `${weekStr} Day`,
      };
    });
  }, [logs]);

  const loginLogs = useMemo(
    () => processedLogs.filter((log) => log.status === 'present'),
    [processedLogs],
  );

  const absentLogs = useMemo(
    () => processedLogs.filter((log) => log.status === 'absent'),
    [processedLogs],
  );

  const excusedLogs = useMemo(
    () => processedLogs.filter((log) => log.status === 'excused'),
    [processedLogs],
  );

  const sections = useMemo(
    () => [
      {
        key: 'logins',
        title: 'LOGINS',
        dotColor: 'bg-primary',
        titleColor: 'text-primary',
        logs: loginLogs,
        emptyMessage: 'No attendance records found for this period.',
        renderSlot: (log: (typeof processedLogs)[number]) => (
          <div className="flex items-center gap-1.5">
            <Badge>{log.time_slot}</Badge>
            {log.is_walk_in && <Badge variant="secondary">Walk-in</Badge>}
          </div>
        ),
      },
      {
        key: 'absences',
        title: 'ABSENCES',
        dotColor: 'bg-rose-500',
        titleColor: 'text-rose-600',
        logs: absentLogs,
        emptyMessage: 'No absences recorded for this period.',
        renderSlot: (log: (typeof processedLogs)[number]) => (
          <Badge variant="destructive">{log.time_slot}</Badge>
        ),
      },
      {
        key: 'excused',
        title: 'EXCUSED',
        dotColor: 'bg-amber-500',
        titleColor: 'text-amber-600',
        logs: excusedLogs,
        emptyMessage: 'No excused records found for this period.',
        renderSlot: (log: (typeof processedLogs)[number]) => (
          <Badge variant="accent">{log.time_slot}</Badge>
        ),
        hideWhenEmpty: true,
      },
    ],
    [loginLogs, absentLogs, excusedLogs, processedLogs],
  );

  if (!volunteer) return null;

  const timeframeLabels: Record<DashboardTimeframe, string> = {
    YTD: 'YTD · Year to Date',
    Q1: 'Q1 · Jan – Mar',
    Q2: 'Q2 · Apr – Jun',
    Q3: 'Q3 · Jul – Sep',
    Q4: 'Q4 · Oct – Dec',
  };

  const titleContent = (
    <div className="flex items-center gap-3">
      <Avatar
        name={volunteer.full_name}
        avatarObjectKey={volunteer.avatar_object_key}
        size="md"
        className="h-11 w-11 text-sm shrink-0"
      />
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold font-heading text-text truncate">
            {volunteer.full_name}
          </span>
          {volunteer.nickname && (
            <span className="font-normal text-muted">({volunteer.nickname})</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          {volunteer.role && <Badge className="text-xs">{volunteer.role}</Badge>}
          {volunteer.category && (
            <>
              <span>{volunteer.category}</span>
              <span>&middot;</span>
            </>
          )}
          <span>Since {volunteer.start_date || 'Unknown'}</span>
          <span>&middot;</span>
          <span className="font-semibold text-primary">{timeframeLabels[timeframe]}</span>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={titleContent}
      maxWidthClass="max-w-5xl"
      showCloseIcon
    >
      <div className="mt-4 flex flex-col gap-4">
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-6">
          <CommitmentSummaryCard
            title="Committed"
            value={volunteer.committed}
            icon={<CalendarCheck className="h-4 w-4" />}
            variant="primary"
          />
          <CommitmentSummaryCard
            title="Attended"
            value={volunteer.attended}
            icon={<UserCheck className="h-4 w-4" />}
            variant="secondary"
          />
          <CommitmentSummaryCard
            title="Absences"
            value={volunteer.absences}
            icon={<UserX className="h-4 w-4" />}
            variant="danger"
          />
          <CommitmentSummaryCard
            title="Excused"
            value={volunteer.excused}
            icon={<Clock className="h-4 w-4" />}
            variant="accent"
          />
          <CommitmentSummaryCard
            title="Walk-Ins"
            value={volunteer.wi_9am_3pm + volunteer.wi_12nn}
            icon={<Handshake className="h-4 w-4" />}
            variant="secondary"
          />
          <CommitmentSummaryCard
            title="Attendance"
            value={volunteer.attendance_score}
            icon={<TrendingUp className="h-4 w-4" />}
            variant={volunteer.attendance_score < 0 ? 'danger' : 'primary'}
          />
        </div>

        <Tabs value={viewMode} onValueChange={(val) => setViewMode(val as ViewMode)}>
          <TabsList className="w-auto">
            <TabsTrigger value="DETAILED">Detailed</TabsTrigger>
            <TabsTrigger value="MATRIX">Matrix</TabsTrigger>
          </TabsList>

          <TabsContent value="DETAILED" className="mt-4">
            <div className="flex flex-col gap-4">
              {sections
                .filter((section) => !section.hideWhenEmpty || section.logs.length > 0)
                .map((section) => (
                  <CollapsibleSectionCard
                    key={section.key}
                    title={
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${section.dotColor}`} />
                        <span
                          className={`font-bold tracking-wider text-xs font-heading ${section.titleColor}`}
                        >
                          {section.title} &mdash; {section.logs.length} RECORDS
                        </span>
                      </div>
                    }
                    defaultExpanded={true}
                    wrapperClassName="overflow-hidden rounded-lg border border-border bg-white shadow-xs"
                    headerWrapperClassName="px-3 py-2 border-b border-border bg-slate-50/50"
                    titleClassName="w-full"
                  >
                    <ListTable density="dense" className="table-fixed text-sm">
                      <ListTableHead>
                        <ListTableHeaderRow>
                          <ListTableHeaderCell className="!py-1.5 !px-3 text-xs w-[30%]">
                            Date
                          </ListTableHeaderCell>
                          <ListTableHeaderCell className="!py-1.5 !px-3 text-xs w-[35%]">
                            Week
                          </ListTableHeaderCell>
                          <ListTableHeaderCell className="!py-1.5 !px-3 text-xs w-[35%]">
                            Time Slot
                          </ListTableHeaderCell>
                        </ListTableHeaderRow>
                      </ListTableHead>
                      <ListTableBody>
                        {isLoading ? (
                          <ListTableRow hover="none">
                            <ListTableCell colSpan={3} className="!py-4 text-center">
                              <Loader2 className="mx-auto h-4 w-4 animate-spin text-primary" />
                            </ListTableCell>
                          </ListTableRow>
                        ) : section.logs.length === 0 ? (
                          <ListTableRow hover="none">
                            <ListTableCell
                              colSpan={3}
                              className="!py-2.5 !px-3 text-center text-sm text-muted"
                            >
                              {section.emptyMessage}
                            </ListTableCell>
                          </ListTableRow>
                        ) : (
                          section.logs.map((log) => (
                            <ListTableRow
                              key={log.id ?? `${section.key}-${log.service_date}-${log.time_slot}`}
                            >
                              <ListTableCell className="!py-1.5 !px-3 font-medium text-text">
                                {log.service_date}
                              </ListTableCell>
                              <ListTableCell className="!py-1.5 !px-3 text-text">
                                {log.weekLabel}
                              </ListTableCell>
                              <ListTableCell className="!py-1.5 !px-3">
                                {section.renderSlot(log)}
                              </ListTableCell>
                            </ListTableRow>
                          ))
                        )}
                      </ListTableBody>
                    </ListTable>
                  </CollapsibleSectionCard>
                ))}
            </div>
          </TabsContent>

          <TabsContent value="MATRIX" className="mt-4">
            <div className="py-8 text-center text-sm text-muted">Matrix view is coming soon.</div>
          </TabsContent>
        </Tabs>
      </div>
    </Dialog>
  );
}
