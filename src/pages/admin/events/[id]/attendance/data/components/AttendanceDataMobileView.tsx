import { Check, EditIcon, Minus } from 'lucide-react';

import { ActionButton } from '@/components/ui/ActionLink';
import type {
  AttendanceAnswer,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
} from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { type DynamicFieldRef, toDynamicFieldToken } from '@/lib/domain/attendance-views';

import { Avatar } from '../../../../../../../components/ui/Avatar';

type AttendanceDataMobileViewProps = {
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

export function AttendanceDataMobileView({
  registrants,
  visibleFields,
  attendeesByRegistrantKey,
  canWrite,
  onViewRegistrant,
  onEditRegistrant,
  getRegistrantKey,
  getVisibleFieldValue,
}: AttendanceDataMobileViewProps) {
  return (
    <div className="space-y-2 p-2">
      {registrants.map((registrant) => {
        const rowKey = getRegistrantKey(registrant);
        const isCheckedIn = registrant.check_in_status === 'checked_in';
        const attendee = attendeesByRegistrantKey.get(rowKey);
        const compactMemberFields = visibleFields.filter((field) => {
          if (field.source === 'role') {
            return true;
          }

          if (field.source === 'category') {
            return true;
          }

          return field.source === 'member' && field.fieldKey === 'member_id';
        });
        const remainingFields = visibleFields.filter(
          (field) => !compactMemberFields.includes(field),
        );

        return (
          <article
            key={rowKey}
            className="cursor-pointer border-b border-border/80 bg-white px-3 py-3 last:border-b-0 hover:bg-slate-100"
            onClick={() => onViewRegistrant(registrant)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-start gap-1">
                  <Avatar name={registrant.full_name} size="md" className="shrink-0" />
                  <p className="break-words font-semibold text-text self-center">
                    {registrant.full_name}
                  </p>
                  <span
                    role="img"
                    aria-label={isCheckedIn ? 'Checked In' : 'Not Checked In'}
                    title={isCheckedIn ? 'Checked In' : 'Not Checked In'}
                    className={`mt-0.5 inline-flex h-3.5 w-3.5 shrink-0 items-center self-center justify-center rounded-full print:hidden ${
                      isCheckedIn
                        ? 'bg-primary text-white'
                        : 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
                    }`}
                  >
                    {isCheckedIn ? <Check className="h-2 w-2" /> : <Minus className="h-2 w-2" />}
                  </span>
                </div>
                {attendee?.email && (
                  <p className="mt-0.5 break-words text-xs text-muted">{attendee.email}</p>
                )}
                {compactMemberFields.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {compactMemberFields.map((field) => {
                      const value = getVisibleFieldValue(attendee, field);
                      if (value === '—') {
                        return null;
                      }

                      return (
                        <span
                          key={`${rowKey}:compact:${field.source}:${field.fieldKey}`}
                          className={
                            toDynamicFieldToken(field) === 'member:member_id'
                              ? 'rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700'
                              : 'rounded bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700'
                          }
                        >
                          {value}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
              {canWrite && (
                <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <ActionButton onClick={() => onEditRegistrant(registrant)}>
                    <EditIcon className="h-5 w-5" />
                  </ActionButton>
                </div>
              )}
            </div>

            <dl className="mt-3 grid grid-cols-2 gap-2">
              {remainingFields.map((field) => (
                <div
                  key={`${rowKey}:${field.source}:${field.fieldKey}`}
                  className="rounded-lg border border-border/70 bg-slate-50/50 px-2.5 py-1.5"
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {field.label}
                  </dt>
                  <dd className="mt-0.5 break-words whitespace-normal">
                    <span
                      className={
                        toDynamicFieldToken(field) === 'member:member_id'
                          ? 'rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 break-words whitespace-normal'
                          : 'text-sm text-text break-words whitespace-normal'
                      }
                    >
                      {getVisibleFieldValue(attendee, field)}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        );
      })}
    </div>
  );
}
