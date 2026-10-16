import { useMemo } from 'react';

import { Users } from 'lucide-react';
import { Bar, CartesianGrid, ComposedChart, Legend, Line, XAxis, YAxis } from 'recharts';

import { Badge, BrandAvatar } from '@/components/ui';
import { LEGAL_CONFIG } from '@/config/constants';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';

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
    totalOverShort,
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

  const isTotalNegative = totalOverShort < 0;
  const isTotalPositive = totalOverShort > 0;

  const slotBreakdowns =
    forecast?.slotBreakdowns && forecast.slotBreakdowns.length > 0
      ? forecast.slotBreakdowns
      : [forecast];

  return (
    <div
      style={{ width: '920px', minWidth: '920px', maxWidth: '920px' }}
      className="w-[920px] min-w-[920px] max-w-[920px] shrink-0 box-border rounded-2xl border border-border bg-surface p-7 text-text shadow-xs"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div className="flex items-center gap-3.5">
          <BrandAvatar size="md" alt={LEGAL_CONFIG.appName} />
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs font-semibold">
                {ordinalLabel}
              </Badge>
              <h2 className="text-xl font-extrabold tracking-tight text-text">{formattedDate}</h2>
            </div>
            <p className="text-xs font-medium text-muted mt-0.5">
              Service Volunteer Attendance Forecast
            </p>
          </div>
        </div>

        <div>
          {hasDeficit ? (
            <Badge variant="accent" className="text-xs px-2.5 py-1 font-bold">
              {totalDeficit} Short
            </Badge>
          ) : (
            <Badge className="text-xs px-2.5 py-1 font-bold">
              Target Met{totalSurplus > 0 ? ` (+${totalSurplus})` : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Chart Overview */}
      <div className="mt-5 overflow-hidden rounded-xl border border-border/80 bg-surface">
        <div className="flex items-center justify-center gap-2 border-b border-border/60 bg-surface-hover/40 px-4 py-2 text-center">
          <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          <h3 className="text-xs font-bold tracking-wider text-text uppercase">
            {roleGroupLabel ? `${roleGroupLabel} Commitments` : 'Volunteer Commitments'} &mdash;
            Chart Overview
          </h3>
        </div>

        <div className="flex justify-center p-3">
          <ComposedChart
            width={850}
            height={220}
            data={chartData}
            margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.7} />
            <XAxis
              dataKey="session"
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#334155', fontSize: 12, fontWeight: 600 }}
              dy={6}
            />
            <YAxis
              tickLine={false}
              axisLine={{ stroke: '#cbd5e1' }}
              tick={{ fill: '#64748b', fontSize: 11 }}
              dx={-4}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
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
            />
          </ComposedChart>
        </div>
      </div>

      {/* 3 Session Overview Cards */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {sessions.map((session) => {
          const sessionDeficit = session.overShort < 0;
          const sessionSurplus = session.overShort > 0;
          const sessionLabel =
            session.slot === '9AM' ? '9 AM' : session.slot === '12NN' ? '12 NN' : '3 PM';

          return (
            <div
              key={session.slot}
              className="flex flex-col justify-between rounded-xl border border-border/80 bg-surface-hover/20 p-3 shadow-2xs"
            >
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <span className="text-xs font-bold text-text uppercase tracking-wide">
                  {sessionLabel} Session
                </span>
                {sessionDeficit ? (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums bg-danger/15 text-danger">
                    {session.overShort} Short
                  </span>
                ) : sessionSurplus ? (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums bg-primary/15 text-primary">
                    +{session.overShort} Surplus
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums bg-muted/15 text-muted">
                    Target Met
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1 pt-2.5 text-center">
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase">Target</div>
                  <div className="mt-0.5 text-sm font-bold text-text tabular-nums">
                    {session.target}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase">Scheduled</div>
                  <div className="mt-0.5 text-sm font-bold text-text tabular-nums">
                    {session.scheduled}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-muted uppercase">Expected</div>
                  <div className="mt-0.5 text-sm font-bold text-text tabular-nums">
                    {session.confirmed}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Sunday Totals Summary Strip */}
      <div className="mt-3 grid grid-cols-4 rounded-lg border border-border/70 bg-surface-hover/30 p-2.5 text-center">
        <div>
          <div className="text-[10px] font-bold text-muted uppercase">Total Target</div>
          <div className="mt-0.5 text-xs font-bold text-text tabular-nums">{totalTarget}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted uppercase">Total Scheduled</div>
          <div className="mt-0.5 text-xs font-bold text-text tabular-nums">{totalScheduled}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted uppercase">Total Expected</div>
          <div className="mt-0.5 text-xs font-bold text-text tabular-nums">{totalConfirmed}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-muted uppercase">Staffing Status</div>
          <div className="mt-0.5">
            {totalDeficit !== undefined && totalDeficit > 0 ? (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums bg-danger/15 text-danger">
                -{totalDeficit} Short
              </span>
            ) : (
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums ${
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

      {/* Stacked Per-Slot Individual Role Breakdown */}
      {slotBreakdowns.length > 0 && (
        <div className="mt-5 pt-4 border-t border-border/60 space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
              <span>Individual Role Breakdown</span>
            </div>
          </div>

          {slotBreakdowns.map((slotGroup) => {
            const slotKey = slotGroup.slot ?? 'ALL';
            const slotLabel =
              slotKey === '9AM'
                ? '9 AM'
                : slotKey === '12NN'
                  ? '12 NN'
                  : slotKey === '3PM'
                    ? '3 PM'
                    : slotKey;
            const slotTitle = slotKey === 'ALL' ? 'All Sessions' : `${slotLabel} Session`;
            const slotNeeded = slotGroup.totalNeeded ?? 0;
            const slotTarget = slotGroup.totalTarget ?? 0;
            const isSlotFilled = slotNeeded === 0 && slotTarget > 0;
            const slotDeficit = slotNeeded > 0;

            return (
              <div key={slotKey} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-text uppercase tracking-wide">
                    {slotTitle}
                  </span>
                  {slotDeficit ? (
                    <Badge variant="accent" className="text-xs px-2 py-0.5">
                      {slotNeeded} Short
                    </Badge>
                  ) : isSlotFilled ? (
                    <Badge className="text-xs px-2 py-0.5">Target Met</Badge>
                  ) : (
                    <Badge variant="primaryOutline" className="text-xs px-2 py-0.5">
                      No Target
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2.5">
                  {slotGroup.roleBreakdown.map((item) => {
                    const isFilled = item.needed === 0 && item.target > 0;
                    const roleDeficit = item.needed > 0;

                    return (
                      <div
                        key={item.role}
                        className="flex flex-col justify-between rounded-lg border border-border bg-surface-hover/20 p-2.5 text-xs"
                      >
                        <div className="flex items-start justify-between gap-1.5 min-h-[30px]">
                          <span
                            className="text-xs font-bold text-text leading-snug"
                            title={item.role}
                          >
                            {item.role}
                          </span>
                          {roleDeficit ? (
                            <Badge
                              variant="accent"
                              className="text-[10px] px-1.5 py-0.5 shrink-0 font-semibold self-start"
                            >
                              Need {item.needed}
                            </Badge>
                          ) : isFilled ? (
                            <Badge className="text-[10px] px-1.5 py-0.5 shrink-0 font-semibold self-start">
                              Filled
                            </Badge>
                          ) : (
                            <Badge
                              variant="primaryOutline"
                              className="text-[10px] px-1.5 py-0.5 shrink-0 font-semibold self-start"
                            >
                              No Target
                            </Badge>
                          )}
                        </div>

                        <div className="mt-2.5 pt-1.5 border-t border-border/30 text-[11px] text-muted flex items-center justify-between">
                          <span>Target: {item.target}</span>
                          <span className="font-medium text-text">~{item.expectedTurnup} exp</span>
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
      <div className="mt-5 pt-3 border-t border-border/40 text-center text-[10px] text-muted">
        * <span className="font-semibold">EXPECTED</span> represents turnup forecasted from 3-month
        attendance confidence scores.
      </div>
    </div>
  );
}
