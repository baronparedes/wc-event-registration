import { useMemo } from 'react';

import { Clock, Handshake, TrendingUp, UserCheck, UserX, Users } from 'lucide-react';

import { StatCard, type StatCardProps, type StatCardVariant } from '@/components/ui';
import type { CommitmentDashboardStat } from '@/hooks/domain/services';

export type { StatCardVariant };
export type CommitmentSummaryCardProps = StatCardProps;
export const CommitmentSummaryCard = StatCard;

interface CommitmentSummaryCardsProps {
  stats: CommitmentDashboardStat[];
  totalVolunteers: number;
}

export function CommitmentSummaryCards({ stats, totalVolunteers }: CommitmentSummaryCardsProps) {
  const totals = useMemo(() => {
    return stats.reduce(
      (acc, stat) => {
        acc.attended += stat.attended;
        acc.absences += stat.absences;
        acc.excused += stat.excused;
        acc.walkIns += stat.wi_9am_3pm + stat.wi_12nn + (stat.wi_5th_sunday ?? 0);
        if (stat.committed > 0 || stat.attended > 0) {
          acc.activeVolunteers += 1;
        }
        return acc;
      },
      { attended: 0, absences: 0, excused: 0, walkIns: 0, activeVolunteers: 0 },
    );
  }, [stats]);

  const avgAttendance =
    totals.activeVolunteers > 0 ? (totals.attended / totals.activeVolunteers).toFixed(1) : '0.0';

  const cards: CommitmentSummaryCardProps[] = [
    {
      title: 'Volunteers',
      value: totalVolunteers,
      subtitle: `${totals.activeVolunteers} with activity`,
      icon: <Users className="h-4 w-4" />,
      variant: 'primary',
    },
    {
      title: 'Attended',
      value: totals.attended,
      subtitle: 'committed slots',
      icon: <UserCheck className="h-4 w-4" />,
      variant: 'secondary',
    },
    {
      title: 'Absences',
      value: totals.absences,
      subtitle: 'missed commitments',
      icon: <UserX className="h-4 w-4" />,
      variant: 'danger',
    },
    {
      title: 'Excused',
      value: totals.excused,
      subtitle: 'slots scored at -0.5',
      icon: <Clock className="h-4 w-4" />,
      variant: 'accent',
    },
    {
      title: 'Walk-ins',
      value: totals.walkIns,
      subtitle: '9AM/3PM & 12NN',
      icon: <Handshake className="h-4 w-4" />,
      variant: 'secondary',
    },
    {
      title: 'Avg Attendance',
      value: avgAttendance,
      subtitle: 'per active volunteer',
      icon: <TrendingUp className="h-4 w-4" />,
      variant: 'primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <CommitmentSummaryCard key={card.title} {...card} />
      ))}
    </div>
  );
}
