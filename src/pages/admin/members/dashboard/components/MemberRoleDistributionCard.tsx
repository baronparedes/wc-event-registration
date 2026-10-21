import { useMemo, useState } from 'react';

import { Briefcase, ListFilter } from 'lucide-react';
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
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/SectionCard';
import type { MemberRoleStat } from '@/lib/domain/members';

const THEME_ROLE_PALETTE = [
  'var(--color-primary)',
  'var(--color-tertiary)',
  'var(--color-secondary)',
  'var(--color-accent)',
  'var(--color-danger)',
  'color-mix(in srgb, var(--color-primary) 70%, white)',
  'color-mix(in srgb, var(--color-tertiary) 70%, white)',
  'color-mix(in srgb, var(--color-secondary) 70%, white)',
];

interface MemberRoleDistributionCardProps {
  roles: MemberRoleStat[];
  totalMembers: number;
}

export function MemberRoleDistributionCard({
  roles,
  totalMembers,
}: MemberRoleDistributionCardProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedRoles = useMemo(() => {
    if (showAll || roles.length <= 8) {
      return roles;
    }
    return roles.slice(0, 8);
  }, [roles, showAll]);

  const chartData = useMemo(() => {
    return displayedRoles.map((item, index) => ({
      name: item.role.length > 14 ? `${item.role.slice(0, 12)}…` : item.role,
      fullName: item.role,
      count: item.count,
      percentage: item.percentage,
      color: THEME_ROLE_PALETTE[index % THEME_ROLE_PALETTE.length],
    }));
  }, [displayedRoles]);

  if (roles.length === 0) {
    return null;
  }

  return (
    <SectionCard
      title={
        <div className="flex items-center gap-2.5 font-heading text-lg font-semibold text-text">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Briefcase className="h-4 w-4" />
          </div>
          <span>Primary Role Distributions</span>
        </div>
      }
      subtitle={`Breakdown of active member primary roles across ${totalMembers} members`}
      headerAction={
        roles.length > 8 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-xs"
          >
            <ListFilter className="mr-1.5 h-3.5 w-3.5" />
            {showAll ? 'Show Top 8' : `Show All (${roles.length})`}
          </Button>
        ) : undefined
      }
    >
      <div className="mt-4 flex flex-col gap-6">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="var(--color-border)"
              />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
                width={100}
              />
              <Tooltip
                cursor={{ fill: 'var(--color-border)', opacity: 0.3 }}
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
                          <p className="font-heading font-semibold text-text">{data.fullName}</p>
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
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                {chartData.map((entry, index) => (
                  <Cell key={`role-cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
          {displayedRoles.map((item, index) => {
            const color = THEME_ROLE_PALETTE[index % THEME_ROLE_PALETTE.length];
            return (
              <div
                key={item.role}
                className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-1.5 text-xs text-text shadow-xs"
              >
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <span className="font-medium text-text">{item.role}</span>
                <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">
                  {item.count} ({item.percentage}%)
                </Badge>
              </div>
            );
          })}
        </div>
      </div>
    </SectionCard>
  );
}
