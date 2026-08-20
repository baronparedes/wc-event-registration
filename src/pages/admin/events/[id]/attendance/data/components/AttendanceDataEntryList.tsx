import { useMemo, useState } from 'react';

import { Grid2X2, List, Users } from 'lucide-react';

import { CollapsibleSectionCard, EmptyState } from '@/components/ui';
import { useIsMobileViewport } from '@/hooks/utils/useIsMobileViewport';
import type {
  AttendanceAnswer,
  AttendanceAnswerSummary,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
} from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import {
  type DynamicFieldRef,
  type RegistrantViewGroup,
  getVisibleFieldValue,
} from '@/lib/domain/attendance-views';
import type { AdminEventField } from '@/lib/domain/event-fields';

import { AttendanceDataCardView } from './AttendanceDataCardView';
import { AttendanceDataEntryPanel } from './AttendanceDataEntryPanel';
import { AttendanceDataMobileView } from './AttendanceDataMobileView';
import { AttendanceDataTableView } from './AttendanceDataTableView';
import { AttendeeDetailsModal } from './AttendeeDetailsModal';

type AttendanceDataEntryListProps = {
  eventId: string;
  registrants: RegistrantAttendanceRow[];
  groups?: RegistrantViewGroup[];
  fields: AttendanceField[];
  allAttendees: AttendeeSearchResult[];
  registrationFields: AdminEventField[];
  visibleFields?: DynamicFieldRef[];
  canWrite?: boolean;
  fetchImage?: boolean;
  onRegistrantAttendanceSaved?: (payload: {
    attendeeKind: 'registered' | 'public';
    registrationId: string | null;
    publicRegistrationId: string | null;
    attendanceAnswers: AttendanceAnswerSummary[];
  }) => void;
};

const DEFAULT_VISIBLE_FIELDS: DynamicFieldRef[] = [
  { source: 'member', fieldKey: 'member_id', label: 'RFID', sortOrder: 0 },
  { source: 'role', fieldKey: 'role', label: 'Role', sortOrder: 1 },
  { source: 'category', fieldKey: 'category', label: 'Category', sortOrder: 2 },
];

function countFilledAnswers(answers: AttendanceAnswer[], fields: AttendanceField[]): number {
  return fields.filter((f) => {
    const answer = answers.find((a) => a.attendance_field_id === f.id);
    return answer && (answer.answer_text !== null || answer.answer_number !== null);
  }).length;
}

function getRegistrantKey(
  registrant: Pick<
    RegistrantAttendanceRow,
    'attendee_kind' | 'registration_id' | 'public_registration_id'
  >,
): string {
  return registrant.attendee_kind === 'public'
    ? `public-${registrant.public_registration_id}`
    : `registered-${registrant.registration_id}`;
}

