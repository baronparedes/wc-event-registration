import { useMemo } from 'react';

import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { SectionCard } from '@/components/ui/SectionCard';
import type { CommitmentDashboardStat } from '@/hooks/domain/services';

interface TopVolunteersChartProps {
  stats: CommitmentDashboardStat[];
}

export function TopVolunteersChart({ stats }: TopVolunteersChartProps) {
  const chartData = useMemo(() => {
    // Sort by attendance_score descending, take top 15
    const top = [...stats].sort((a, b) => b.attendance_score - a.attendance_score).slice(0, 15);
    return top.map((stat) => ({
      name: stat.nickname || stat.full_name.split(' ')[0],
      score: stat.attendance_score,
      fullName: stat.full_name,
    }));
  }, [stats]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2.5 font-heading text-lg font-semibold text-text">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-4 w-4" />
          </div>
          <span>Top 15 Volunteers by Attendance</span>
        </div>
      }
      subtitle="Ranked by cumulative attendance score in the active timeframe"
    >
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
              dx={-5}
            />
            <Tooltip
              cursor={{ fill: 'var(--color-border)', opacity: 0.3 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-border bg-surface p-3 shadow-md">
                      <p className="font-heading font-semibold text-text">{data.fullName}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        Attendance Score:{' '}
                        <span className="font-bold text-primary">{data.score}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="score" fill="var(--color-primary)" radius={[6, 6, 0, 0]} barSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}
