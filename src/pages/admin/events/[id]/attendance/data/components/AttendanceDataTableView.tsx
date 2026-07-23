import { Check, Minus } from 'lucide-react';

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
import { type DynamicFieldRef, toDynamicFieldToken } from '@/lib/domain/attendance-views';

import { Avatar } from '../../../../../../../components/ui/Avatar';

type AttendanceDataTableViewProps = {
  registrants: RegistrantAttendanceRow[];
  visibleFields: DynamicFieldRef[];
  fields: AttendanceField[];
  attendeesByRegistrantKey: Map<string, AttendeeSearchResult>;
  canWrite: boolean;
  onViewRegistrant: (registrant: RegistrantAttendanceRow) => void;
  onEditRegistrant: (registrant: RegistrantAttendanceRow) => void;
  countFilledAnswers: (answers: AttendanceAnswer[], fields: AttendanceField[]) => number;
  getRegistrantKey: (
    registrant: Pick<
      RegistrantAttendanceRow,
      'attendee_kind' | 'registration_id' | 'public_registration_id'
    >,
  ) => string;
  getVisibleFieldValue: (
    attendee: AttendeeSearchResult | undefined,
    field: DynamicFieldRef,
  ) => string;
};

export function AttendanceDataTableView({
  registrants,
  visibleFields,
  fields,
  attendeesByRegistrantKey,
  canWrite,
  onViewRegistrant,
  onEditRegistrant,
  countFilledAnswers,
  getRegistrantKey,
  getVisibleFieldValue,
}: AttendanceDataTableViewProps) {
  return (
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
            <ListTableHeaderCell className="!px-2 !py-2 print:hidden">Actions</ListTableHeaderCell>
          )}
        </ListTableHeaderRow>
      </ListTableHead>
      <ListTableBody>
        {registrants.map((registrant, index) => {
          const rowKey = getRegistrantKey(registrant);
          const filled = countFilledAnswers(registrant.answers, fields);
          const isCheckedIn = registrant.check_in_status === 'checked_in';
          const attendee = attendeesByRegistrantKey.get(rowKey);
          const rowBackgroundClass = index % 2 === 0 ? 'bg-white' : 'bg-slate-50';

          return (
            <ListTableRow
              key={rowKey}
              className={`group cursor-pointer border-b border-border/80 ${rowBackgroundClass} hover:bg-slate-100`}
              hover="none"
              onClick={() => onViewRegistrant(registrant)}
            >
              <ListTableCell
                className={`sticky left-0 z-10 ${rowBackgroundClass} !px-2 !py-2 align-middle group-hover:bg-slate-100`}
              >
                <div className="flex items-center gap-1">
                  <Avatar name={registrant.full_name} size="lg" className="shrink-0" />
                  <p className="truncate font-semibold text-text">{registrant.full_name}</p>
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
                    <ActionButton onClick={() => onEditRegistrant(registrant)}>
                      {filled > 0 ? 'Edit' : 'Fill In'}
                    </ActionButton>
                  </div>
                </ListTableCell>
              )}
            </ListTableRow>
          );
        })}
      </ListTableBody>
    </ListTable>
  );
}
