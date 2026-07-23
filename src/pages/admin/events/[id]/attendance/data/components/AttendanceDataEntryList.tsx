import { useMemo, useState } from 'react';

import { Users } from 'lucide-react';

import { EmptyState } from '@/components/ui';
import { useIsMobileViewport } from '@/hooks/utils/useIsMobileViewport';
import type {
  AttendanceAnswer,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
} from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { type DynamicFieldRef, type RegistrantViewGroup } from '@/lib/domain/attendance-views';
import type { AdminEventField } from '@/lib/domain/event-fields';

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

function getVisibleFieldValue(attendee: AttendeeSearchResult | undefined, field: DynamicFieldRef) {
  if (!attendee) {
    return '—';
  }

  if (field.source === 'member') {
    if (field.fieldKey === 'member_id') {
      return attendee.member_id?.trim() || '—';
    }

    if (field.fieldKey === 'email') {
      return attendee.email?.trim() || '—';
    }

    if (field.fieldKey === 'full_name') {
      return attendee.full_name?.trim() || '—';
    }

    return '—';
  }

  if (field.source === 'role') {
    return attendee.role?.trim() || '—';
  }

  if (field.source === 'category') {
    return attendee.category?.trim() || '—';
  }

  const answers =
    field.source === 'registration' ? attendee.registration_answers : attendee.attendance_answers;

  const answer = answers.find((item) => item.field_key === field.fieldKey);
  if (!answer) {
    return '—';
  }

  if (answer.answer_text !== null && answer.answer_text.trim().length > 0) {
    return answer.answer_text;
  }

  if (answer.answer_number !== null) {
    return String(answer.answer_number);
  }

  return '—';
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
}: AttendanceDataEntryListProps) {
  const [viewingRegistrant, setViewingRegistrant] = useState<RegistrantAttendanceRow | null>(null);
  const [editingRegistrant, setEditingRegistrant] = useState<RegistrantAttendanceRow | null>(null);
  const isMobileViewport = useIsMobileViewport();
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
      <div className="space-y-3">
        {resolvedGroups.map((group) => (
          <section
            key={group.key}
            className="overflow-hidden rounded-2xl border border-border bg-surface print:[break-inside:avoid] print:[page-break-inside:avoid]"
          >
            {group.label && (
              <div className="border-b border-border px-3 py-3">
                <h3 className="inline-flex items-center gap-2 font-heading text-base font-semibold text-text">
                  <span>{group.label}</span>
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    {group.registrants.length} attendee{group.registrants.length === 1 ? '' : 's'}
                  </span>
                </h3>
              </div>
            )}
            {isMobileViewport ? (
              <AttendanceDataMobileView
                registrants={group.registrants}
                visibleFields={visibleFields}
                fields={fields}
                attendeesByRegistrantKey={attendeesByRegistrantKey}
                canWrite={canWrite}
                onViewRegistrant={setViewingRegistrant}
                onEditRegistrant={setEditingRegistrant}
                countFilledAnswers={countFilledAnswers}
                getRegistrantKey={getRegistrantKey}
                getVisibleFieldValue={getVisibleFieldValue}
              />
            ) : (
              <AttendanceDataTableView
                registrants={group.registrants}
                visibleFields={visibleFields}
                fields={fields}
                attendeesByRegistrantKey={attendeesByRegistrantKey}
                canWrite={canWrite}
                onViewRegistrant={setViewingRegistrant}
                onEditRegistrant={setEditingRegistrant}
                countFilledAnswers={countFilledAnswers}
                getRegistrantKey={getRegistrantKey}
                getVisibleFieldValue={getVisibleFieldValue}
              />
            )}
          </section>
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
          onClose={() => setEditingRegistrant(null)}
        />
      )}
    </>
  );
}
