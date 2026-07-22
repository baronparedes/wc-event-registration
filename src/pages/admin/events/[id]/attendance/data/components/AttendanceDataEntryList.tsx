import { useMemo, useState } from 'react';

import { Check, Minus, Users } from 'lucide-react';

import { EmptyState } from '@/components/ui';
import { ActionButton } from '@/components/ui/ActionLink';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import type {
  AttendanceAnswer,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
} from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import {
  type DynamicFieldRef,
  type RegistrantViewGroup,
  toDynamicFieldToken,
} from '@/lib/domain/attendance-views';
import type { AdminEventField } from '@/lib/domain/event-fields';

import { AttendanceDataEntryPanel } from './AttendanceDataEntryPanel';
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

  function renderRows(items: RegistrantAttendanceRow[]) {
    return items.map((registrant) => {
      const rowKey = getRegistrantKey(registrant);
      const filled = countFilledAnswers(registrant.answers, fields);
      const isCheckedIn = registrant.check_in_status === 'checked_in';
      const attendee = attendeesByRegistrantKey.get(rowKey);

      return (
        <ListTableRow
          key={rowKey}
          className="group cursor-pointer border-b border-border/80 bg-white hover:bg-slate-100"
          hover="none"
          onClick={() => setViewingRegistrant(registrant)}
        >
          <ListTableCell className="sticky left-0 z-10 bg-white !px-2 !py-2 align-middle group-hover:bg-slate-100">
            <div className="flex items-center gap-1">
              <span
                role="img"
                aria-label={isCheckedIn ? 'Checked In' : 'Not Checked In'}
                title={isCheckedIn ? 'Checked In' : 'Not Checked In'}
                className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full print:hidden ${
                  isCheckedIn
                    ? 'bg-primary text-white'
                    : 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
                }`}
              >
                {isCheckedIn ? <Check className="h-2 w-2" /> : <Minus className="h-2 w-2" />}
              </span>
              <p className="truncate font-semibold text-text">{registrant.full_name}</p>
            </div>
          </ListTableCell>
          {visibleFields.map((field) => (
            <ListTableCell
              key={`${rowKey}:${field.source}:${field.fieldKey}`}
              className="whitespace-nowrap !px-2 !py-2 align-middle"
            >
              <span
                className={
                  toDynamicFieldToken(field) === 'member:member_id'
                    ? 'rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700'
                    : 'text-sm text-text'
                }
              >
                {getVisibleFieldValue(attendee, field)}
              </span>
            </ListTableCell>
          ))}
          {canWrite && (
            <ListTableCell className="whitespace-nowrap !px-2 !py-2 align-middle print:hidden">
              <div onClick={(e) => e.stopPropagation()}>
                <ActionButton onClick={() => setEditingRegistrant(registrant)}>
                  {filled > 0 ? 'Edit' : 'Fill In'}
                </ActionButton>
              </div>
            </ListTableCell>
          )}
        </ListTableRow>
      );
    });
  }

  return (
    <>
      <div className="space-y-1">
        {resolvedGroups.map((group) => (
          <section
            key={group.key}
            className="overflow-hidden rounded-2xl border border-border bg-surface print:[break-inside:avoid] print:[page-break-inside:avoid]"
          >
            {group.label && (
              <div className="border-b border-border px-3 py-3">
                <h3 className="inline-flex items-center gap-2 font-heading text-base font-semibold text-text">
                  <span>{group.label}</span>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {group.registrants.length} attendee{group.registrants.length === 1 ? '' : 's'}
                  </span>
                </h3>
              </div>
            )}
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow className="bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <ListTableHeaderCell className="sticky left-0 z-20 bg-slate-100 !px-2 !py-2">
                    Attendee
                  </ListTableHeaderCell>
                  {visibleFields.map((field) => (
                    <ListTableHeaderCell
                      key={`header:${field.source}:${field.fieldKey}`}
                      className="!px-2 !py-2"
                    >
                      {field.label}
                    </ListTableHeaderCell>
                  ))}
                  {canWrite && (
                    <ListTableHeaderCell className="!px-2 !py-2 print:hidden">
                      Actions
                    </ListTableHeaderCell>
                  )}
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>{renderRows(group.registrants)}</ListTableBody>
            </ListTable>
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
