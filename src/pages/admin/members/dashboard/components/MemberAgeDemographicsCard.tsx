import { useMemo } from 'react';

import { Cake } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import type { MemberAgeDemographics } from '@/lib/domain/members';

const AGE_BRACKET_COLORS: Record<string, string> = {
  '< 18': 'var(--color-accent)',
  '18–24': 'var(--color-secondary)',
  '25–34': 'var(--color-primary)',
  '35–44': 'color-mix(in srgb, var(--color-primary) 85%, black)',
  '45–54': 'var(--color-tertiary)',
  '55–64': 'color-mix(in srgb, var(--color-tertiary) 80%, black)',
  '65+': 'color-mix(in srgb, var(--color-secondary) 80%, black)',
  Unspecified: 'var(--color-border)',
};

interface MemberAgeDemographicsCardProps {
  demographics: MemberAgeDemographics;
}

export function MemberAgeDemographicsCard({ demographics }: MemberAgeDemographicsCardProps) {
  const chartData = useMemo(() => {
    return demographics.brackets.map((b) => ({
      bracket: b.bracket,
      count: b.count,
      percentage: b.percentage,
      isUnspecified: b.bracket === 'Unspecified',
      color: AGE_BRACKET_COLORS[b.bracket] || 'var(--color-primary)',
    }));
  }, [demographics.brackets]);

  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2.5 font-heading text-lg font-semibold text-text">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
            <Cake className="h-4 w-4" />
          </div>
          <span>Age Demographics</span>
        </div>
      }
      subtitle={
        demographics.totalWithDob > 0
          ? `Recorded for ${demographics.totalWithDob} of ${demographics.totalMembers} members (${demographics.coveragePercentage}%)`
          : 'Birth dates not recorded yet'
      }
      headerAction={
        demographics.averageAge !== null ? (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Avg: <span className="ml-1 font-bold text-text">{demographics.averageAge} yrs</span>
            </Badge>
            {demographics.medianAge !== null && (
              <Badge variant="secondary" className="text-xs">
                Median: <span className="ml-1 font-bold">{demographics.medianAge} yrs</span>
              </Badge>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="mt-4 flex flex-col gap-6">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="bracket"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-border)', opacity: 0.2 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-xl border border-border bg-surface p-3 shadow-md">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: data.color }}
                            aria-hidden="true"
                          />
                          <p className="font-heading font-semibold text-text">
                            Age Group: {data.bracket}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          Count: <span className="font-bold text-text">{data.count}</span> (
                          {data.percentage}%)
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={32}>
                {chartData.map((entry) => (
                  <Cell key={entry.bracket} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
          {chartData.map((entry) => (
            <div
              key={entry.bracket}
              className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/50 px-2.5 py-1 text-xs text-text shadow-xs"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.color }}
                aria-hidden="true"
              />
              <span className="text-muted font-medium">{entry.bracket}:</span>
              <span className="font-bold text-text">{entry.count}</span>
              <span className="text-[10px] text-muted">({entry.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
