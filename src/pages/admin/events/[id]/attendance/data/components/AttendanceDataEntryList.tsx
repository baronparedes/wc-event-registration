import { useEffect, useMemo, useRef, useState } from 'react';

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
import type { DynamicFieldRef, RegistrantViewGroup } from '@/lib/domain/attendance-views';
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
};

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

function getVisibleFieldItemSpan(index: number, total: number, columns: number): number {
  if (columns <= 1 || total <= 1) {
    return 1;
  }

  const remainder = total % columns;
  if (remainder === 0) {
    return 1;
  }

  // If one card is left on the final row, let it fill the row.
  if (remainder === 1 && index === total - 1) {
    return columns;
  }

  // If two cards are left and 4+ columns are available, split the final row in half.
  if (remainder === 2 && columns >= 4 && index >= total - 2) {
    return Math.floor(columns / 2);
  }

  return 1;
}

/** List of registrants with check-in status and per-registrant edit actions. */
export function AttendanceDataEntryList({
  eventId,
  registrants,
  groups,
  fields,
  allAttendees,
  registrationFields,
  visibleFields = [],
}: AttendanceDataEntryListProps) {
  const [viewingRegistrant, setViewingRegistrant] = useState<RegistrantAttendanceRow | null>(null);
  const [editingRegistrant, setEditingRegistrant] = useState<RegistrantAttendanceRow | null>(null);
  const visibleFieldsGridRef = useRef<HTMLDivElement | null>(null);
  const [visibleFieldColumns, setVisibleFieldColumns] = useState(1);
  const attendeesByRegistrantKey = useMemo(
    () => new Map(allAttendees.map((attendee) => [getRegistrantKey(attendee), attendee])),
    [allAttendees],
  );

  useEffect(() => {
    const grid = visibleFieldsGridRef.current;
    if (!grid) {
      return;
    }

    const minCardWidth = 250;
    const gridGap = 8;

    const updateColumns = (width: number) => {
      const nextColumns = Math.max(1, Math.floor((width + gridGap) / (minCardWidth + gridGap)));
      setVisibleFieldColumns((prev) => (prev === nextColumns ? prev : nextColumns));
    };

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateColumns(entry.contentRect.width);
      }
    });

    observer.observe(grid);
    updateColumns(grid.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [visibleFields.length]);

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
          className="cursor-pointer"
          onClick={() => setViewingRegistrant(registrant)}
        >
          <ListTableCell colSpan={6} className="px-6">
            <div className="grid items-center gap-4 grid-cols-1 lg:grid-cols-[minmax(14rem,2fr)_minmax(6rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_auto] print:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <span
                  role="img"
                  aria-label={isCheckedIn ? 'Checked In' : 'Not Checked In'}
                  title={isCheckedIn ? 'Checked In' : 'Not Checked In'}
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full mr-2 ${
                    isCheckedIn
                      ? 'bg-primary text-white'
                      : 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
                  }`}
                >
                  {isCheckedIn ? <Check className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                </span>
                <span className="font-medium text-text">{registrant.full_name}</span>
                {registrant.attendee_kind === 'public' && (
                  <p className="text-xs text-muted">Guest</p>
                )}
                {registrant.email && (
                  <span className="ml-2 text-xs text-muted">{registrant.email}</span>
                )}
              </div>
              <div>
                <span className="font-mono text-xs text-muted">
                  {registrant.member_id ?? 'Guest'}
                </span>
              </div>
              <div>
                <span className="text-sm text-text">{registrant.role?.trim() || '—'}</span>
              </div>
              <div>
                <span className="text-sm text-text">{registrant.category?.trim() || '—'}</span>
              </div>
              <div onClick={(e) => e.stopPropagation()} className="print:hidden">
                <ActionButton onClick={() => setEditingRegistrant(registrant)}>
                  {filled > 0 ? 'Edit' : 'Fill In'}
                </ActionButton>
              </div>
            </div>
            {visibleFields.length > 0 && (
              <div
                ref={visibleFieldsGridRef}
                className="mt-1 grid grid-cols-[repeat(auto-fit,minmax(min(100%,250px),1fr))] gap-2 print:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]"
              >
                {visibleFields.map((field, index) => {
                  const span = getVisibleFieldItemSpan(
                    index,
                    visibleFields.length,
                    visibleFieldColumns,
                  );

                  return (
                    <div
                      key={`${rowKey}:${field.source}:${field.fieldKey}`}
                      className="attendance-visible-field-card rounded-xl border border-border bg-muted/20 px-2 py-1.5"
                      style={{ gridColumn: `span ${span} / span ${span}` }}
                    >
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted print:text-[9px]">
                        {field.label}
                      </p>
                      <p className="text-sm text-text">{getVisibleFieldValue(attendee, field)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </ListTableCell>
        </ListTableRow>
      );
    });
  }

  return (
    <>
      <div className="space-y-4">
        {resolvedGroups.map((group) => (
          <section
            key={group.key}
            className="rounded-2xl border border-border bg-surface print:[break-inside:auto] print:[page-break-inside:auto]"
          >
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
                  <ListTableHeaderCell colSpan={6} className="px-6">
                    <div className="grid items-center gap-4 grid-cols-1 lg:grid-cols-[minmax(14rem,2fr)_minmax(6rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_auto] print:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                      <div>Attendee</div>
                      <div className="hidden lg:block print:block">RFID</div>
                      <div className="hidden lg:block print:block">Role</div>
                      <div className="hidden lg:block print:block">Category</div>
                      <div className="hidden lg:block print:hidden">Actions</div>
                    </div>
                  </ListTableHeaderCell>
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
