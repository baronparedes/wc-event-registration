import { useMemo } from 'react';

import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-6 flex items-center space-x-2 text-sm font-semibold text-foreground">
        <TrendingUp className="h-5 w-5" />
        <span>Top 15 Volunteers by Attendance</span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              dx={-10}
            />
            <Tooltip
              cursor={{ fill: '#f3f4f6' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-md border border-border bg-white p-3 shadow-md">
                      <p className="font-semibold text-foreground">{data.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        Score: <span className="font-medium text-foreground">{data.score}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="score" fill="#52b788" radius={[4, 4, 0, 0]} barSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
