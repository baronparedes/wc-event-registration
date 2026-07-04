import { useState } from 'react';

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

import { AttendanceDataEntryPanel } from './AttendanceDataEntryPanel';

type AttendanceDataEntryListProps = {
  eventId: string;
  registrants: RegistrantAttendanceRow[];
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

/** List of registrants with their attendance field answers and per-registrant edit actions. */
export function AttendanceDataEntryList({
  eventId,
  registrants,
  fields,
}: AttendanceDataEntryListProps) {
  const [editingRegistrant, setEditingRegistrant] = useState<RegistrantAttendanceRow | null>(null);

  if (registrants.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-background px-6 py-10 text-center">
        <p className="text-sm font-medium text-muted">No registered attendees found.</p>
        <p className="mt-1 text-xs text-muted">
          Attendees who register for this event will appear here.
        </p>
      </div>
    );
  }

  return (
    <>
      <ListTable>
        <ListTableHead>
          <ListTableHeaderRow>
            <ListTableHeaderCell>Attendee</ListTableHeaderCell>
            <ListTableHeaderCell>Member ID</ListTableHeaderCell>
            {fields.slice(0, 3).map((field) => (
              <ListTableHeaderCell key={field.id}>{field.label}</ListTableHeaderCell>
            ))}
            {fields.length > 3 && <ListTableHeaderCell>…</ListTableHeaderCell>}
            <ListTableHeaderCell>Progress</ListTableHeaderCell>
            <ListTableHeaderCell>Actions</ListTableHeaderCell>
          </ListTableHeaderRow>
        </ListTableHead>
        <ListTableBody>
          {registrants.map((registrant) => {
            const filled = countFilledAnswers(registrant.answers, fields);
            const total = fields.length;
            const isComplete = total > 0 && filled === total;

            return (
              <ListTableRow key={registrant.registration_id}>
                <ListTableCell>
                  <span className="font-medium text-text">{registrant.full_name}</span>
                  {registrant.email && (
                    <span className="ml-2 text-xs text-muted">{registrant.email}</span>
                  )}
                </ListTableCell>
                <ListTableCell>
                  <span className="font-mono text-xs text-muted">{registrant.member_id}</span>
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
                <ListTableCell>
                  <ActionButton onClick={() => setEditingRegistrant(registrant)}>
                    {filled > 0 ? 'Edit' : 'Fill In'}
                  </ActionButton>
                </ListTableCell>
              </ListTableRow>
            );
          })}
        </ListTableBody>
      </ListTable>

      {editingRegistrant && (
        <AttendanceDataEntryPanel
          eventId={eventId}
          registrant={editingRegistrant}
          fields={fields}
          onClose={() => setEditingRegistrant(null)}
        />
      )}
    </>
  );
}
