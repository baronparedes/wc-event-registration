import { useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { ROUTE_PATHS } from '@/config/constants';
import {
  useAdminMembersImportSnapshotQuery,
  useBulkUpsertMembersMutation,
} from '@/hooks/domain/members';
import {
  buildMemberCsvImportPreview,
  buildMemberCsvPreparedRows,
  parseMemberCsvText,
} from '@/lib/domain/members';

function getOperationBadgeClass(operation: 'insert' | 'update' | 'update_member_id' | 'error') {
  switch (operation) {
    case 'insert':
      return 'bg-secondary/15 text-secondary';
    case 'update':
      return 'bg-primary/15 text-primary';
    case 'update_member_id':
      return 'bg-accent/20 text-amber-700';
    case 'error':
      return 'bg-danger/15 text-danger';
    default:
      return 'bg-muted/20 text-muted';
  }
}

function getOperationLabel(operation: 'insert' | 'update' | 'update_member_id' | 'error') {
  switch (operation) {
    case 'insert':
      return 'Insert';
    case 'update':
      return 'Update';
    case 'update_member_id':
      return 'Update Member ID';
    case 'error':
      return 'Error';
    default:
      return operation;
  }
}

function extractBulkImportErrors(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return ['Import failed.'];
  }

  try {
    const parsed = JSON.parse(error.message) as {
      error?: unknown;
      detail?: unknown;
      details?: unknown;
    };

    if (Array.isArray(parsed.details)) {
      const details = parsed.details.filter((value): value is string => typeof value === 'string');
      if (details.length > 0) {
        return details;
      }
    }

    if (typeof parsed.detail === 'string' && parsed.detail.trim().length > 0) {
      return parsed.detail
        .split(/;\s+/)
        .map((message) => message.trim())
        .filter((message) => message.length > 0);
    }

    if (typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
      return [parsed.error];
    }
  } catch {
    // Fall through and use raw message.
  }

  return [error.message || 'Import failed.'];
}

