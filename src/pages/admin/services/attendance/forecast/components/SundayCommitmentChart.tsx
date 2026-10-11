import { useMemo } from 'react';

import { Users } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SundaySessionForecast } from '../hooks/useAttendanceForecastData';

export type SundayCommitmentChartProps = {
  title: string;
  sessions: SundaySessionForecast[];
  totalTarget: number;
  totalScheduled: number;
  totalConfirmed: number;
  totalOverShort: number;
  totalDeficit?: number;
  totalSurplus?: number;
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  dataKey: string;
  payload: {
    session: string;
    target: number;
    scheduled: number;
    expected: number;
    overShort: number;
  };
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function SundayChartTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const isNegative = data.overShort < 0;
  const isPositive = data.overShort > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-xs shadow-md space-y-2 min-w-[180px]">
      <div className="flex items-center justify-between border-b border-border pb-1.5 font-bold">
        <span className="text-text">{data.session} Session</span>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
            isNegative
              ? 'bg-danger/10 text-danger'
              : isPositive
                ? 'bg-primary/10 text-primary'
                : 'bg-muted/10 text-muted'
          }`}
        >
          {isPositive ? `+${data.overShort}` : data.overShort} var
        </span>
      </div>

      <div className="space-y-1 text-muted">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Target:</span>
          </span>
          <span className="font-semibold text-text tabular-nums">{data.target}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <span>Scheduled:</span>
          </span>
          <span className="font-semibold text-text tabular-nums">{data.scheduled}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Expected:</span>
          </span>
          <span className="font-bold text-text tabular-nums">{data.expected}</span>
        </div>
      </div>
    </div>
  );
}

export function SundayCommitmentChart({
  title,
  sessions,
  totalTarget,
  totalScheduled,
  totalConfirmed,
  totalOverShort,
  totalDeficit,
  totalSurplus,
}: SundayCommitmentChartProps) {
  const chartData = useMemo(() => {
    return sessions.map((s) => ({
      session: s.slot,
      target: s.target,
      scheduled: s.scheduled,
      expected: s.confirmed,
      overShort: s.overShort,
    }));
  }, [sessions]);

  const isTotalNegative = totalOverShort < 0;
  const isTotalPositive = totalOverShort > 0;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
      {/* Banner Title */}
      <div className="flex items-center justify-center gap-2 border-b border-border bg-surface-hover/50 px-4 py-3 text-center">
        <Users className="h-4 w-4 text-primary" aria-hidden="true" />
        <h4 className="text-sm font-bold tracking-wider text-text uppercase">
          {title} &mdash; Chart Overview
        </h4>
      </div>

      {/* Recharts Container */}
      <div className="p-4 sm:p-6">
        <div className="h-72 sm:h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="session"
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                tick={{ fill: 'var(--color-text)', fontSize: 12, fontWeight: 600 }}
                dy={6}
              />
              <YAxis
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
                tick={{ fill: 'var(--color-muted)', fontSize: 11 }}
                dx={-4}
              />
              <Tooltip content={<SundayChartTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="scheduled"
                name="Scheduled"
                fill="#0284c7"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
              <Bar
                dataKey="expected"
                name="Expected Turnup"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                maxBarSize={44}
              />
              <Line
                type="step"
                dataKey="target"
                name="Target"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Metrics Footer Summary */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-border/70 bg-surface-hover/30 p-3 text-center">
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Total Target</div>
            <div className="mt-0.5 text-base font-bold text-text tabular-nums">{totalTarget}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Total Scheduled</div>
            <div className="mt-0.5 text-base font-bold text-text tabular-nums">
              {totalScheduled}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Total Expected</div>
            <div className="mt-0.5 text-base font-bold text-text tabular-nums">
              {totalConfirmed}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Staffing Status</div>
            <div className="mt-0.5">
              {totalDeficit !== undefined && totalDeficit > 0 ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums bg-danger/15 text-danger">
                  -{totalDeficit} Short
                </span>
              ) : (
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                    totalSurplus !== undefined && totalSurplus > 0
                      ? 'bg-primary/15 text-primary'
                      : isTotalNegative
                        ? 'bg-danger/15 text-danger'
                        : isTotalPositive
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted/15 text-text font-bold'
                  }`}
                >
                  {totalSurplus !== undefined && totalSurplus > 0
                    ? `+${totalSurplus}`
                    : isTotalPositive
                      ? `+${totalOverShort}`
                      : totalOverShort}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
