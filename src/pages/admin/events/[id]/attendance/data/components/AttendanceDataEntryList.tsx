import { useState } from 'react';

import { ExternalLink, Users } from 'lucide-react';

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
import type { AttendanceAnswer, RegistrantAttendanceRow } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import type { RegistrantViewGroup } from '@/lib/domain/attendance-views';

import { AttendanceDataEntryPanel } from './AttendanceDataEntryPanel';

type AttendanceDataEntryListProps = {
  eventId: string;
  registrants: RegistrantAttendanceRow[];
  groups?: RegistrantViewGroup[];
  fields: AttendanceField[];
};

function getAnswerDisplay(answers: AttendanceAnswer[], fieldId: string): string {
  const answer = answers.find((a) => a.attendance_field_id === fieldId);
  if (!answer) return '—';
  if (answer.answer_text !== null) return answer.answer_text;
  if (answer.answer_number !== null) return String(answer.answer_number);
  return '—';
}

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

/** List of registrants with their attendance field answers and per-registrant edit actions. */
export function AttendanceDataEntryList({
  eventId,
  registrants,
  groups,
  fields,
}: AttendanceDataEntryListProps) {
  const [editingRegistrant, setEditingRegistrant] = useState<RegistrantAttendanceRow | null>(null);

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
      const total = fields.length;
      const isComplete = total > 0 && filled === total;

      return (
        <ListTableRow
          key={rowKey}
          className="cursor-pointer"
          onClick={() => setEditingRegistrant(registrant)}
        >
          <ListTableCell className="px-6">
            <div className="flex items-start gap-2">
              <a
                href={getRegistrationDetailsUrl(eventId, registrant)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 flex-shrink-0 text-primary transition-colors hover:text-primary/80"
                title="View registration details"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <div>
                <span className="font-medium text-text">{registrant.full_name}</span>
                {registrant.email && (
                  <span className="ml-2 text-xs text-muted">{registrant.email}</span>
                )}
              </div>
            </div>
          </ListTableCell>
          <ListTableCell>
            <span className="font-mono text-xs text-muted">{registrant.member_id ?? 'Guest'}</span>
          </ListTableCell>
          {fields.slice(0, 3).map((field) => (
            <ListTableCell key={field.id}>
              <span className="text-sm text-text">
                {getAnswerDisplay(registrant.answers, field.id)}
              </span>
            </ListTableCell>
          ))}
          {fields.length > 3 && <ListTableCell>…</ListTableCell>}
          <ListTableCell>
            <span
              className={`text-xs font-medium ${isComplete ? 'text-secondary' : filled > 0 ? 'text-accent' : 'text-muted'}`}
            >
              {total === 0 ? 'N/A' : `${filled}/${total}`}
            </span>
          </ListTableCell>
          <ListTableCell onClick={(e) => e.stopPropagation()}>
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
                  {fields.slice(0, 3).map((field) => (
                    <ListTableHeaderCell key={field.id}>{field.label}</ListTableHeaderCell>
                  ))}
                  {fields.length > 3 && <ListTableHeaderCell>…</ListTableHeaderCell>}
                  <ListTableHeaderCell>Progress</ListTableHeaderCell>
                  <ListTableHeaderCell>Actions</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>{renderRows(group.registrants)}</ListTableBody>
            </ListTable>
          </section>
        ))}
      </div>

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
