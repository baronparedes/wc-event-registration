import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui';
import { Avatar, ColorSwatchDisplay } from '@/components/ui';
import {
  type AttendeeSearchResult,
  type DynamicFieldRef,
  formatCompactSlotLabelsFromSlotRecords,
  formatDateTime,
  getVisibleFieldValue,
  toDynamicFieldToken,
} from '@/lib';

export function AllCheckInsTable({
  rows,
  selectedFields,
}: {
  rows: AttendeeSearchResult[];
  selectedFields: DynamicFieldRef[];
}) {
  const renderableFields = selectedFields.filter((field) => {
    const token = toDynamicFieldToken(field);
    return token !== 'member:avatar';
  });

  if (rows.length === 0) {
    return <p className="py-4 text-sm text-muted">No attendees have checked in yet.</p>;
  }
  return (
    <ListTable density="dense">
      <ListTableHead>
        <ListTableHeaderRow variant="muted">
          <ListTableHeaderCell>#</ListTableHeaderCell>
          <ListTableHeaderCell>Name</ListTableHeaderCell>
          <ListTableHeaderCell>Check-In Time</ListTableHeaderCell>
          <ListTableHeaderCell>Slot Record</ListTableHeaderCell>
          {renderableFields.map((field) => (
            <ListTableHeaderCell key={toDynamicFieldToken(field)}>
              {field.label}
            </ListTableHeaderCell>
          ))}
        </ListTableHeaderRow>
      </ListTableHead>
      <ListTableBody>
        {rows.map((row, index) => {
          const shouldShowAvatar = selectedFields.some(
            (field) => toDynamicFieldToken(field) === 'member:avatar',
          );

          return (
            <ListTableRow key={row.registration_id}>
              <ListTableCell className="text-muted w-8">{rows.length - index}</ListTableCell>
              <ListTableCell className="font-medium">
                <div className="flex items-center gap-1">
                  {shouldShowAvatar && (
                    <Avatar
                      name={`${row.nickname} ${row.last_name}`}
                      avatarObjectKey={row.avatar_object_key}
                      size="sm"
                      className="shrink-0"
                    />
                  )}
                  <p className="truncate font-semibold text-text">{`${row.nickname} ${row.last_name}`}</p>
                </div>
              </ListTableCell>
              <ListTableCell className="text-muted">
                {row.official_check_in_time
                  ? formatDateTime(row.official_check_in_time, row.official_check_in_time)
                  : '—'}
              </ListTableCell>
              <ListTableCell className="text-muted">
                {(() => {
                  const slotRecordLabels = formatCompactSlotLabelsFromSlotRecords(row.slot_records);

                  if (slotRecordLabels.length === 0) {
                    return '—';
                  }

                  return (
                    <div className="flex flex-wrap gap-1">
                      {slotRecordLabels.map((label, labelIndex) => (
                        <span
                          key={`${row.registration_id}:slot-record:${label}:${labelIndex}`}
                          className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </ListTableCell>

              {renderableFields.map((field) => {
                const fieldToken = toDynamicFieldToken(field);
                const isColorPickerField = field.fieldType === 'color_picker';
                return (
                  <ListTableCell key={toDynamicFieldToken(field)} className="text-muted">
                    {isColorPickerField && (
                      <span className="text-sm text-text">
                        <ColorSwatchDisplay value={getVisibleFieldValue(row, field)} />
                      </span>
                    )}

                    {!isColorPickerField && (
                      <span
                        className={
                          fieldToken === 'member:member_id'
                            ? 'rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700'
                            : 'text-sm text-text'
                        }
                      >
                        {getVisibleFieldValue(row, field)}
                      </span>
                    )}
                  </ListTableCell>
                );
              })}
            </ListTableRow>
          );
        })}
      </ListTableBody>
    </ListTable>
  );
}
