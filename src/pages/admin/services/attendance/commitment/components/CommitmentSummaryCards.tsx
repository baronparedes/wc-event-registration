import { type ReactNode, useMemo } from 'react';

import { Clock, Handshake, TrendingUp, UserCheck, UserX, Users } from 'lucide-react';

import type { CommitmentDashboardStat } from '@/hooks/domain/services';

type StatCardVariant = 'primary' | 'secondary' | 'danger' | 'accent';

interface CommitmentSummaryCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: ReactNode;
  variant?: StatCardVariant;
}

const variantIconStyles: Record<StatCardVariant, string> = {
  primary: 'bg-primary/10 text-primary',
  secondary: 'bg-secondary/15 text-secondary',
  danger: 'bg-danger/10 text-danger',
  accent: 'bg-accent/20 text-text',
};

export function CommitmentSummaryCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'primary',
}: CommitmentSummaryCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted">
          {title}
        </span>
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${variantIconStyles[variant]}`}
        >
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="font-heading text-2xl sm:text-3xl font-bold text-text">{value}</div>
        <p className="mt-1 text-xs text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

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
        acc.walkIns += stat.wi_9am_3pm + stat.wi_12nn;
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
      icon: <Users className="h-3.5 w-3.5" />,
      variant: 'primary',
    },
    {
      title: 'Attended',
      value: totals.attended,
      subtitle: 'committed slots',
      icon: <UserCheck className="h-3.5 w-3.5" />,
      variant: 'secondary',
    },
    {
      title: 'Absences',
      value: totals.absences,
      subtitle: 'missed commitments',
      icon: <UserX className="h-3.5 w-3.5" />,
      variant: 'danger',
    },
    {
      title: 'Excused',
      value: totals.excused,
      subtitle: 'slots scored at -0.5',
      icon: <Clock className="h-3.5 w-3.5" />,
      variant: 'accent',
    },
    {
      title: 'Walk-ins',
      value: totals.walkIns,
      subtitle: '9AM/3PM & 12NN',
      icon: <Handshake className="h-3.5 w-3.5" />,
      variant: 'secondary',
    },
    {
      title: 'Avg Attendance',
      value: avgAttendance,
      subtitle: 'per active volunteer',
      icon: <TrendingUp className="h-3.5 w-3.5" />,
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
