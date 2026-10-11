import { useMemo } from 'react';

import { format } from 'date-fns';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Badge } from '@/components/ui';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';

export type ForecastMonthlyTrendChartProps = {
  sundays: SundayForecastData[];
  roleGroupLabel?: string;
};

interface TooltipPayloadItem {
  name: string;
  value: number;
  dataKey: string;
  payload: {
    label: string;
    fullLabel: string;
    formattedDate: string;
    target: number;
    scheduled: number;
    expected: number;
    overShort: number;
    fulfillmentRate: number;
  };
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function MonthlyTrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const data = payload[0].payload;
  const isNegative = data.overShort < 0;
  const isPositive = data.overShort > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-xs shadow-md space-y-2 min-w-[200px]">
      <div className="flex items-center justify-between border-b border-border pb-1.5 font-bold">
        <div>
          <span className="text-text">{data.fullLabel}</span>
          <span className="text-muted font-normal ml-1 text-[11px]">({data.formattedDate})</span>
        </div>
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
            <span>Target Quota:</span>
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
            <span>Expected Turnup:</span>
          </span>
          <span className="font-bold text-text tabular-nums">{data.expected}</span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
          <span>Fulfillment Rate:</span>
          <span className="font-semibold text-text tabular-nums">{data.fulfillmentRate}%</span>
        </div>
      </div>
    </div>
  );
}

export function ForecastMonthlyTrendChart({
  sundays,
  roleGroupLabel = 'All Roles',
}: ForecastMonthlyTrendChartProps) {
  const chartData = useMemo(() => {
    return sundays.map((s) => {
      const target = s.totalTarget;
      const scheduled = s.totalScheduled;
      const expected = s.totalConfirmed;
      const overShort = s.totalOverShort;
      const fulfillmentRate = target > 0 ? Math.round((expected / target) * 100) : 100;

      return {
        label: `${s.ordinalLabel.replace(' Sunday', ' Sun')} (${format(s.date, 'MMM d')})`,
        fullLabel: s.ordinalLabel,
        formattedDate: format(s.date, 'MMMM d, yyyy'),
        target,
        scheduled,
        expected,
        overShort,
        fulfillmentRate,
      };
    });
  }, [sundays]);

  const totals = useMemo(() => {
    const totalTarget = sundays.reduce((acc, s) => acc + s.totalTarget, 0);
    const totalScheduled = sundays.reduce((acc, s) => acc + s.totalScheduled, 0);
    const totalExpected = sundays.reduce((acc, s) => acc + s.totalConfirmed, 0);
    const totalVariance = totalExpected - totalTarget;
    const fulfillmentRate = totalTarget > 0 ? Math.round((totalExpected / totalTarget) * 100) : 100;

    return { totalTarget, totalScheduled, totalExpected, totalVariance, fulfillmentRate };
  }, [sundays]);

  if (!sundays.length) {
    return null;
  }

  const isTotalNegative = totals.totalVariance < 0;
  const isTotalPositive = totals.totalVariance > 0;

  return (
    <article className="flex flex-col rounded-xl border border-border bg-white dark:bg-surface shadow-2xs overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-white dark:bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-text truncate">Monthly Attendance Trend</h3>
              <Badge variant="outline" className="text-xs font-semibold">
                {roleGroupLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Comparing volunteer targets, scheduled roster, and expected turnup across all Sundays
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span>Avg Fulfillment:</span>
            <strong className="text-text font-bold tabular-nums">{totals.fulfillmentRate}%</strong>
          </div>
        </div>
      </div>

      {/* Chart Body */}
      <div className="p-4 sm:p-6 space-y-4">
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="var(--color-border)"
                opacity={0.6}
              />
              <XAxis
                dataKey="label"
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
              <Tooltip content={<MonthlyTrendTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 12, fontSize: 12 }}
                iconType="circle"
                iconSize={8}
              />
              <Area
                type="monotone"
                dataKey="expected"
                name="Expected Turnup"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="#10b981"
                fillOpacity={0.15}
                dot={{ r: 4, fill: '#10b981', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="scheduled"
                name="Scheduled"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Target Quota"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 4, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Footer Metrics Strip */}
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-lg border border-border/70 bg-surface-hover/30 p-3 text-center">
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Month Target</div>
            <div className="mt-0.5 text-base font-bold text-text tabular-nums">
              {totals.totalTarget}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Month Scheduled</div>
            <div className="mt-0.5 text-base font-bold text-text tabular-nums">
              {totals.totalScheduled}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Month Expected</div>
            <div className="mt-0.5 text-base font-bold text-text tabular-nums">
              {totals.totalExpected}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-muted uppercase">Net Variance</div>
            <div className="mt-0.5">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                  isTotalNegative
                    ? 'bg-danger/15 text-danger'
                    : isTotalPositive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted/15 text-text font-bold'
                }`}
              >
                {isTotalPositive ? `+${totals.totalVariance}` : totals.totalVariance}
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
