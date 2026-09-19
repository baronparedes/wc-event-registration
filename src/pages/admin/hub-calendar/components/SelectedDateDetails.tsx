import { CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Badge, EmptyState, SectionCard } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import {
  type ExcusedMemberMap,
  type MilestoneEntry,
  isMemberExcused,
  toIsoDateKey,
} from '@/lib/domain/hub-calendar';

import { ExportSundaySchedulesButton } from './ExportSundaySchedulesButton';
import { MilestoneAvatar } from './MilestoneAvatar';
import { MilestoneBadge } from './MilestoneBadge';
import { ServiceScheduleAvatar } from './ServiceScheduleAvatar';

function formatSelectedDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const TIME_SLOT_TABS: { slot: TimeSlot; label: string }[] = [
  { slot: '9AM', label: '9:00 AM' },
  { slot: '12NN', label: '12:00 NN' },
  { slot: '3PM', label: '3:00 PM' },
];

type SelectedDateDetailsProps = {
  viewYear: number;
  viewMonthIndex: number;
  selectedDayNumber: number;
  selectedMilestones: MilestoneEntry[];
  selectedEntries: MemberScheduleEntry[];
  entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]>;
  isCurrentSelectedSunday: boolean;
  excusedMap?: ExcusedMemberMap;
  activeTab: TimeSlot;
  selectedRole: string | null;
  onTabChange: (slot: TimeSlot) => void;
  onRoleChange: (role: string | null) => void;
};

