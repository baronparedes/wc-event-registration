import { Fragment, useMemo, useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { AlertBanner } from '@/components/ui/AlertBanner';
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

import { CsvFormatGuideCard, ImportPreviewRowDetails } from './components';
import {
  extractBulkImportErrors,
  getOperationBadgeClass,
  getOperationLabel,
  getRowSummaryNote,
} from './utils';

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
  const [expandedRowNumbers, setExpandedRowNumbers] = useState<Set<number>>(new Set());
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

  function toggleRow(rowNumber: number) {
    setExpandedRowNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) {
        next.delete(rowNumber);
      } else {
        next.add(rowNumber);
      }
      return next;
    });
  }

  function handleToggleAllRows() {
    if (!preview) return;
    if (expandedRowNumbers.size === preview.rows.length) {
      setExpandedRowNumbers(new Set());
    } else {
      setExpandedRowNumbers(new Set(preview.rows.map((r) => r.row_number)));
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file) {
      setFileName('');
      setPreparedRows([]);
      setPreview(null);
      setErrors([]);
      setExpandedRowNumbers(new Set());
      return;
    }

    setFileName(file.name);
    setErrors([]);
    setExpandedRowNumbers(new Set());

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
    setIsConfirmOpen(false);

    if (!canCommit) {
      setErrors(['Resolve CSV errors before importing.']);
      return;
    }

    let result: Awaited<ReturnType<typeof bulkUpsertMutation.mutateAsync>>;
    try {
      result = await bulkUpsertMutation.mutateAsync({ rows: preparedRows });
    } catch (error) {
      setErrors(extractBulkImportErrors(error));
      return;
    }

    if (!result.success) {
      setErrors(extractBulkImportErrors(new Error(result.error || 'Import failed.')));
      return;
    }

    toast.success(
      `Import complete. ${result.inserted_count} inserted, ${result.updated_count} updated.`,
    );
    navigate(ROUTE_PATHS.adminMembers);
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
          <AlertBanner variant="error" description="Failed to load members for preview." />
        ) : (
          <div className="space-y-4">
            <CsvFormatGuideCard />

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
              <AlertBanner
                variant="error"
                title="Import validation failed"
                description={
                  <ul className="mt-1 max-h-48 list-disc overflow-y-auto pl-5 text-xs">
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                }
              />
            )}

            {preview && (
              <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted">
                      Total: <strong className="text-text">{preview.summary.total_rows}</strong>
                    </span>
                    <span className="rounded-md border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs text-secondary font-medium">
                      Insert: {preview.summary.insert_count}
                    </span>
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary font-medium">
                      Update: {preview.summary.update_count}
                    </span>
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-700 font-medium">
                      Update Member ID: {preview.summary.update_member_id_count}
                    </span>
                    {preview.summary.error_count > 0 && (
                      <span className="rounded-md border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs text-danger font-medium">
                        Error: {preview.summary.error_count}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="primaryOutline"
                    size="sm"
                    onClick={handleToggleAllRows}
                  >
                    {expandedRowNumbers.size === preview.rows.length
                      ? 'Collapse All Details'
                      : 'Expand All Details'}
                  </Button>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                  <ListTable density="dense" className="table-fixed">
                    <ListTableHead>
                      <ListTableHeaderRow variant="plain">
                        <ListTableHeaderCell className="w-10 text-center">
                          <span className="sr-only">Toggle row details</span>
                        </ListTableHeaderCell>
                        <ListTableHeaderCell className="w-16">Row</ListTableHeaderCell>
                        <ListTableHeaderCell className="w-32">RFID</ListTableHeaderCell>
                        <ListTableHeaderCell className="w-48">Name</ListTableHeaderCell>
                        <ListTableHeaderCell className="w-36">Action</ListTableHeaderCell>
                        <ListTableHeaderCell>Pending Changes / Notes</ListTableHeaderCell>
                      </ListTableHeaderRow>
                    </ListTableHead>
                    <ListTableBody divider="default">
                      {preview.rows.map((row) => {
                        const isExpanded = expandedRowNumbers.has(row.row_number);
                        return (
                          <Fragment key={`${row.row_number}-${row.member_id}`}>
                            <ListTableRow hover="none">
                              <ListTableCell className="text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleRow(row.row_number)}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded text-muted hover:bg-background hover:text-text transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                  aria-label={
                                    isExpanded
                                      ? `Collapse details for row ${row.row_number}`
                                      : `Expand details for row ${row.row_number}`
                                  }
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              </ListTableCell>
                              <ListTableCell className="text-sm">{row.row_number}</ListTableCell>
                              <ListTableCell className="font-mono text-sm">
                                {row.member_id}
                              </ListTableCell>
                              <ListTableCell className="text-sm text-text font-medium">
                                {row.first_name} {row.last_name}{' '}
                                <span className="text-muted font-normal">({row.nickname})</span>
                              </ListTableCell>
                              <ListTableCell>
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getOperationBadgeClass(
                                    row.operation,
                                  )}`}
                                >
                                  {getOperationLabel(row.operation)}
                                </span>
                              </ListTableCell>
                              <ListTableCell className="text-xs text-muted truncate">
                                {getRowSummaryNote(row)}
                              </ListTableCell>
                            </ListTableRow>

                            {isExpanded && (
                              <ListTableRow hover="none">
                                <ListTableCell colSpan={6} className="bg-surface/50 p-3 pt-1">
                                  <ImportPreviewRowDetails row={row} />
                                </ListTableCell>
                              </ListTableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </ListTableBody>
                  </ListTable>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t border-border pt-4">
              <Button
                type="button"
                variant="primaryOutline"
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
          <div className="space-y-2 text-sm text-muted">
            <p>
              You are about to commit{' '}
              <strong className="text-text">{preview?.summary.total_rows}</strong> row(s) in an
              atomic batch transaction:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>
                <strong className="text-text">{preview?.summary.insert_count}</strong> new member(s)
                will be inserted.
              </li>
              <li>
                <strong className="text-text">{preview?.summary.update_count}</strong> existing
                member(s) will be updated.
              </li>
              {Boolean(preview?.summary.update_member_id_count) && (
                <li>
                  <strong className="text-text">{preview?.summary.update_member_id_count}</strong>{' '}
                  member ID(s) will be reassigned.
                </li>
              )}
            </ul>
            <p className="text-xs pt-1">
              This upsert is all-or-nothing. If one row fails database constraints, the entire batch
              is rolled back.
            </p>
          </div>
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
