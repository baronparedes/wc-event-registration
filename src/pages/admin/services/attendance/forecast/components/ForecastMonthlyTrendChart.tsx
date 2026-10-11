import { useMemo, useState } from 'react';

import { format } from 'date-fns';
import { AlertCircle, TrendingUp } from 'lucide-react';
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
import type { TimeSlot } from '@/hooks/domain/members';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';

export type ForecastMonthlyTrendChartProps = {
  sundays: SundayForecastData[];
  roleGroupLabel?: string;
  initialSlot?: 'ALL' | TimeSlot;
};

const SESSION_OPTIONS: { id: 'ALL' | TimeSlot; label: string }[] = [
  { id: 'ALL', label: 'All Sessions' },
  { id: '9AM', label: '9 AM' },
  { id: '12NN', label: '12 NN' },
  { id: '3PM', label: '3 PM' },
];

interface TooltipPayloadItem {
  name: string;
  value: number;
  dataKey: string;
  payload: {
    id: string;
    label: string;
    shortLabel: string;
    sundayLabel: string;
    formattedDate: string;
    session: TimeSlot;
    sessionLabel: string;
    target: number;
    scheduled: number;
    expected: number;
    overShort: number;
    hasDeficit: boolean;
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
  const isNegative = data.hasDeficit;
  const isPositive = data.overShort > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-xs shadow-md space-y-2 min-w-[220px]">
      <div className="flex items-center justify-between border-b border-border pb-1.5 font-bold">
        <div>
          <div className="flex items-center gap-1">
            <span className="text-text">{data.sundayLabel}</span>
            <span className="text-muted font-normal text-[11px]">({data.formattedDate})</span>
          </div>
          <div className="text-[11px] text-primary font-semibold mt-0.5">{data.sessionLabel}</div>
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
          {isNegative
            ? `${data.overShort} Short`
            : isPositive
              ? `+${data.overShort} Surplus`
              : 'Target Met'}
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
            <span
              className={`h-2 w-2 rounded-full ${isNegative ? 'bg-rose-500' : 'bg-emerald-500'}`}
            />
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

function renderExpectedDot(props: {
  cx?: number;
  cy?: number;
  payload?: { hasDeficit: boolean; session: string };
}) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload) return null;

  if (payload.hasDeficit) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill="#f43f5e"
        stroke="#ffffff"
        strokeWidth={2}
        key={`expected-dot-${cx}-${cy}`}
      />
    );
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={3.5}
      fill="#10b981"
      stroke="#ffffff"
      strokeWidth={1.5}
      key={`expected-dot-${cx}-${cy}`}
    />
  );
}

export interface CustomXAxisTickProps {
  x?: number;
  y?: number;
  payload?: {
    value?: string;
    index?: number;
  };
  index?: number;
  chartData?: Array<{
    id: string;
    label: string;
    shortLabel: string;
    sundayLabel: string;
    sundayDate: string;
    formattedDate: string;
    session: TimeSlot;
    sessionLabel: string;
    sessionDisplay: string;
    isMiddleOfSunday: boolean;
    isFirstOfSunday: boolean;
    isLastOfSunday: boolean;
    target: number;
    scheduled: number;
    expected: number;
    overShort: number;
    hasDeficit: boolean;
    fulfillmentRate: number;
  }>;
  isAllSessions?: boolean;
}

export function CustomXAxisTick({
  x = 0,
  y = 0,
  payload,
  index,
  chartData = [],
  isAllSessions = true,
}: CustomXAxisTickProps) {
  const itemIndex = payload?.index ?? index ?? 0;
  const point = chartData[itemIndex];
  if (!point) return null;

  if (!isAllSessions) {
    // Single session view: each tick represents an individual Sunday
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={14}
          textAnchor="middle"
          fill="var(--color-text)"
          fontSize={11}
          fontWeight={700}
        >
          {point.sundayDate}
        </text>
        <text
          x={0}
          y={28}
          textAnchor="middle"
          fill="var(--color-muted)"
          fontSize={10}
          fontWeight={500}
        >
          {point.sundayLabel}
        </text>
      </g>
    );
  }

  // All Sessions view: display session slot (9 AM, 12 NN, 3 PM) and group Sunday date under 12 NN
  return (
    <g transform={`translate(${x},${y})`}>
      {/* Session time slot */}
      <text
        x={0}
        y={13}
        textAnchor="middle"
        fill="var(--color-muted)"
        fontSize={10}
        fontWeight={600}
      >
        {point.sessionDisplay}
      </text>

      {/* Grouped Sunday date badge centered under the 12 NN session */}
      {point.isMiddleOfSunday && (
        <g>
          <rect
            x={-28}
            y={20}
            width={56}
            height={19}
            rx={9.5}
            fill="var(--color-surface)"
            stroke="var(--color-primary)"
            strokeWidth={1}
          />
          <text
            x={0}
            y={33}
            textAnchor="middle"
            fill="var(--color-primary)"
            fontSize={11}
            fontWeight={700}
          >
            {point.sundayDate}
          </text>
        </g>
      )}
    </g>
  );
}

