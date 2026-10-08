import { useState } from 'react';

import { CheckCircle2, SlidersHorizontal, Users } from 'lucide-react';

import { Badge, Button } from '@/components/ui';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import type { ExcusedMemberMap } from '@/lib/domain/hub-calendar';
import type { MemberAttendanceStats } from '@/lib/domain/members';

import {
  type ConfidenceThresholds,
  DEFAULT_CONFIDENCE_THRESHOLDS,
} from '../utils/hubCalendarForecastUtils';
import {
  DEFAULT_VOLUNTEER_TARGETS_BY_SLOT,
  type VolunteerTargetsBySlot,
  calculateAllSundayStaffingNeeds,
  calculateSlotStaffingNeeds,
} from '../utils/volunteerStaffingUtils';
import { VolunteerStaffingTargetsModal } from './VolunteerStaffingTargetsModal';

export type VolunteerStaffingModelerProps = {
  entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]>;
  activeSlot: TimeSlot | 'ALL';
  excusedMap?: ExcusedMemberMap;
  attendanceScoreMap?: Map<string, MemberAttendanceStats>;
  isoDateKey: string;
  targets: VolunteerTargetsBySlot;
  onSaveTargets: (newTargets: VolunteerTargetsBySlot) => void;
  thresholds?: ConfidenceThresholds;
  onSaveThresholds?: (newThresholds: ConfidenceThresholds) => void;
};

export function VolunteerStaffingModeler({
  entriesByTimeSlot,
  activeSlot,
  excusedMap,
  attendanceScoreMap,
  isoDateKey,
  targets,
  onSaveTargets,
  thresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
  onSaveThresholds,
}: VolunteerStaffingModelerProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const currentForecast =
    activeSlot === 'ALL'
      ? calculateAllSundayStaffingNeeds(
          entriesByTimeSlot,
          excusedMap,
          isoDateKey,
          targets,
          attendanceScoreMap,
          thresholds,
        )
      : calculateSlotStaffingNeeds(
          entriesByTimeSlot[activeSlot] || [],
          excusedMap,
          isoDateKey,
          activeSlot,
          targets[activeSlot] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT[activeSlot],
          attendanceScoreMap,
          thresholds,
        );

  return (
    <div className="flex flex-col rounded-xl border border-border bg-white dark:bg-surface shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-border bg-white dark:bg-surface">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base font-bold text-text">Volunteer Staffing Forecast</h4>
              {currentForecast.totalNeeded > 0 ? (
                <Badge variant="accent">{currentForecast.totalNeeded} Still Needed</Badge>
              ) : (
                <Badge>
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5 inline" />
                  Target Met
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              Modeled gap based on realistic turnup rates and role quotas
            </p>
          </div>
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsConfigOpen(true)}
            className="w-full sm:w-auto justify-center"
          >
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            Configure Targets
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Overall Summary Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 rounded-xl bg-surface-hover/40 border border-border/60 p-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="inline-flex items-center gap-1.5">
              <span className="text-muted">Total Target:</span>
              <strong className="font-semibold text-text">{currentForecast.totalTarget}</strong>
            </div>

            <div className="inline-flex items-center gap-1.5">
              <span className="text-muted">Expected Turnup:</span>
              <strong className="font-semibold text-text">
                ~{currentForecast.totalExpectedTurnup}
              </strong>
              <span className="text-[11px] text-muted">
                ({currentForecast.totalCommitted} scheduled
                {currentForecast.totalExcused > 0
                  ? `, ${currentForecast.totalExcused} excused`
                  : ''}
                )
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-start gap-2 pt-1 lg:pt-0 shrink-0">
            <span className="text-muted">Fulfillment:</span>
            <div className="h-2 flex-1 sm:w-36 rounded-full bg-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  currentForecast.totalNeeded === 0 ? 'bg-emerald-500' : 'bg-primary'
                }`}
                style={{
                  width: `${Math.min(100, Math.max(0, currentForecast.overallFulfillmentPercentage))}%`,
                }}
              />
            </div>
            <strong className="font-semibold text-text tabular-nums">
              {currentForecast.overallFulfillmentPercentage}%
            </strong>
          </div>
        </div>

        {/* Role Breakdown Grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {currentForecast.roleBreakdown.map((item) => {
            const isFilled = item.needed === 0 && item.target > 0;
            const hasDeficit = item.needed > 0;

            return (
              <div
                key={item.role}
                className="flex flex-col justify-between rounded-xl border border-border bg-white dark:bg-surface p-3.5 transition-colors shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-xs text-text truncate" title={item.role}>
                    {item.role}
                  </span>
                  {hasDeficit ? (
                    <Badge variant="accent">Need {item.needed}</Badge>
                  ) : isFilled ? (
                    <Badge>Filled</Badge>
                  ) : (
                    <Badge variant="primaryOutline">No Target</Badge>
                  )}
                </div>

                <div className="mt-3.5 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-muted text-[11px]">
                    <span>Target: {item.target}</span>
                    <span className="font-semibold text-text">~{item.expectedTurnup} expected</span>
                  </div>

                  <div className="h-1.5 w-full rounded-full bg-border/60 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hasDeficit ? 'bg-accent' : isFilled ? 'bg-primary' : 'bg-muted'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(0, item.fulfillmentPercentage))}%`,
                      }}
                    />
                  </div>

                  <p className="text-[10px] text-muted truncate">
                    {item.committed} scheduled
                    {item.excused > 0 ? ` • ${item.excused} excused` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <VolunteerStaffingTargetsModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        targets={targets}
        onSaveTargets={onSaveTargets}
        thresholds={thresholds}
        onSaveThresholds={onSaveThresholds}
        initialSlot={activeSlot === 'ALL' ? '9AM' : activeSlot}
      />
    </div>
  );
}
