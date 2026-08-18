import { Check, Minus, Pencil } from 'lucide-react';

import { ActionButton } from '@/components/ui/ActionLink';
import { Avatar } from '@/components/ui/Avatar';
import { ColorSwatchDisplay } from '@/components/ui/ColorSwatchDisplay';
import type {
  AttendanceAnswer,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
} from '@/lib/domain/attendance';
import { formatCompactSlotLabelsFromSlotRecords } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { type DynamicFieldRef, toDynamicFieldToken } from '@/lib/domain/attendance-views';

type AttendanceDataCardViewProps = {
  registrants: RegistrantAttendanceRow[];
  visibleFields: DynamicFieldRef[];
  fields: AttendanceField[];
  attendeesByRegistrantKey: Map<string, AttendeeSearchResult>;
  canWrite: boolean;
  fetchImage?: boolean;
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

/** Responsive card grid alternative to the table view, for at-a-glance scanning on wide screens. */
export function AttendanceDataCardView({
  registrants,
  visibleFields,
  fields,
  attendeesByRegistrantKey,
  canWrite,
  fetchImage = true,
  onViewRegistrant,
  onEditRegistrant,
  countFilledAnswers,
  getRegistrantKey,
  getVisibleFieldValue,
}: AttendanceDataCardViewProps) {
  const shouldShowCheckInIndicator = visibleFields.some(
    (field) => toDynamicFieldToken(field) === 'member:check_in_status',
  );
  const shouldShowEmail = visibleFields.some(
    (field) => toDynamicFieldToken(field) === 'member:email',
  );
  const renderableFields = visibleFields.filter((field) => {
    const token = toDynamicFieldToken(field);
    return (
      token !== 'member:avatar' && token !== 'member:check_in_status' && token !== 'member:email'
    );
  });
  const shouldShowAvatar = visibleFields.some(
    (field) => toDynamicFieldToken(field) === 'member:avatar',
  );

  return (
    <div className="flex flex-col gap-3 p-3 print:gap-0 print:p-0">
      {registrants.map((registrant) => {
        const rowKey = getRegistrantKey(registrant);
        const filled = countFilledAnswers(registrant.answers, fields);
        const isCheckedIn = registrant.check_in_status === 'checked_in';
        const attendee = attendeesByRegistrantKey.get(rowKey);
        const checkedInSlotLabels =
          isCheckedIn && attendee
            ? formatCompactSlotLabelsFromSlotRecords(attendee.slot_records)
            : [];
        const compactMemberFields = renderableFields.filter((field) => {
          if (field.source === 'role') {
            return true;
          }

          if (field.source === 'category') {
            return true;
          }

          return field.source === 'member' && field.fieldKey === 'member_id';
        });
        const remainingFields = renderableFields.filter(
          (field) => !compactMemberFields.includes(field),
        );

        return (
          <article
            key={rowKey}
            className="cursor-pointer border-b border-border/80 bg-white px-3 py-3 last:border-b-0 hover:bg-slate-100 print:break-inside-avoid print:px-1 print:py-0.5 print:[break-inside:avoid] print:[page-break-inside:avoid]"
            onClick={() => onViewRegistrant(registrant)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5 print:gap-x-2 print:gap-y-0">
                <div className="flex items-center gap-1">
                  {shouldShowAvatar && (
                    <Avatar
                      name={`${registrant.nickname} ${registrant.last_name}`}
                      avatarObjectKey={fetchImage ? attendee?.avatar_object_key : undefined}
                      size="lg"
                      className="shrink-0 print:!h-16 print:!w-16 print:text-xs"
                    />
                  )}
                  <p className="self-center break-words font-semibold text-text">
                    {registrant.nickname} {registrant.last_name}
                  </p>
                  {shouldShowCheckInIndicator && (
                    <span
                      role="img"
                      aria-label={isCheckedIn ? 'Checked In' : 'Not Checked In'}
                      title={isCheckedIn ? 'Checked In' : 'Not Checked In'}
                      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center self-center rounded-full print:hidden ${
                        isCheckedIn
                          ? 'bg-primary text-white'
                          : 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
                      }`}
                    >
                      {isCheckedIn ? <Check className="h-2 w-2" /> : <Minus className="h-2 w-2" />}
                    </span>
                  )}
                </div>
                {shouldShowEmail && attendee?.email && (
                  <p className="break-words text-xs text-muted">{attendee.email}</p>
                )}
                {compactMemberFields.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
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
                  <ActionButton
                    aria-label={
                      filled > 0 ? 'Edit attendance details' : 'Fill in attendance details'
                    }
                    title={filled > 0 ? 'Edit attendance details' : 'Fill in attendance details'}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md no-underline hover:no-underline print:hidden"
                    onClick={() => onEditRegistrant(registrant)}
                  >
                    <Pencil aria-hidden="true" className="h-4 w-4" />
                  </ActionButton>
                </div>
              )}
            </div>

            {remainingFields.length > 0 && (
              <dl className="mt-3 grid grid-cols-1 gap-2 print:mt-1 print:gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {remainingFields.map((field) => {
                  const fieldToken = toDynamicFieldToken(field);
                  const isCheckedInSlotField = fieldToken === 'member:checked_in_slot';
                  const isColorPickerField = field.fieldType === 'color_picker';

                  return (
                    <div
                      key={`${rowKey}:${field.source}:${field.fieldKey}`}
                      className="min-w-[110px] flex-1 rounded-lg border border-border/70 bg-slate-50/50 px-2.5 py-1.5 print:px-1.5 print:py-0.5"
                    >
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {field.label}
                      </dt>
                      <dd className="mt-0.5 break-words whitespace-normal print:mt-0">
                        {isCheckedInSlotField &&
                          (checkedInSlotLabels.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {checkedInSlotLabels.map((label, labelIndex) => (
                                <span
                                  key={`${rowKey}:card-checked-slot:${label}:${labelIndex}`}
                                  className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-500">—</span>
                          ))}

                        {isColorPickerField && !isCheckedInSlotField && (
                          <ColorSwatchDisplay
                            value={getVisibleFieldValue(attendee, field)}
                            fullWidth
                          />
                        )}

                        {!isCheckedInSlotField && !isColorPickerField && (
                          <span
                            className={
                              fieldToken === 'member:member_id'
                                ? 'rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700 break-words whitespace-normal'
                                : 'text-sm text-text break-words whitespace-normal'
                            }
                          >
                            {getVisibleFieldValue(attendee, field)}
                          </span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </article>
        );
      })}
    </div>
  );
}
