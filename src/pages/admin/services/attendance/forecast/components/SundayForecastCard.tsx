import { useState } from 'react';

import { Calendar, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

import { Badge, Button } from '@/components/ui';

import type { SundayForecastData } from '../hooks/useAttendanceForecastData';
import { SundayCommitmentTable } from './SundayCommitmentTable';

export type SundayForecastCardProps = {
  sunday: SundayForecastData;
  tableTitle?: string;
};

export function SundayForecastCard({ sunday, tableTitle }: SundayForecastCardProps) {
  const [showRoleBreakdown, setShowRoleBreakdown] = useState(false);
  const {
    ordinalLabel,
    formattedDate,
    sessions,
    totalTarget,
    totalConfirmed,
    totalOverShort,
    hasDeficit,
    forecast,
  } = sunday;

  const totalScheduled = sessions.reduce((acc, s) => acc + s.scheduled, 0);
  const resolvedTableTitle = tableTitle ?? 'USHER/BACKROOM COMMITMENTS';

  return (
    <article className="flex flex-col rounded-xl border border-border bg-white dark:bg-surface shadow-2xs overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-col gap-2.5 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-white dark:bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                {ordinalLabel}
              </Badge>
              <h3 className="text-base font-bold text-text truncate">{formattedDate}</h3>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Service roster projection and role deficit breakdown
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-auto">
          {hasDeficit ? (
            <Badge variant="accent">{Math.abs(totalOverShort)} Short</Badge>
          ) : (
            <Badge>
              <CheckCircle2 className="mr-1 h-3.5 w-3.5 inline" />
              Target Met (+{totalOverShort})
            </Badge>
          )}
        </div>
      </div>

      {/* Body: Simplified Commitment Table */}
      <div className="p-4 sm:p-5 space-y-3">
        <SundayCommitmentTable
          title={resolvedTableTitle}
          sessions={sessions}
          totalTarget={totalTarget}
          totalScheduled={totalScheduled}
          totalConfirmed={totalConfirmed}
          totalOverShort={totalOverShort}
        />

        <p className="text-[11px] text-muted text-center">
          * <span className="font-semibold">CONFIRMED</span> represents expected attendance turnup
          forecasted from 3-month attendance confidence scores.
        </p>

        {/* Optional Collapsible Detail for Individual Roles */}
        {forecast?.roleBreakdown && forecast.roleBreakdown.length > 0 && (
          <div className="pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowRoleBreakdown((prev) => !prev)}
              className="w-full text-xs text-muted hover:text-text flex items-center justify-center gap-1.5 py-1"
            >
              <span>{showRoleBreakdown ? 'Hide' : 'Show'} Individual Role Breakdown</span>
              {showRoleBreakdown ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </Button>

            {showRoleBreakdown && (
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mt-3 pt-2">
                {forecast.roleBreakdown.map((item) => {
                  const isFilled = item.needed === 0 && item.target > 0;
                  const roleDeficit = item.needed > 0;

                  return (
                    <div
                      key={item.role}
                      className="flex flex-col justify-between rounded-lg border border-border bg-surface-hover/20 p-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="font-semibold text-text truncate" title={item.role}>
                          {item.role}
                        </span>
                        {roleDeficit ? (
                          <Badge variant="accent" className="text-[10px] px-1.5 py-0.5">
                            Need {item.needed}
                          </Badge>
                        ) : isFilled ? (
                          <Badge className="text-[10px] px-1.5 py-0.5">Filled</Badge>
                        ) : (
                          <Badge variant="primaryOutline" className="text-[10px] px-1.5 py-0.5">
                            No Target
                          </Badge>
                        )}
                      </div>

                      <div className="mt-2 text-[11px] text-muted flex items-center justify-between">
                        <span>Target: {item.target}</span>
                        <span className="font-medium text-text">~{item.expectedTurnup} exp</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
