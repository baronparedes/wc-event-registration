import { Check, Minus, Pencil } from 'lucide-react';

import { ActionButton } from '@/components/ui/ActionLink';
import { ColorSwatchDisplay } from '@/components/ui/ColorSwatchDisplay';
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
import { formatCompactSlotLabelsFromSlotRecords } from '@/lib/domain/attendance';
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
  const shouldShowCheckInIndicator = visibleFields.some(
    (field) => toDynamicFieldToken(field) === 'member:check_in_status',
  );
  const renderableFields = visibleFields.filter((field) => {
    const token = toDynamicFieldToken(field);
    return token !== 'member:avatar' && token !== 'member:check_in_status';
  });

  return (
    <ListTable>
      <ListTableHead>
        <ListTableHeaderRow className="bg-slate-100 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <ListTableHeaderCell className="sticky left-0 z-20 bg-slate-100 !px-2 !py-2">
            Attendee
          </ListTableHeaderCell>
          {renderableFields.map((field) => (
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
          const shouldShowAvatar = visibleFields.some(
            (field) => toDynamicFieldToken(field) === 'member:avatar',
          );
          const checkedInSlotLabels =
            isCheckedIn && attendee
              ? formatCompactSlotLabelsFromSlotRecords(attendee.slot_records)
              : [];
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
                  {shouldShowAvatar && (
                    <Avatar
                      name={`${registrant.nickname} ${registrant.last_name}`}
                      avatarObjectKey={attendee?.avatar_object_key}
                      size="lg"
                      className="shrink-0"
                    />
                  )}
                  <p className="truncate font-semibold text-text">{`${registrant.nickname} ${registrant.last_name}`}</p>
                  {shouldShowCheckInIndicator && (
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
                  )}
                </div>
              </ListTableCell>
              {renderableFields.map((field) => {
                const fieldToken = toDynamicFieldToken(field);
                const isCheckedInSlotField = fieldToken === 'member:checked_in_slot';
                const isColorPickerField = field.fieldType === 'color_picker';

                return (
                  <ListTableCell
                    key={`${rowKey}:${field.source}:${field.fieldKey}`}
                    className="whitespace-nowrap !px-2 !py-2 align-middle text-wrap min-w-[100px]"
                  >
                    {isCheckedInSlotField &&
                      (checkedInSlotLabels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {checkedInSlotLabels.map((label, labelIndex) => (
                            <span
                              key={`${rowKey}:checked-slot:${label}:${labelIndex}`}
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
                      <span className="text-sm text-text">
                        <ColorSwatchDisplay value={getVisibleFieldValue(attendee, field)} />
                      </span>
                    )}

                    {!isCheckedInSlotField && !isColorPickerField && (
                      <span
                        className={
                          fieldToken === 'member:member_id'
                            ? 'rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700'
                            : 'text-sm text-text'
                        }
                      >
                        {getVisibleFieldValue(attendee, field)}
                      </span>
                    )}
                  </ListTableCell>
                );
              })}
              {canWrite && (
                <ListTableCell className="whitespace-nowrap !px-2 !py-2 align-middle print:hidden">
                  <div onClick={(e) => e.stopPropagation()}>
                    <ActionButton
                      aria-label={
                        filled > 0 ? 'Edit attendance details' : 'Fill in attendance details'
                      }
                      title={filled > 0 ? 'Edit attendance details' : 'Fill in attendance details'}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md no-underline hover:no-underline"
                      onClick={() => onEditRegistrant(registrant)}
                    >
                      <Pencil aria-hidden="true" className="h-4 w-4" />
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
