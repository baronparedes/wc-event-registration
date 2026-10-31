import { useMemo } from 'react';

import { Clock, Users } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, XAxis, YAxis } from 'recharts';

import { Badge, BrandAvatar } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';
import { FORECAST_CHART_COLORS, getSessionTheme } from './sessionThemes';

export type SundayForecastShareCardProps = {
  sunday: SundayForecastData;
  roleGroupLabel?: string;
};

export function SundayForecastShareCard({ sunday, roleGroupLabel }: SundayForecastShareCardProps) {
  const {
    ordinalLabel,
    formattedDate,
    sessions,
    totalTarget,
    totalScheduled,
    totalConfirmed,
    totalDeficit,
    totalSurplus,
    hasDeficit,
    forecast,
  } = sunday;

  const chartData = useMemo(() => {
    return sessions.map((s) => ({
      session: s.slot,
      target: s.target,
      scheduled: s.scheduled,
      expected: s.confirmed,
      overShort: s.overShort,
    }));
  }, [sessions]);

  const slotBreakdowns =
    forecast?.slotBreakdowns && forecast.slotBreakdowns.length > 0
      ? forecast.slotBreakdowns
      : [forecast];

  return (
    <div
      style={{ width: '960px', minWidth: '960px', maxWidth: '960px' }}
      className="w-[960px] min-w-[960px] max-w-[960px] shrink-0 box-border rounded-2xl border border-border bg-surface p-8 text-text shadow-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3.5">
          <BrandAvatar size="md" alt={LEGAL_CONFIG.appName} />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-sm font-semibold px-2.5 py-0.5">
                {ordinalLabel}
              </Badge>
              <h2 className="text-2xl font-extrabold tracking-tight text-text">{formattedDate}</h2>
            </div>
            <p className="text-sm font-medium text-muted mt-0.5">
              Service Volunteer Attendance Forecast
            </p>
          </div>
        </div>

        <div>
          {hasDeficit ? (
            <Badge variant="accent" className="text-sm px-3 py-1 font-bold">
              {totalDeficit} Short
            </Badge>
          ) : (
            <Badge className="text-sm px-3 py-1 font-bold">
              Target Met{totalSurplus > 0 ? ` (+${totalSurplus})` : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Unified Top Summary Banner */}
      <div className="mt-5 grid grid-cols-4 gap-3 rounded-xl border border-border/80 bg-surface-hover/20 p-3 text-center">
        <div className="flex flex-col rounded-lg border border-border/70 bg-surface p-2.5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Total Target
          </span>
          <span className="mt-1 text-2xl font-black tabular-nums text-text">{totalTarget}</span>
        </div>
        <div className="flex flex-col rounded-lg border border-border/70 bg-surface p-2.5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Total Scheduled
          </span>
          <span className="mt-1 text-2xl font-black tabular-nums text-text">{totalScheduled}</span>
        </div>
        <div className="flex flex-col rounded-lg border border-border/70 bg-surface p-2.5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Total Expected
          </span>
          <span className="mt-1 text-2xl font-black tabular-nums text-text">~{totalConfirmed}</span>
        </div>
        <div className="flex flex-col rounded-lg border border-border/70 bg-surface p-2.5 shadow-2xs">
          <span className="text-xs font-bold uppercase tracking-wider text-muted">
            Staffing Status
          </span>
          <div className="mt-1 flex items-center justify-center">
            {hasDeficit ? (
              <Badge variant="accent" className="font-bold text-xs px-2.5 py-1">
                {totalDeficit} Short
              </Badge>
            ) : (
              <Badge className="font-bold text-xs px-2.5 py-1">
                Target Met{totalSurplus > 0 ? ` (+${totalSurplus})` : ''}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Chart Overview */}
      <div className="mt-5 overflow-hidden rounded-xl border border-border/80 bg-surface">
        <div className="flex items-center justify-center gap-2 border-b border-border/60 bg-surface-hover/40 px-4 py-2.5 text-center">
          <Users className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 className="text-sm font-bold tracking-wider text-text uppercase">
            {roleGroupLabel ? `${roleGroupLabel} Commitments` : 'Volunteer Commitments'} &mdash;
            Chart Overview
          </h3>
        </div>

        <div className="flex justify-center p-3">
          <ComposedChart
            width={890}
            height={240}
            data={chartData}
            margin={{ top: 15, right: 20, left: -5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
            <XAxis
              dataKey="session"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#334155', fontSize: 13, fontWeight: 700 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
              dx={-4}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 10, fontSize: 13, fontWeight: 600 }}
              iconType="circle"
              iconSize={10}
            />
            <Bar
              dataKey="scheduled"
              name="Scheduled"
              fill={FORECAST_CHART_COLORS.scheduled}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
            <Bar
              dataKey="expected"
              name="Expected Turnup"
              fill={FORECAST_CHART_COLORS.expected}
              radius={[4, 4, 0, 0]}
              maxBarSize={48}
            />
            <Line
              type="step"
              dataKey="target"
              name="Target"
              stroke={FORECAST_CHART_COLORS.target}
              strokeWidth={3}
              strokeDasharray="5 5"
              dot={{ r: 5, fill: FORECAST_CHART_COLORS.target, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </ComposedChart>
        </div>
      </div>

      {/* 3 Session Overview Cards */}
      <div className="mt-5 grid grid-cols-3 gap-3.5">
        {sessions.map((session) => {
          const sessionDeficit = session.overShort < 0;
          const sessionSurplus = session.overShort > 0;
          const theme = getSessionTheme(session.slot);
          const sessionLabel = theme.slotLabel;

          return (
            <div
              key={session.slot}
              className={`flex flex-col justify-between rounded-xl border border-border/80 border-l-4 ${theme.borderAccent} bg-surface-hover/20 p-3.5 shadow-2xs`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${theme.dotColor}`}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-bold text-text uppercase tracking-wide">
                    {sessionLabel} Session
                  </span>
                  <span
                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}
                  >
                    {theme.tag}
                  </span>
                </div>
                {sessionDeficit ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums bg-danger/15 text-danger">
                    {session.overShort} Short
                  </span>
                ) : sessionSurplus ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums bg-primary/15 text-primary">
                    +{session.overShort} Surplus
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums bg-muted/15 text-muted">
                    Target Met
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1 pt-2.5 text-center">
                <div>
                  <div className="text-xs font-bold text-muted uppercase">Target</div>
                  <div className="mt-0.5 text-lg font-bold text-text tabular-nums">
                    {session.target}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted uppercase">Scheduled</div>
                  <div className="mt-0.5 text-lg font-bold text-text tabular-nums">
                    {session.scheduled}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-muted uppercase">Expected</div>
                  <div className="mt-0.5 text-lg font-bold text-text tabular-nums">
                    {session.confirmed}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stacked Per-Slot Individual Role Breakdown */}
      {slotBreakdowns.length > 0 && (
        <div className="mt-5 pt-5 border-t border-border/60 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Individual Role Breakdown</span>
            </div>
          </div>

          {slotBreakdowns.map((slotGroup) => {
            const slotKey = slotGroup.slot ?? (sessions.length === 1 ? sessions[0].slot : 'ALL');
            const theme = getSessionTheme(slotKey);
            const slotLabel = theme.slotLabel;
            const slotTitle = slotKey === 'ALL' ? 'All Sessions' : `${slotLabel} Session`;
            const slotNeeded = slotGroup.totalNeeded ?? 0;
            const slotTarget = slotGroup.totalTarget ?? 0;
            const slotExpected = slotGroup.totalExpectedTurnup ?? 0;
            const isSlotFilled = slotNeeded === 0 && slotTarget > 0;
            const slotDeficit = slotNeeded > 0;

            return (
              <div
                key={slotKey}
                className={`rounded-xl border border-border/80 border-l-4 ${theme.borderAccent} bg-surface-hover/10 p-3.5 space-y-3`}
              >
                {/* Session Header Strip */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-md ${theme.iconBg}`}
                    >
                      <Clock className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-bold text-text uppercase tracking-wide">
                        {slotTitle}
                      </h4>
                      <span
                        className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${theme.badge}`}
                      >
                        {theme.tag}
                      </span>
                    </div>
                  </div>

                  {/* Right: Quick Session Stats & Status Badge */}
                  <div className="flex items-center gap-2.5">
                    {slotTarget > 0 && (
                      <span className="text-xs text-muted font-medium">
                        Target:{' '}
                        <strong className="font-bold text-text tabular-nums">{slotTarget}</strong>{' '}
                        &bull; Expected:{' '}
                        <strong className="font-bold text-text tabular-nums">
                          ~{slotExpected}
                        </strong>
                      </span>
                    )}
                    {slotDeficit ? (
                      <Badge
                        variant="accent"
                        className="text-xs px-2.5 py-1 font-bold whitespace-nowrap"
                      >
                        {slotNeeded} Short
                      </Badge>
                    ) : isSlotFilled ? (
                      <Badge className="text-xs px-2.5 py-1 font-bold whitespace-nowrap">
                        Target Met
                      </Badge>
                    ) : (
                      <Badge
                        variant="primaryOutline"
                        className="text-xs px-2.5 py-1 whitespace-nowrap"
                      >
                        No Target
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {slotGroup.roleBreakdown.map((item) => {
                    const isFilled = item.needed === 0 && item.target > 0;
                    const roleDeficit = item.needed > 0;
                    const percent =
                      item.fulfillmentPercentage ??
                      (item.target > 0
                        ? Math.min(100, Math.round((item.expectedTurnup / item.target) * 100))
                        : 100);

                    return (
                      <div
                        key={item.role}
                        className="flex flex-col justify-between rounded-xl border border-border bg-surface p-3 shadow-2xs transition-all"
                      >
                        {/* Top Row: Role Name Bold on Left, Status Badge on Right */}
                        <div className="flex items-start justify-between gap-2 min-h-[32px]">
                          <span
                            className="text-sm font-bold text-text leading-snug break-words"
                            title={item.role}
                          >
                            {item.role}
                          </span>
                          {roleDeficit ? (
                            <Badge
                              variant="accent"
                              className="text-xs px-2 py-0.5 shrink-0 font-bold self-start whitespace-nowrap"
                            >
                              Need {item.needed}
                            </Badge>
                          ) : isFilled ? (
                            <Badge className="text-xs px-2 py-0.5 shrink-0 font-bold self-start whitespace-nowrap">
                              Filled
                            </Badge>
                          ) : (
                            <Badge
                              variant="primaryOutline"
                              className="text-xs px-2 py-0.5 shrink-0 font-medium self-start whitespace-nowrap"
                            >
                              No Target
                            </Badge>
                          )}
                        </div>

                        {/* Bottom Row: Soft Pill Container with Metrics & Mini Color-Coded Progress Bar */}
                        <div className="mt-2.5 flex flex-col gap-2 rounded-lg border border-border/50 bg-surface-hover/50 p-2.5 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted font-medium whitespace-nowrap">
                              Target:{' '}
                              <strong className="font-bold text-text tabular-nums">
                                {item.target}
                              </strong>
                            </span>
                            <span className="font-bold text-text tabular-nums whitespace-nowrap">
                              ~{item.expectedTurnup} expected
                            </span>
                          </div>

                          {/* Mini Progress Bar */}
                          {item.target > 0 && (
                            <div className="h-2 w-full overflow-hidden rounded-full bg-border/60">
                              <div
                                className={`h-full rounded-full ${
                                  percent >= 100
                                    ? 'bg-emerald-500'
                                    : percent >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-danger'
                                }`}
                                style={{ width: `${percent}%` }}
                                role="progressbar"
                                aria-valuenow={percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${item.role} staffing fulfillment`}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-3.5 border-t border-border/40 text-center text-xs text-muted">
        * <span className="font-semibold">EXPECTED</span> represents turnup forecasted from 3-month
        attendance confidence scores.
      </div>
    </div>
  );
}
