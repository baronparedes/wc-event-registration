import {
  Avatar,
  ColorSwatchDisplay,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui';
import {
  type AttendeeSearchResult,
  type DynamicFieldRef,
  formatDateTime,
  getVisibleFieldValue,
  toDynamicFieldToken,
} from '@/lib';

export type SlotCheckInRow = {
  full_name: string;
  member_id: string | null;
  recorded_at: string;
  registration_id: string | null;
  public_registration_id: string | null;
  attendee: AttendeeSearchResult;
};

export type SlotTabPanelProps = {
  rows: SlotCheckInRow[];
  slotLabel: string;
  selectedFields: DynamicFieldRef[];
};

export function SlotTabPanel({ rows, slotLabel, selectedFields }: SlotTabPanelProps) {
  const earliest = rows.length
    ? rows.reduce((a, b) => (a.recorded_at < b.recorded_at ? a : b)).recorded_at
    : null;
  const latest = rows.length
    ? rows.reduce((a, b) => (a.recorded_at > b.recorded_at ? a : b)).recorded_at
    : null;

  const renderableFields = selectedFields.filter((field) => {
    const token = toDynamicFieldToken(field);
    return token !== 'member:avatar';
  });

  return (
    <div className="space-y-4">
      {/* Compact slot stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="text-xl font-bold text-primary">{rows.length}</p>
          <p className="mt-0.5 text-xs text-muted">Checked In</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="text-xl font-bold text-text">
            {earliest ? formatDateTime(earliest, earliest) : '—'}
          </p>
          <p className="mt-0.5 text-xs text-muted">First Arrival</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="text-xl font-bold text-text">
            {latest ? formatDateTime(latest, latest) : '—'}
          </p>
          <p className="mt-0.5 text-xs text-muted">Latest Arrival</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted">No attendees for {slotLabel}.</p>
      ) : (
        <ListTable density="dense">
          <ListTableHead>
            <ListTableHeaderRow variant="muted">
              <ListTableHeaderCell>#</ListTableHeaderCell>
              <ListTableHeaderCell>Name</ListTableHeaderCell>
              <ListTableHeaderCell>Slot Check-In Time</ListTableHeaderCell>
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
                <ListTableRow
                  key={`${row.registration_id || row.public_registration_id}-${row.recorded_at}`}
                >
                  <ListTableCell className="text-muted w-8">{index + 1}</ListTableCell>
                  <ListTableCell className="font-medium">
                    <div className="flex items-center gap-1">
                      {shouldShowAvatar && (
                        <Avatar
                          name={`${row.attendee.nickname} ${row.attendee.last_name}`}
                          avatarObjectKey={row.attendee.avatar_object_key}
                          size="sm"
                          className="shrink-0"
                        />
                      )}
                      <p className="truncate font-semibold text-text">{`${row.attendee.nickname} ${row.attendee.last_name}`}</p>
                    </div>
                  </ListTableCell>
                  <ListTableCell className="text-muted">
                    {formatDateTime(row.recorded_at, row.recorded_at)}
                  </ListTableCell>
                  {renderableFields.map((field) => {
                    const fieldToken = toDynamicFieldToken(field);
                    const isColorPickerField = field.fieldType === 'color_picker';
                    return (
                      <ListTableCell key={toDynamicFieldToken(field)} className="text-muted">
                        {isColorPickerField && (
                          <span className="text-sm text-text">
                            <ColorSwatchDisplay value={getVisibleFieldValue(row.attendee, field)} />
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
                            {getVisibleFieldValue(row.attendee, field)}
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
      )}
    </div>
  );
}