/** List of registrants with check-in status and per-registrant edit actions. */
export function AttendanceDataEntryList({
  eventId,
  registrants,
  groups,
  fields,
  allAttendees,
  registrationFields,
  visibleFields = DEFAULT_VISIBLE_FIELDS,
  canWrite = true,
  fetchImage = true,
  onRegistrantAttendanceSaved,
}: AttendanceDataEntryListProps) {
  const [viewingRegistrant, setViewingRegistrant] = useState<RegistrantAttendanceRow | null>(null);
  const [editingRegistrant, setEditingRegistrant] = useState<RegistrantAttendanceRow | null>(null);
  const [desktopViewMode, setDesktopViewMode] = useState<'grid' | 'table'>(() => {
    if (typeof window === 'undefined') return 'grid';
    return (
      (localStorage.getItem('wc:attendance-data:desktop-view-mode') as 'grid' | 'table') || 'grid'
    );
  });
  const isMobileViewport = useIsMobileViewport();

  const handleViewModeChange = (mode: 'grid' | 'table') => {
    setDesktopViewMode(mode);
    localStorage.setItem('wc:attendance-data:desktop-view-mode', mode);
  };
  const attendeesByRegistrantKey = useMemo(
    () => new Map(allAttendees.map((attendee) => [getRegistrantKey(attendee), attendee])),
    [allAttendees],
  );

  // Find the full attendee details for the viewing registrant
  const viewingAttendee = viewingRegistrant
    ? allAttendees.find(
        (attendee) =>
          (viewingRegistrant.registration_id &&
            attendee.registration_id === viewingRegistrant.registration_id) ||
          (viewingRegistrant.public_registration_id &&
            attendee.public_registration_id === viewingRegistrant.public_registration_id),
      )
    : null;

  const resolvedGroups =
    groups && groups.length > 0 ? groups : [{ key: 'all', label: '', registrants }];
  const totalVisible = resolvedGroups.reduce((count, group) => count + group.registrants.length, 0);

  if (totalVisible === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-12">
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title="No matching attendees"
          description="Try adjusting your role, dynamic field, or grouping filters."
        />
      </div>
    );
  }

  return (
    <>
      {!isMobileViewport && (
        <div className="mb-2 flex justify-end print:hidden">
          <button
            type="button"
            role="switch"
            aria-checked={desktopViewMode === 'table'}
            aria-label={`Switch to ${desktopViewMode === 'grid' ? 'table' : 'grid'} view`}
            title={`${desktopViewMode === 'grid' ? 'Grid' : 'Table'} view; click to switch`}
            onClick={() => handleViewModeChange(desktopViewMode === 'grid' ? 'table' : 'grid')}
            className="relative inline-flex h-7 w-20 items-center rounded-full bg-primary p-0.5 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <span
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary shadow-sm transition-transform ${
                desktopViewMode === 'table' ? 'translate-x-11' : 'translate-x-1'
              }`}
            >
              {desktopViewMode === 'table' ? (
                <List className="h-3 w-3" aria-hidden="true" />
              ) : (
                <Grid2X2 className="h-3 w-3" aria-hidden="true" />
              )}
            </span>
          </button>
        </div>
      )}
      <div className="space-y-3">
        {resolvedGroups.map((group) => (
          <div key={group.key}>
            <CollapsibleSectionCard
              title={
                <span className="inline-flex items-center gap-2">
                  <span>{group.label || 'All attendees'}</span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {group.registrants.length} attendee{group.registrants.length === 1 ? '' : 's'}
                  </span>
                </span>
              }
              defaultExpanded={true}
              animateContent={false}
              collapseLabel="Collapse attendee group"
              expandLabel="Expand attendee group"
              wrapperClassName="overflow-hidden rounded-2xl border border-border bg-surface print:[break-inside:avoid] print:[page-break-inside:avoid]"
              headerWrapperClassName="border-b border-border px-3 py-3 print:hidden"
              titleClassName="font-heading text-base font-semibold text-text"
            >
              {isMobileViewport ? (
                <AttendanceDataMobileView
                  registrants={group.registrants}
                  visibleFields={visibleFields}
                  fields={fields}
                  attendeesByRegistrantKey={attendeesByRegistrantKey}
                  canWrite={canWrite}
                  fetchImage={fetchImage}
                  onViewRegistrant={setViewingRegistrant}
                  onEditRegistrant={setEditingRegistrant}
                  countFilledAnswers={countFilledAnswers}
                  getRegistrantKey={getRegistrantKey}
                  getVisibleFieldValue={getVisibleFieldValue}
                />
              ) : desktopViewMode === 'table' ? (
                <AttendanceDataTableView
                  registrants={group.registrants}
                  visibleFields={visibleFields}
                  fields={fields}
                  attendeesByRegistrantKey={attendeesByRegistrantKey}
                  canWrite={canWrite}
                  fetchImage={fetchImage}
                  onViewRegistrant={setViewingRegistrant}
                  onEditRegistrant={setEditingRegistrant}
                  countFilledAnswers={countFilledAnswers}
                  getRegistrantKey={getRegistrantKey}
                  getVisibleFieldValue={getVisibleFieldValue}
                />
              ) : (
                <AttendanceDataCardView
                  registrants={group.registrants}
                  visibleFields={visibleFields}
                  fields={fields}
                  attendeesByRegistrantKey={attendeesByRegistrantKey}
                  canWrite={canWrite}
                  fetchImage={fetchImage}
                  onViewRegistrant={setViewingRegistrant}
                  onEditRegistrant={setEditingRegistrant}
                  countFilledAnswers={countFilledAnswers}
                  getRegistrantKey={getRegistrantKey}
                  getVisibleFieldValue={getVisibleFieldValue}
                />
              )}
            </CollapsibleSectionCard>
          </div>
        ))}
      </div>

      <AttendeeDetailsModal
        isOpen={viewingRegistrant !== null}
        registrant={viewingRegistrant}
        attendanceFields={fields}
        registrationFields={registrationFields}
        registrationAnswers={viewingAttendee?.registration_answers ?? []}
        onClose={() => setViewingRegistrant(null)}
      />

      {canWrite && editingRegistrant && (
        <AttendanceDataEntryPanel
          isOpen={true}
          eventId={eventId}
          registrant={editingRegistrant}
          fields={fields}
          onSaveSuccess={onRegistrantAttendanceSaved}
          onClose={() => setEditingRegistrant(null)}
        />
      )}
    </>
  );
}
