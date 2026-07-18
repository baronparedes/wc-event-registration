import { useState } from 'react';

import { Check, ExternalLink, Minus, Users } from 'lucide-react';

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
import type { RegistrantViewGroup } from '@/lib/domain/attendance-views';
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
};

function countFilledAnswers(answers: AttendanceAnswer[], fields: AttendanceField[]): number {
  return fields.filter((f) => {
    const answer = answers.find((a) => a.attendance_field_id === f.id);
    return answer && (answer.answer_text !== null || answer.answer_number !== null);
  }).length;
}

function getRegistrationDetailsUrl(eventId: string, registrant: RegistrantAttendanceRow): string {
  if (registrant.attendee_kind === 'public') {
    return `/admin/events/${eventId}/public-registrations/${registrant.public_registration_id}`;
  }
  return `/admin/events/${eventId}/registrations/${registrant.registration_id}`;
}

/** List of registrants with check-in status and per-registrant edit actions. */
export function AttendanceDataEntryList({
  eventId,
  registrants,
  groups,
  fields,
  allAttendees,
  registrationFields,
}: AttendanceDataEntryListProps) {
  const [viewingRegistrant, setViewingRegistrant] = useState<RegistrantAttendanceRow | null>(null);
  const [editingRegistrant, setEditingRegistrant] = useState<RegistrantAttendanceRow | null>(null);

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
      const rowKey =
        registrant.attendee_kind === 'public'
          ? `public-${registrant.public_registration_id}`
          : `registered-${registrant.registration_id}`;
      const filled = countFilledAnswers(registrant.answers, fields);
      const isCheckedIn = registrant.check_in_status === 'checked_in';

      return (
        <ListTableRow
          key={rowKey}
          className="cursor-pointer"
          onClick={() => setViewingRegistrant(registrant)}
        >
          <ListTableCell className="px-6">
            <div className="flex items-start gap-2">
              <a
                href={getRegistrationDetailsUrl(eventId, registrant)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 flex-shrink-0 text-primary transition-colors hover:text-primary/80 print:hidden"
                title="View registration details"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <div>
                <span className="font-medium text-text">{registrant.full_name}</span>
                {registrant.attendee_kind === 'public' && (
                  <p className="text-xs text-muted">Guest</p>
                )}
                {registrant.email && (
                  <span className="ml-2 text-xs text-muted">{registrant.email}</span>
                )}
              </div>
            </div>
          </ListTableCell>
          <ListTableCell>
            <span className="font-mono text-xs text-muted">{registrant.member_id ?? 'Guest'}</span>
          </ListTableCell>
          <ListTableCell>
            <span className="text-sm text-text">{registrant.role?.trim() || '—'}</span>
          </ListTableCell>
          <ListTableCell>
            <span className="text-sm text-text">{registrant.category?.trim() || '—'}</span>
          </ListTableCell>
          <ListTableCell className="text-center align-middle">
            <span
              role="img"
              aria-label={isCheckedIn ? 'Checked In' : 'Not Checked In'}
              title={isCheckedIn ? 'Checked In' : 'Not Checked In'}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${
                isCheckedIn ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {isCheckedIn ? <Check className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
            </span>
          </ListTableCell>
          <ListTableCell onClick={(e) => e.stopPropagation()} className="print:hidden">
            <ActionButton onClick={() => setEditingRegistrant(registrant)}>
              {filled > 0 ? 'Edit' : 'Fill In'}
            </ActionButton>
          </ListTableCell>
        </ListTableRow>
      );
    });
  }

  return (
    <>
      <div className="space-y-4">
        {resolvedGroups.map((group) => (
          <section key={group.key} className="rounded-2xl border border-border bg-surface">
            {group.label && (
              <div className="border-b border-border px-6 py-3">
                <h3 className="font-heading text-base font-semibold text-text">{group.label}</h3>
                <p className="text-xs text-muted">
                  {group.registrants.length} attendee{group.registrants.length === 1 ? '' : 's'}
                </p>
              </div>
            )}
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell className="px-6">Attendee</ListTableHeaderCell>
                  <ListTableHeaderCell>Member ID</ListTableHeaderCell>
                  <ListTableHeaderCell>Role</ListTableHeaderCell>
                  <ListTableHeaderCell>Category</ListTableHeaderCell>
                  <ListTableHeaderCell className="text-center">Check-In Status</ListTableHeaderCell>
                  <ListTableHeaderCell className="print:hidden">Actions</ListTableHeaderCell>
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

      {editingRegistrant && (
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
