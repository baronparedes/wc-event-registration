import { useEffect, useRef, useState } from 'react';

import { CalendarDays, Share2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import {
  Badge,
  Button,
  EmptyState,
  FormSelectField,
  SearchInputField,
  SectionCard,
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import type { MemberScheduleEntry, TimeSlot } from '@/hooks/domain/members';
import {
  type ExcusedMemberMap,
  type MilestoneEntry,
  isMemberExcused,
  toIsoDateKey,
} from '@/lib/domain/hub-calendar';
import type { MemberAttendanceStats } from '@/lib/domain/members';

import {
  type ConfidenceThresholds,
  type ConfidenceTier,
  type VolunteerTargetsBySlot,
  calculateAllSundayConfidenceForecast,
  calculateSlotConfidenceForecast,
  getConfidenceTierLabel,
  getMemberConfidenceTier,
  getMemberConfidenceTooltip,
  getStoredConfidenceThresholds,
  getStoredVolunteerTargets,
  isMemberInactiveWithoutAttendance,
} from '../utils';
import { ExportSundaySchedulesButton } from './ExportSundaySchedulesButton';
import { MilestoneAvatar } from './MilestoneAvatar';
import { MilestoneBadge } from './MilestoneBadge';
import { ServiceScheduleAvatar } from './ServiceScheduleAvatar';
import { ShareSundayScheduleDialog } from './ShareSundayScheduleDialog';
import { SlotConfidenceForecastBanner } from './SlotConfidenceForecastBanner';
import { VolunteerStaffingModeler } from './VolunteerStaffingModeler';

function formatSelectedDate(year: number, monthIndex: number, day: number): string {
  const date = new Date(year, monthIndex, day);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const TIME_SLOT_TABS: { slot: TimeSlot | 'ALL'; label: string }[] = [
  { slot: '9AM', label: '9:00 AM' },
  { slot: '12NN', label: '12:00 NN' },
  { slot: '3PM', label: '3:00 PM' },
  { slot: 'ALL', label: 'All Sunday' },
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
  attendanceScoreMap?: Map<string, MemberAttendanceStats>;
  activeTab: TimeSlot | 'ALL';
  selectedRole: string | null;
  selectedConfidence?: ConfidenceTier | null;
  searchQuery: string;
  onTabChange: (slot: TimeSlot | 'ALL') => void;
  onRoleChange: (role: string | null) => void;
  onConfidenceChange?: (tier: ConfidenceTier | null) => void;
  onSearchQueryChange: (query: string) => void;
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
  attendanceScoreMap,
  activeTab,
  selectedRole,
  selectedConfidence,
  searchQuery,
  onTabChange,
  onRoleChange,
  onConfidenceChange,
  onSearchQueryChange,
}: SelectedDateDetailsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const [internalConfidence, setInternalConfidence] = useState<ConfidenceTier | null>(null);
  const effectiveConfidence =
    selectedConfidence !== undefined ? selectedConfidence : internalConfidence;
  const handleConfidenceChange = onConfidenceChange ?? setInternalConfidence;

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [volunteerTargets, setVolunteerTargets] = useState<VolunteerTargetsBySlot>(() =>
    getStoredVolunteerTargets(),
  );
  const [confidenceThresholds, setConfidenceThresholds] = useState<ConfidenceThresholds>(() =>
    getStoredConfidenceThresholds(),
  );

  useEffect(() => {
    if (searchParams.has('date') && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [searchParams]);

  const handleTabChange = (slot: TimeSlot | 'ALL') => {
    onTabChange(slot);
  };

  function renderMemberList(slot: TimeSlot | 'ALL') {
    const entries = slot === 'ALL' ? selectedEntries : entriesByTimeSlot[slot];
    if (entries.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted">
          {slot === 'ALL'
            ? 'No members scheduled for this Sunday.'
            : 'No members scheduled for this service.'}
        </p>
      );
    }

    const isoDateKey = toIsoDateKey(viewYear, viewMonthIndex + 1, selectedDayNumber);
    const targetSlot = slot === 'ALL' ? undefined : slot;

    const uniqueRoles = Array.from(
      new Set(entries.map((e) => e.member.role).filter(Boolean)),
    ).sort();

    const filteredByConfidence =
      effectiveConfidence === null
        ? entries
        : entries.filter(
            (e) =>
              getMemberConfidenceTier(
                e.member,
                isoDateKey,
                targetSlot,
                excusedMap,
                attendanceScoreMap,
                confidenceThresholds,
              ) === effectiveConfidence,
          );

    const filteredByRole =
      selectedRole === null
        ? filteredByConfidence
        : filteredByConfidence.filter((e) => e.member.role === selectedRole);

    const query = searchQuery.trim().toLowerCase();
    const filteredEntries = query
      ? filteredByRole.filter(
          (e) =>
            (e.member.first_name && e.member.first_name.toLowerCase().includes(query)) ||
            (e.member.last_name && e.member.last_name.toLowerCase().includes(query)) ||
            (e.member.nickname && e.member.nickname.toLowerCase().includes(query)),
        )
      : filteredByRole;

    const forecast =
      slot === 'ALL'
        ? calculateAllSundayConfidenceForecast(
            entriesByTimeSlot,
            excusedMap,
            isoDateKey,
            attendanceScoreMap,
            confidenceThresholds,
          )
        : calculateSlotConfidenceForecast(
            entries,
            excusedMap,
            isoDateKey,
            targetSlot,
            attendanceScoreMap,
            confidenceThresholds,
          );

    return (
      <div className="flex flex-col gap-4">
        <SlotConfidenceForecastBanner
          forecast={forecast}
          selectedTier={effectiveConfidence}
          onSelectTier={handleConfidenceChange}
        />

        <SearchInputField
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onClear={() => onSearchQueryChange('')}
          placeholder="Search by name or nickname..."
        />

        {/* Mobile Filter Dropdowns */}
        <div className="flex flex-col gap-3 sm:hidden">
          <FormSelectField
            id="mobile-tier-filter"
            label="Reliability Tier"
            value={effectiveConfidence ?? 'all'}
            onChange={(val) =>
              handleConfidenceChange(val === 'all' ? null : (val as ConfidenceTier))
            }
            options={[
              { value: 'all', label: 'All Tiers' },
              { value: 'solid', label: 'Solid' },
              { value: 'moderate', label: 'Moderate' },
              { value: 'at_risk', label: 'At Risk' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'excused', label: 'Excused' },
            ]}
          />

          {uniqueRoles.length > 0 && (
            <FormSelectField
              id="mobile-role-filter"
              label="Role"
              value={selectedRole ?? 'all'}
              onChange={(val) => onRoleChange(val === 'all' ? null : val)}
              options={[
                { value: 'all', label: 'All Roles' },
                ...uniqueRoles.map((role) => ({ value: role, label: role })),
              ]}
            />
          )}
        </div>

        {/* Desktop Filter Tabs */}
        <div className="hidden sm:flex flex-col gap-2.5 rounded-xl border border-border/60 bg-surface-hover/20 p-3">
          {/* Status / Confidence Tiers */}
          <div className="flex flex-row items-center gap-3">
            <div className="flex-1 min-w-0">
              <Tabs
                value={effectiveConfidence ?? 'all'}
                onValueChange={(val) =>
                  handleConfidenceChange(val === 'all' ? null : (val as ConfidenceTier))
                }
              >
                <TabsList containerClassName="justify-start" className="w-auto">
                  <TabsTrigger value="all" className="text-xs py-1 px-3">
                    All Tiers
                  </TabsTrigger>
                  <TabsTrigger value="solid" className="text-xs py-1 px-3">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                    Solid
                  </TabsTrigger>
                  <TabsTrigger value="moderate" className="text-xs py-1 px-3">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />
                    Moderate
                  </TabsTrigger>
                  <TabsTrigger value="at_risk" className="text-xs py-1 px-3">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-rose-500" />
                    At Risk
                  </TabsTrigger>
                  <TabsTrigger value="inactive" className="text-xs py-1 px-3">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-zinc-400" />
                    Inactive
                  </TabsTrigger>
                  <TabsTrigger value="excused" className="text-xs py-1 px-3">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-muted" />
                    Excused
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Role Filters */}
          {uniqueRoles.length > 0 && (
            <div className="flex flex-row items-center gap-3">
              <div className="flex-1 min-w-0">
                <Tabs
                  value={selectedRole ?? 'all'}
                  onValueChange={(val) => onRoleChange(val === 'all' ? null : val)}
                >
                  <TabsList containerClassName="justify-start" className="w-auto">
                    <TabsTrigger value="all" className="text-xs py-1 px-3">
                      All Roles
                    </TabsTrigger>
                    {uniqueRoles.map((role) => (
                      <TabsTrigger key={role} value={role} className="text-xs py-1 px-3">
                        {role}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              </div>
            </div>
          )}
        </div>

        {/* Filtered Results Count & Clear Action */}
        <div className="flex items-center justify-between text-xs text-muted px-0.5">
          <span>
            Showing <strong className="font-semibold text-text">{filteredEntries.length}</strong>{' '}
            {filteredEntries.length === 1 ? 'volunteer' : 'volunteers'}
            {(effectiveConfidence !== null ||
              selectedRole !== null ||
              searchQuery.trim() !== '') && <span> (filtered from {entries.length})</span>}
          </span>
          {(effectiveConfidence !== null || selectedRole !== null || searchQuery.trim() !== '') && (
            <button
              type="button"
              onClick={() => {
                handleConfidenceChange(null);
                onRoleChange(null);
                onSearchQueryChange('');
              }}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>

        {filteredEntries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            {searchQuery
              ? 'No members match your search criteria.'
              : effectiveConfidence && selectedRole
                ? `No ${getConfidenceTierLabel(effectiveConfidence).toLowerCase()} volunteers found for role "${selectedRole}".`
                : effectiveConfidence
                  ? `No ${getConfidenceTierLabel(effectiveConfidence).toLowerCase()} volunteers for this service.`
                  : selectedRole
                    ? `No members found for role "${selectedRole}".`
                    : 'No members match the selected filters.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredEntries.map((entry) => {
              const isExcused = isMemberExcused(excusedMap, isoDateKey, entry.member, targetSlot);
              const stats = attendanceScoreMap?.get(entry.member.id);
              const isInactive = isMemberInactiveWithoutAttendance(entry.member, stats);
              const avatarTurnupRate = isInactive ? undefined : stats?.turnupRate;
              const tooltip = getMemberConfidenceTooltip(
                isExcused,
                stats,
                confidenceThresholds,
                entry.member,
              );

              return (
                <button
                  type="button"
                  key={entry.member.id}
                  onClick={() =>
                    navigate(ROUTE_PATHS.adminMemberDetailPattern.replace(':id', entry.member.id))
                  }
                  title={tooltip}
                  aria-label={`${entry.member.full_name} - ${tooltip}`}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border p-3 hover:bg-primary/5 hover:border-primary/30 transition text-center cursor-pointer"
                >
                  <ServiceScheduleAvatar
                    size="md"
                    name={entry.member.full_name}
                    avatarObjectKey={entry.member.avatar_object_key}
                    className="border-2 border-surface shadow-sm"
                    excused={isExcused}
                    turnupRate={avatarTurnupRate}
                    thresholds={confidenceThresholds}
                  />
                  <div className="min-w-0 w-full">
                    <p className="truncate text-sm font-medium text-text">
                      {entry.member.full_name}
                    </p>
                    <p className="truncate text-xs text-muted">{entry.member.member_id}</p>
                    {entry.member.role && (
                      <p className="mt-1 truncate text-xs font-medium text-primary/70">
                        {entry.member.role}
                      </p>
                    )}
                    {slot === 'ALL' && entry.timeSlots && entry.timeSlots.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                        {entry.timeSlots.map((ts) => {
                          const label =
                            ts === '9AM' ? '9:00 AM' : ts === '12NN' ? '12:00 NN' : '3:00 PM';
                          return (
                            <Badge
                              key={ts}
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0.5"
                            >
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                    {isInactive && (
                      <div className="mt-1 flex justify-center">
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-2 py-0.5 border-border/80 text-muted bg-surface-hover/60"
                        >
                          Inactive
                        </Badge>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef}>
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
            <div className="flex flex-col gap-3 border-b border-border pb-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-lg font-semibold text-text">
                    Service Schedules
                  </h3>
                  {isCurrentSelectedSunday && selectedEntries.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {selectedEntries.length} scheduled
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">
                  {isCurrentSelectedSunday
                    ? 'Scheduled service volunteers and teams for this Sunday'
                    : 'Service schedules are held on Sundays'}
                </p>
              </div>
              {isCurrentSelectedSunday && selectedEntries.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto sm:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="primaryOutline"
                    className="w-full sm:w-auto justify-center"
                    onClick={() => setIsShareOpen(true)}
                  >
                    <Share2 className="mr-1.5 h-4 w-4" />
                    Share Schedule
                  </Button>
                  <ExportSundaySchedulesButton
                    selectedEntries={selectedEntries}
                    year={viewYear}
                    monthIndex={viewMonthIndex}
                    dayNumber={selectedDayNumber}
                    excusedMap={excusedMap}
                    attendanceScoreMap={attendanceScoreMap}
                    className="w-full sm:w-auto justify-center"
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
                <div className="space-y-5">
                  {/* Slot selector tabs: 9:00 AM | 12:00 NN | 3:00 PM | All Sunday */}
                  <div>
                    <div className="border-b border-border mb-4">
                      <div
                        className="overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden overscroll-x-contain"
                        style={{ touchAction: 'pan-x' }}
                      >
                        <div className="-mb-px flex gap-6 min-w-max">
                          {TIME_SLOT_TABS.map(({ slot, label }) => {
                            const totalSlotAssignments =
                              entriesByTimeSlot['9AM'].length +
                              entriesByTimeSlot['12NN'].length +
                              entriesByTimeSlot['3PM'].length;
                            const count =
                              slot === 'ALL'
                                ? totalSlotAssignments
                                : entriesByTimeSlot[slot].length;
                            const isActive = activeTab === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => handleTabChange(slot)}
                                className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors focus:outline-none flex items-center gap-1.5 shrink-0 ${
                                  isActive
                                    ? 'border-primary text-primary font-semibold'
                                    : 'border-transparent text-muted hover:border-border hover:text-text'
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
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Staffing forecast below slot selector */}
                      <VolunteerStaffingModeler
                        entriesByTimeSlot={entriesByTimeSlot}
                        activeSlot={activeTab}
                        excusedMap={excusedMap}
                        attendanceScoreMap={attendanceScoreMap}
                        isoDateKey={toIsoDateKey(viewYear, viewMonthIndex + 1, selectedDayNumber)}
                        targets={volunteerTargets}
                        onSaveTargets={setVolunteerTargets}
                        thresholds={confidenceThresholds}
                        onSaveThresholds={setConfidenceThresholds}
                      />

                      {/* Filterable Member Directory */}
                      {renderMemberList(activeTab)}
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p className="py-3 text-sm text-muted">
                Sunday services are only scheduled on Sundays. Select a Sunday on the calendar to
                view volunteer teams.
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <ShareSundayScheduleDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        year={viewYear}
        monthIndex={viewMonthIndex}
        dayNumber={selectedDayNumber}
        entriesByTimeSlot={entriesByTimeSlot}
        excusedMap={excusedMap}
      />
    </div>
  );
}