export function ForecastMonthlyTrendChart({
  sundays,
  roleGroupLabel = 'All Roles',
  initialSlot = 'ALL',
}: ForecastMonthlyTrendChartProps) {
  const [selectedSlot, setSelectedSlot] = useState<'ALL' | TimeSlot>(initialSlot);

  const chartData = useMemo(() => {
    const points: Array<{
      id: string;
      label: string;
      shortLabel: string;
      sundayLabel: string;
      sundayDate: string;
      formattedDate: string;
      session: TimeSlot;
      sessionLabel: string;
      sessionDisplay: string;
      isMiddleOfSunday: boolean;
      isFirstOfSunday: boolean;
      isLastOfSunday: boolean;
      target: number;
      scheduled: number;
      expected: number;
      overShort: number;
      hasDeficit: boolean;
      fulfillmentRate: number;
    }> = [];

    for (const s of sundays) {
      const activeSessions =
        selectedSlot === 'ALL'
          ? s.sessions
          : s.sessions.filter((sess) => sess.slot === selectedSlot);

      for (const sess of activeSessions) {
        const target = sess.target;
        const scheduled = sess.scheduled;
        const expected = sess.confirmed;
        const overShort = sess.overShort;
        const hasDeficit = overShort < 0;
        const fulfillmentRate = target > 0 ? Math.round((expected / target) * 100) : 100;
        const slotShort = sess.slot === '9AM' ? '9A' : sess.slot === '12NN' ? '12N' : '3P';
        const sessionDisplay =
          sess.slot === '9AM' ? '9 AM' : sess.slot === '12NN' ? '12 NN' : '3 PM';

        points.push({
          id: `${s.isoDateKey}-${sess.slot}`,
          label: `${format(s.date, 'MMM d')} ${sess.slot}`,
          shortLabel: `${format(s.date, 'M/d')} ${slotShort}`,
          sundayLabel: s.ordinalLabel,
          sundayDate: format(s.date, 'MMM d'),
          formattedDate: format(s.date, 'MMMM d, yyyy'),
          session: sess.slot,
          sessionLabel: `${sess.slot} Session`,
          sessionDisplay,
          isMiddleOfSunday: sess.slot === '12NN',
          isFirstOfSunday: sess.slot === '9AM',
          isLastOfSunday: sess.slot === '3PM',
          target,
          scheduled,
          expected,
          overShort,
          hasDeficit,
          fulfillmentRate,
        });
      }
    }

    return points;
  }, [sundays, selectedSlot]);

  const totals = useMemo(() => {
    let totalTarget = 0;
    let totalScheduled = 0;
    let totalExpected = 0;
    let totalDeficit = 0;
    let totalSurplus = 0;
    let sessionsWithDeficit = 0;

    for (const point of chartData) {
      totalTarget += point.target;
      totalScheduled += point.scheduled;
      totalExpected += point.expected;
      if (point.hasDeficit) {
        totalDeficit += Math.abs(point.overShort);
        sessionsWithDeficit++;
      } else if (point.overShort > 0) {
        totalSurplus += point.overShort;
      }
    }

    const totalVariance = totalExpected - totalTarget;
    const fulfillmentRate = totalTarget > 0 ? Math.round((totalExpected / totalTarget) * 100) : 100;

    return {
      totalTarget,
      totalScheduled,
      totalExpected,
      totalVariance,
      totalDeficit,
      totalSurplus,
      sessionsWithDeficit,
      fulfillmentRate,
    };
  }, [chartData]);

  if (!sundays.length) {
    return null;
  }

  return (
    <article className="flex flex-col rounded-xl border border-border bg-white dark:bg-surface shadow-2xs overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-white dark:bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-text truncate">Monthly Attendance Trend</h3>
              <Badge variant="default" className="text-xs font-semibold">
                {roleGroupLabel}
              </Badge>
              {totals.sessionsWithDeficit > 0 && (
                <Badge variant="accent" className="text-xs font-bold">
                  <AlertCircle className="mr-1 h-3 w-3 inline" />
                  {totals.sessionsWithDeficit} Session
                  {totals.sessionsWithDeficit > 1 ? 's' : ''} Short
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Service sessions (9 AM, 12 NN, 3 PM) compared against target staffing quotas
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 shrink-0 w-full sm:w-auto">
          {/* Session Slot Toggle */}
          <div
            role="group"
            aria-label="Session filter"
            className="inline-flex items-center rounded-lg border border-border bg-surface-hover/50 p-0.5"
          >
            {SESSION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedSlot(opt.id)}
                aria-pressed={selectedSlot === opt.id}
                className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  selectedSlot === opt.id
                    ? 'bg-primary text-white shadow-xs font-bold'
                    : 'text-muted hover:text-text hover:bg-surface-hover/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted">
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
                height={52}
                interval={0}
                tick={
                  <CustomXAxisTick chartData={chartData} isAllSessions={selectedSlot === 'ALL'} />
                }
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
                dot={renderExpectedDot}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="scheduled"
                name="Scheduled"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 1.5 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Target Quota"
                stroke="#f59e0b"
                strokeWidth={2.5}
                strokeDasharray="5 5"
                dot={{ r: 3.5, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 1.5 }}
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
            <div className="text-[11px] font-bold text-muted uppercase">Staffing Deficit</div>
            <div className="mt-0.5">
              {totals.totalDeficit > 0 ? (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums bg-danger/15 text-danger">
                  -{totals.totalDeficit} Needed ({totals.sessionsWithDeficit} Short)
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums bg-primary/15 text-primary">
                  All Targets Met{totals.totalSurplus > 0 ? ` (+${totals.totalSurplus})` : ''}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