export function AdminMembersImportPage() {
  const navigate = useNavigate();
  const membersSnapshotQuery = useAdminMembersImportSnapshotQuery();
  const bulkUpsertMutation = useBulkUpsertMembersMutation();

  const [fileName, setFileName] = useState('');
  const [preparedRows, setPreparedRows] = useState<
    ReturnType<typeof buildMemberCsvPreparedRows>['rows']
  >([]);
  const [preview, setPreview] = useState<ReturnType<typeof buildMemberCsvImportPreview> | null>(
    null,
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const canCommit =
    preparedRows.length > 0 &&
    membersSnapshotQuery.isSuccess &&
    (preview?.summary.error_count ?? 0) === 0 &&
    errors.length === 0;

  const totalMetadataKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const row of preparedRows) {
      Object.keys(row.metadata ?? {}).forEach((key) => keys.add(key));
    }
    return keys.size;
  }, [preparedRows]);

  async function handleFileChange(file: File | null) {
    if (!file) {
      setFileName('');
      setPreparedRows([]);
      setPreview(null);
      setErrors([]);
      return;
    }

    setFileName(file.name);
    setErrors([]);

    const text = await file.text();
    const parsed = parseMemberCsvText(text);

    if (!parsed.success) {
      setPreparedRows([]);
      setPreview(null);
      setErrors([parsed.error]);
      return;
    }

    const built = buildMemberCsvPreparedRows(parsed.data.rows);
    if (built.errors.length > 0) {
      setPreparedRows(built.rows);
      setPreview(null);
      setErrors(built.errors);
      return;
    }

    if (!membersSnapshotQuery.data) {
      setPreparedRows(built.rows);
      setPreview(null);
      setErrors(['Member snapshot is still loading. Please try again in a moment.']);
      return;
    }

    const nextPreview = buildMemberCsvImportPreview(built.rows, membersSnapshotQuery.data);
    const previewErrors = nextPreview.rows.flatMap((row) =>
      row.errors.map((message) => `Row ${row.row_number}: ${message}`),
    );

    setPreparedRows(built.rows);
    setPreview(nextPreview);
    setErrors(previewErrors);
  }

  async function handleCommit() {
    if (!canCommit) {
      setErrors(['Resolve CSV errors before importing.']);
      return;
    }

    try {
      const result = await bulkUpsertMutation.mutateAsync({ rows: preparedRows });
      if (!result.success) {
        throw new Error(result.error ?? 'Import failed.');
      }

      toast.success(
        `Import complete. ${result.inserted_count} inserted, ${result.updated_count} updated.`,
      );
      navigate(ROUTE_PATHS.adminMembers);
    } catch (error) {
      setErrors(extractBulkImportErrors(error));
    }
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Members', to: ROUTE_PATHS.adminMembers }, { label: 'Import CSV' }]}
        title="Import Members CSV"
        description="Preview inserts and updates before committing an atomic batch upsert."
      />

      <AdminPageShell.Content
        isLoading={membersSnapshotQuery.isLoading}
        loadingMessage="Loading member snapshot..."
      >
        {membersSnapshotQuery.isError ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-danger">
            Failed to load members for preview.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-4">
              <label htmlFor="members-csv-file" className="text-sm font-medium text-text">
                CSV file
              </label>
              <input
                id="members-csv-file"
                type="file"
                accept=".csv,text/csv"
                className="mt-2 block w-full text-sm"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void handleFileChange(file);
                }}
                disabled={bulkUpsertMutation.isPending}
              />
              {fileName && <p className="mt-2 text-xs text-muted">Loaded file: {fileName}</p>}
              <p className="mt-2 text-xs text-muted">
                Non-core CSV columns are stored in metadata. Parsed metadata keys:{' '}
                {totalMetadataKeys}
              </p>
            </div>

            {errors.length > 0 && (
              <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2">
                <p className="text-sm font-medium text-danger">Import validation failed</p>
                <ul className="mt-1 max-h-48 list-disc overflow-y-auto pl-5 text-xs text-danger">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {preview && (
              <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
                  <span>Total: {preview.summary.total_rows}</span>
                  <span>Insert: {preview.summary.insert_count}</span>
                  <span>Update: {preview.summary.update_count}</span>
                  <span>Update Member ID: {preview.summary.update_member_id_count}</span>
                  <span>Error: {preview.summary.error_count}</span>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                  <ListTable density="dense" className="table-fixed">
                    <ListTableHead>
                      <ListTableHeaderRow variant="plain">
                        <ListTableHeaderCell className="w-20">Row</ListTableHeaderCell>
                        <ListTableHeaderCell className="w-36">RFID</ListTableHeaderCell>
                        <ListTableHeaderCell>Name</ListTableHeaderCell>
                        <ListTableHeaderCell className="w-48">Action</ListTableHeaderCell>
                        <ListTableHeaderCell className="w-64">Notes</ListTableHeaderCell>
                      </ListTableHeaderRow>
                    </ListTableHead>
                    <ListTableBody divider="default">
                      {preview.rows.map((row) => (
                        <ListTableRow key={`${row.row_number}-${row.member_id}`} hover="none">
                          <ListTableCell className="text-sm">{row.row_number}</ListTableCell>
                          <ListTableCell className="font-mono text-sm">
                            {row.member_id}
                          </ListTableCell>
                          <ListTableCell className="text-sm text-text">
                            {row.first_name} {row.last_name} ({row.nickname})
                          </ListTableCell>
                          <ListTableCell>
                            <span
                              className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getOperationBadgeClass(
                                row.operation,
                              )}`}
                            >
                              {getOperationLabel(row.operation)}
                            </span>
                          </ListTableCell>
                          <ListTableCell className="text-xs text-muted">
                            {row.errors.length > 0
                              ? row.errors.join(' ')
                              : row.operation === 'update_member_id' && row.target_member_id
                                ? `Member ID will change from ${row.target_member_id} to ${row.member_id}.`
                                : row.operation === 'update'
                                  ? 'Existing member will be updated.'
                                  : 'New member will be inserted.'}
                          </ListTableCell>
                        </ListTableRow>
                      ))}
                    </ListTableBody>
                  </ListTable>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTE_PATHS.adminMembers)}
                disabled={bulkUpsertMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                disabled={!canCommit || bulkUpsertMutation.isPending}
              >
                {bulkUpsertMutation.isPending ? 'Importing...' : 'Commit Import'}
              </Button>
            </div>
          </div>
        )}
      </AdminPageShell.Content>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Commit member CSV import"
        description={
          <p>
            This upsert is all-or-nothing. If one row fails validation, the entire batch is
            rejected.
          </p>
        }
        confirmLabel="Commit Import"
        confirmLoadingLabel="Importing..."
        isPending={bulkUpsertMutation.isPending}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          void handleCommit();
        }}
      />
    </AdminPageShell>
  );
}