export function SelectedDateDetails({
  viewYear,
  viewMonthIndex,
  selectedDayNumber,
  selectedMilestones,
  selectedEntries,
  entriesByTimeSlot,
  isCurrentSelectedSunday,
  excusedMap,
  activeTab,
  selectedRole,
  onTabChange,
  onRoleChange,
}: SelectedDateDetailsProps) {
  const navigate = useNavigate();

  function renderMemberList(slot: TimeSlot) {
    const entries = entriesByTimeSlot[slot];
    if (entries.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted">
          No members scheduled for this service.
        </p>
      );
    }

    const isoDateKey = toIsoDateKey(viewYear, viewMonthIndex + 1, selectedDayNumber);
    const hasExcusedMembers = entries.some((e) =>
      isMemberExcused(excusedMap, isoDateKey, e.member, slot),
    );

    const EXCUSED_ROLE_FILTER = 'Excused';
    const uniqueRoles = Array.from(new Set(entries.map((e) => e.member.role).filter(Boolean)))
      .filter((role) => role !== EXCUSED_ROLE_FILTER)
      .sort();

    const filteredEntries =
      selectedRole === null
        ? entries
        : selectedRole === EXCUSED_ROLE_FILTER
          ? entries.filter((e) => isMemberExcused(excusedMap, isoDateKey, e.member, slot))
          : entries.filter((e) => e.member.role === selectedRole);

    return (
      <div className="flex flex-col gap-4">
        {(uniqueRoles.length > 1 || hasExcusedMembers) && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onRoleChange(null)}
              className={`min-w-24 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedRole === null
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() =>
                onRoleChange(selectedRole === EXCUSED_ROLE_FILTER ? null : EXCUSED_ROLE_FILTER)
              }
              className={`min-w-24 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedRole === EXCUSED_ROLE_FILTER
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-muted hover:text-text'
              }`}
            >
              Excused
            </button>
            {uniqueRoles.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => onRoleChange(role === selectedRole ? null : role)}
                className={`min-w-24 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedRole === role
                    ? 'bg-primary text-white'
                    : 'bg-surface border border-border text-muted hover:text-text'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        )}
        {filteredEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            {selectedRole === EXCUSED_ROLE_FILTER
              ? 'No excused members for this service.'
              : 'No members for this role.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredEntries.map((entry) => (
              <button
                type="button"
                key={entry.member.id}
                onClick={() =>
                  navigate(ROUTE_PATHS.adminMemberDetailPattern.replace(':id', entry.member.id))
                }
                className="flex flex-col items-center gap-2 rounded-xl border border-border p-3 hover:bg-primary/5 hover:border-primary/30 transition text-center"
              >
                <ServiceScheduleAvatar
                  size="md"
                  name={entry.member.full_name}
                  avatarObjectKey={entry.member.avatar_object_key}
                  className="border-2 border-surface shadow-sm"
                  excused={isMemberExcused(excusedMap, isoDateKey, entry.member, slot)}
                />
                <div className="min-w-0 w-full">
                  <p className="truncate text-sm font-medium text-text">{entry.member.full_name}</p>
                  <p className="truncate text-xs text-muted">{entry.member.member_id}</p>
                  {entry.member.role && (
                    <p className="mt-1 truncate text-xs font-medium text-primary/70">
                      {entry.member.role}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <SectionCard
      title="Selected Date Details"
      subtitle={formatSelectedDate(viewYear, viewMonthIndex, selectedDayNumber)}
    >
      <div className="space-y-8">
        {/* Section 1: Member Milestones */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 mb-4 gap-2">
            <div>
              <h3 className="font-heading text-lg font-semibold text-text">
                Birthdays &amp; Wedding Anniversaries
              </h3>
              <p className="text-xs text-muted">Member milestones celebrated on this day</p>
            </div>
            {selectedMilestones.length > 0 && (
              <div className="flex items-center gap-2 justify-end">
                <Badge variant="outline" className="text-xs">
                  {selectedMilestones.length} milestone
                  {selectedMilestones.length === 1 ? '' : 's'}
                </Badge>
              </div>
            )}
          </div>

          {selectedMilestones.length === 0 ? (
            <p className="py-3 text-sm text-muted">
              No birthdays or wedding anniversaries on this date.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {selectedMilestones.map((milestone) => (
                <div
                  key={milestone.id}
                  onClick={() =>
                    navigate(
                      ROUTE_PATHS.adminMemberDetailPattern.replace(':id', milestone.member.id),
                    )
                  }
                  className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-primary/5 hover:border-primary/30 transition cursor-pointer"
                >
                  <MilestoneAvatar
                    size="md"
                    name={milestone.member.full_name}
                    avatarObjectKey={milestone.member.avatar_object_key}
                    type={milestone.type}
                    className="shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-text">
                        {milestone.member.full_name}
                      </p>
                      <MilestoneBadge type={milestone.type} />
                    </div>
                    <p className="mt-1 truncate text-xs text-muted">
                      {milestone.member.member_id} • {milestone.member.nickname || 'No nickname'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Service Schedules */}
        <div className="pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border pb-3 mb-4 gap-2">
            <div>
              <h3 className="font-heading text-lg font-semibold text-text">Service Schedules</h3>
              <p className="text-xs text-muted">
                {isCurrentSelectedSunday
                  ? 'Scheduled service volunteers and teams for this Sunday'
                  : 'Service schedules are held on Sundays'}
              </p>
            </div>
            {isCurrentSelectedSunday && selectedEntries.length > 0 && (
              <div className="flex items-center gap-2 justify-end">
                <Badge variant="outline" className="text-xs">
                  {selectedEntries.length} scheduled
                </Badge>
                <ExportSundaySchedulesButton
                  selectedEntries={selectedEntries}
                  year={viewYear}
                  monthIndex={viewMonthIndex}
                  dayNumber={selectedDayNumber}
                  excusedMap={excusedMap}
                />
              </div>
            )}
          </div>

          {isCurrentSelectedSunday ? (
            selectedEntries.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-6 w-6" />}
                title="No schedules on this Sunday"
                description="No members are scheduled for this Sunday."
                className="px-4 py-8"
              />
            ) : (
              <div>
                <div className="flex border-b border-border mb-4">
                  {TIME_SLOT_TABS.map(({ slot, label }) => {
                    const count = entriesByTimeSlot[slot].length;
                    const isActive = activeTab === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => onTabChange(slot)}
                        className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                          isActive
                            ? 'text-primary border-b-2 border-primary -mb-px font-semibold'
                            : 'text-muted hover:text-text'
                        }`}
                      >
                        {label}
                        {count > 0 && (
                          <span
                            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold ${
                              isActive ? 'bg-primary text-white' : 'bg-muted/20 text-muted'
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {renderMemberList(activeTab)}
              </div>
            )
          ) : (
            <p className="py-3 text-sm text-muted">
              Sunday services are only scheduled on Sundays. Select a Sunday on the calendar to view
              volunteer teams.
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
