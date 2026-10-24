import type { MemberCsvPreviewRow } from '@/lib/domain/members';

interface ImportPreviewRowDetailsProps {
  row: MemberCsvPreviewRow;
}

export function ImportPreviewRowDetails({ row }: ImportPreviewRowDetailsProps) {
  if (row.operation === 'error') {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
        <p className="font-semibold">Row Validation Errors:</p>
        <ul className="mt-1.5 list-disc pl-5 space-y-0.5">
          {row.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (row.operation === 'insert') {
    return (
      <div className="rounded-lg border border-border bg-background p-3 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <span className="font-semibold text-secondary">New Member Attributes to be Inserted</span>
          <span className="text-muted">{row.new_member_details.length} attribute(s)</span>
        </div>
        <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {row.new_member_details.map((detail) => (
            <div
              key={detail.field}
              className="rounded-md border border-border bg-surface p-2 text-xs"
            >
              <span className="text-muted block text-[11px]">{detail.label}</span>
              <p className="mt-0.5 font-medium text-text break-words">{detail.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // update or update_member_id
  const isIdUpdate = row.operation === 'update_member_id';

  return (
    <div className="rounded-lg border border-border bg-background p-3 text-xs space-y-2.5">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${isIdUpdate ? 'text-amber-700' : 'text-primary'}`}>
            {isIdUpdate
              ? 'RFID Reassignment & Pending Field Changes'
              : 'Pending Field Changes for Existing Member'}
          </span>
          {row.target_member_id && (
            <span className="text-muted">
              (Target: <span className="font-mono">{row.target_member_id}</span>)
            </span>
          )}
        </div>
        <span className="text-muted">{row.field_changes.length} change(s)</span>
      </div>

      {row.field_changes.length === 0 ? (
        <p className="text-muted italic">
          No field changes detected. All provided CSV values match the current member record in the
          system.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {row.field_changes.map((change) => (
            <div
              key={change.field}
              className="rounded-md border border-border bg-surface p-2 text-xs space-y-1"
            >
              <span className="font-medium text-text block text-[11px]">{change.label}</span>
              <div className="flex items-center gap-1.5 flex-wrap text-xs">
                <span className="line-through text-muted text-[11px]">
                  {change.old_value ?? '(empty)'}
                </span>
                <span className="text-muted">→</span>
                <span className="font-semibold text-primary break-words">
                  {change.new_value ?? '(empty)'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
