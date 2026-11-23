import { Fragment, useState } from 'react';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  RefreshCw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import {
  AlertBanner,
  Badge,
  Button,
  ButtonGroup,
  ConfirmDialog,
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
  Spinner,
} from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import {
  useGoogleSheetMembersPreviewQuery,
  useSyncMembersFromSheetMutation,
} from '@/hooks/domain/members';
import type {
  GoogleMemberSyncProgress,
  GoogleMemberSyncStage,
  MemberCsvPreviewRow,
} from '@/lib/domain/members';
import { formatDateTime } from '@/lib/infrastructure';

import { getOperationBadgeClass, getOperationLabel, getRowSummaryNote } from '../utils';
import { ImportPreviewRowDetails } from './ImportPreviewRowDetails';

type PreviewFilterMode = 'changes' | 'insert' | 'update' | 'unchanged' | 'error' | 'all';

const PREVIEW_STAGES: ReadonlyArray<{ key: GoogleMemberSyncStage; label: string }> = [
  { key: 'fetching_sheet', label: 'Fetch member rows from Google Sheets' },
  { key: 'parsing_rows', label: 'Parse and validate sheet rows' },
  { key: 'loading_members', label: 'Load existing member records' },
  { key: 'resolving_rows', label: 'Compare rows and compute field changes' },
];

const SYNC_STAGES: ReadonlyArray<{ key: GoogleMemberSyncStage; label: string }> = [
  { key: 'fetching_sheet', label: 'Fetch member rows from Google Sheets' },
  { key: 'parsing_rows', label: 'Parse and validate sheet rows' },
  { key: 'loading_members', label: 'Load existing member records' },
  { key: 'resolving_rows', label: 'Match rows and check conflicts' },
  { key: 'upserting_batches', label: 'Upsert members in batches' },
];

function isRowUnchanged(row: MemberCsvPreviewRow): boolean {
  return row.operation === 'update' && row.field_changes.length === 0;
}

function StreamProgressCard({
  title,
  stages,
  progress,
  showLiveCounts,
}: {
  title: string;
  stages: ReadonlyArray<{ key: GoogleMemberSyncStage; label: string }>;
  progress: GoogleMemberSyncProgress | null;
  showLiveCounts: boolean;
}) {
  const activeStageIndex = progress ? stages.findIndex((item) => item.key === progress.stage) : -1;
  const percent = Math.max(0, Math.min(100, progress?.percent ?? 5));

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5" aria-live="polite">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <div>
            <p className="font-semibold text-text">{title}</p>
            <p className="text-xs text-muted">
              {progress?.message ?? 'Connecting to Google Sheets...'}
            </p>
          </div>
          <span className="shrink-0 font-semibold tabular-nums text-primary">{percent}%</span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={title}
          className="h-2.5 w-full overflow-hidden rounded-full border border-border bg-background"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>

        {progress?.total_batches !== undefined && progress.total_batches > 0 && (
          <p className="text-xs text-muted">
            Batch {progress.current_batch ?? 1} of {progress.total_batches}
            {progress.resolved_rows !== undefined && (
              <>
                {' '}
                &middot; {progress.processed_rows ?? 0} / {progress.resolved_rows} rows processed
              </>
            )}
          </p>
        )}
      </div>

      <ol className="space-y-2 rounded-xl border border-border bg-background p-4">
        {stages.map((stage, index) => {
          const isCompleted = activeStageIndex > index;
          const isCurrent = activeStageIndex === index;

          return (
            <li key={stage.key} className="flex items-center gap-2.5 text-sm">
              {isCompleted ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
              ) : isCurrent ? (
                <Spinner size="sm" className="shrink-0" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted" />
              )}
              <span
                className={
                  isCurrent ? 'font-medium text-text' : isCompleted ? 'text-text' : 'text-muted'
                }
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>

      {showLiveCounts && progress?.total_sheet_rows !== undefined && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs text-muted">Sheet Rows</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text">
              {progress.total_sheet_rows}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs text-muted">Inserted</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text">
              {progress.inserted_count ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs text-muted">Updated</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text">
              {progress.updated_count ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs text-muted">Skipped</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-text">
              {progress.skipped_count ?? 0}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export function GoogleSheetSyncPanel() {
  const navigate = useNavigate();
  const previewQuery = useGoogleSheetMembersPreviewQuery({ enabled: true });
  const syncMutation = useSyncMembersFromSheetMutation();

  const [filterMode, setFilterMode] = useState<PreviewFilterMode>('changes');
  const [expandedRowNumbers, setExpandedRowNumbers] = useState<Set<number>>(new Set());
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const preview = previewQuery.data ?? null;
  const syncResult = syncMutation.data ?? null;
  const isPreviewLoading = previewQuery.isFetching;
  const isSyncing = syncMutation.isPending;
  let syncErrorMessage: string | null = null;
  if (syncMutation.error instanceof Error) {
    syncErrorMessage = syncMutation.error.message;
  } else if (syncMutation.error) {
    syncErrorMessage = 'Failed to sync members from Google Sheet.';
  }

  const allRows = preview?.preview_rows ?? [];
  const filteredRows = allRows.filter((row) => {
    switch (filterMode) {
      case 'changes':
        return !isRowUnchanged(row);
      case 'insert':
        return row.operation === 'insert';
      case 'update':
        return (
          (row.operation === 'update' && row.field_changes.length > 0) ||
          row.operation === 'update_member_id'
        );
      case 'unchanged':
        return isRowUnchanged(row);
      case 'error':
        return row.operation === 'error';
      case 'all':
      default:
        return true;
    }
  });

  const validRowCount = preview
    ? preview.summary.insert_count +
      preview.summary.update_count +
      preview.summary.update_member_id_count +
      preview.summary.unchanged_count
    : 0;
  const actionableChangeCount = preview
    ? preview.summary.insert_count +
      preview.summary.update_count +
      preview.summary.update_member_id_count
    : 0;
  const changesAndErrorsCount = preview ? actionableChangeCount + preview.summary.error_count : 0;

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
    if (filteredRows.length === 0) return;
    const allFilteredExpanded = filteredRows.every((row) => expandedRowNumbers.has(row.row_number));
    if (allFilteredExpanded) {
      setExpandedRowNumbers(new Set());
    } else {
      setExpandedRowNumbers(new Set(filteredRows.map((row) => row.row_number)));
    }
  }

  function handleRefreshPreview() {
    syncMutation.resetSync();
    setExpandedRowNumbers(new Set());
    void previewQuery.refetch();
  }

  async function handleConfirmSync() {
    setIsConfirmOpen(false);
    try {
      const result = await syncMutation.mutateAsync();
      if (result.skipped_count > 0) {
        toast.warning(
          `Google Sheet sync completed with ${result.skipped_count} skipped ${result.skipped_count === 1 ? 'row' : 'rows'}.`,
        );
      } else {
        toast.success(
          `Synced ${result.inserted_count + result.updated_count} members from Google Sheet.`,
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to sync members from Google Sheet.',
      );
    }
  }

  if (isSyncing) {
    return (
      <StreamProgressCard
        title="Syncing members from Google Sheet"
        stages={SYNC_STAGES}
        progress={syncMutation.progress}
        showLiveCounts
      />
    );
  }

  if (syncResult) {
    const skippedRows = syncResult.skipped_rows ?? [];
    let completionTitle = 'Google Sheet sync completed successfully';
    if (syncResult.total_sheet_rows === 0) {
      completionTitle = 'Sync completed — sheet has no data rows';
    } else if (syncResult.skipped_count > 0) {
      const rowNoun = syncResult.skipped_count === 1 ? 'row' : 'rows';
      completionTitle = `Sync completed with ${syncResult.skipped_count} skipped ${rowNoun}`;
    }

    return (
      <div className="space-y-4">
        <AlertBanner
          variant={syncResult.skipped_count > 0 ? 'warning' : 'success'}
          title={completionTitle}
          description={`Completed on ${formatDateTime(syncResult.timestamp)}`}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Total Sheet Rows</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-text">
              {syncResult.total_sheet_rows}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Inserted</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
              {syncResult.inserted_count}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Updated</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-text">
              {syncResult.updated_count}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs text-muted">Skipped</p>
            <p
              className={`mt-1 text-xl font-semibold tabular-nums ${
                syncResult.skipped_count > 0 ? 'text-danger' : 'text-text'
              }`}
            >
              {syncResult.skipped_count}
            </p>
          </div>
        </div>

        {skippedRows.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border bg-surface p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-text">
              <AlertTriangle className="h-4 w-4 text-danger" />
              Skipped Rows ({syncResult.skipped_count})
            </h3>
            <div className="max-h-72 overflow-y-auto pr-1 space-y-2">
              {skippedRows.map((entry) => (
                <div
                  key={`${entry.row_number}-${entry.member_id}`}
                  className="rounded-xl border border-border bg-background p-3 text-sm space-y-1.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Row {entry.row_number}</Badge>
                    {entry.member_id && <Badge variant="secondary">{entry.member_id}</Badge>}
                  </div>
                  <ul className="list-disc pl-5 text-xs text-muted space-y-0.5">
                    {entry.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <Button type="button" variant="primaryOutline" onClick={handleRefreshPreview}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Preview Again
          </Button>
          <Button type="button" onClick={() => navigate(ROUTE_PATHS.adminMembers)}>
            Back to Members
          </Button>
        </div>
      </div>
    );
  }

  if (isPreviewLoading) {
    return (
      <StreamProgressCard
        title="Loading Google Sheet sync preview"
        stages={PREVIEW_STAGES}
        progress={previewQuery.progress}
        showLiveCounts={false}
      />
    );
  }

  if (previewQuery.isError) {
    return (
      <div className="space-y-4">
        <AlertBanner
          variant="error"
          title="Failed to load Google Sheet preview"
          description={previewQuery.error.message}
          action={
            <Button type="button" variant="primaryOutline" size="sm" onClick={handleRefreshPreview}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Preview
            </Button>
          }
        />
        <div className="flex justify-end border-t border-border pt-4">
          <Button
            type="button"
            variant="primaryOutline"
            onClick={() => navigate(ROUTE_PATHS.adminMembers)}
          >
            Back to Members
          </Button>
        </div>
      </div>
    );
  }

  const allFilteredExpanded =
    filteredRows.length > 0 && filteredRows.every((row) => expandedRowNumbers.has(row.row_number));

  return (
    <div className="space-y-4">
      {syncErrorMessage && (
        <AlertBanner
          variant="error"
          title="Google Sheet sync failed"
          description={syncErrorMessage}
        />
      )}

      {preview && preview.summary.error_count > 0 && (
        <AlertBanner
          variant="warning"
          title={`${preview.summary.error_count} row(s) will be skipped`}
          description="Invalid or conflicting sheet rows will be skipped automatically during sync. Valid rows can still be synced."
        />
      )}

      {preview && (
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted">
                Total: <strong className="text-text">{preview.summary.total_rows}</strong>
              </span>
              <span className="rounded-md border border-secondary/30 bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                Insert: {preview.summary.insert_count}
              </span>
              <span className="rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                Update: {preview.summary.update_count}
              </span>
              {preview.summary.update_member_id_count > 0 && (
                <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                  Update Member ID: {preview.summary.update_member_id_count}
                </span>
              )}
              <span className="rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted">
                Unchanged: {preview.summary.unchanged_count}
              </span>
              {preview.summary.error_count > 0 && (
                <span className="rounded-md border border-danger/30 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
                  Skipped: {preview.summary.error_count}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="primaryOutline"
                size="sm"
                onClick={handleRefreshPreview}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Refresh Preview
              </Button>
              {filteredRows.length > 0 && (
                <Button
                  type="button"
                  variant="primaryOutline"
                  size="sm"
                  onClick={handleToggleAllRows}
                >
                  {allFilteredExpanded ? 'Collapse All Details' : 'Expand All Details'}
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <ButtonGroup
              size="sm"
              ariaLabel="Filter preview rows"
              value={filterMode}
              onChange={(value) => setFilterMode(value as PreviewFilterMode)}
              options={[
                { value: 'changes', label: `Changes & Skipped (${changesAndErrorsCount})` },
                { value: 'insert', label: `Insert (${preview.summary.insert_count})` },
                {
                  value: 'update',
                  label: `Update (${preview.summary.update_count + preview.summary.update_member_id_count})`,
                },
                { value: 'unchanged', label: `Unchanged (${preview.summary.unchanged_count})` },
                { value: 'error', label: `Skipped (${preview.summary.error_count})` },
                { value: 'all', label: `All (${preview.summary.total_rows})` },
              ]}
            />
            <span className="text-xs text-muted">
              Previewed on {formatDateTime(preview.timestamp)}
            </span>
          </div>

          {preview.summary.total_rows === 0 && (
            <AlertBanner
              variant="info"
              title="No data rows found in Google Sheet"
              description="The configured Google Sheet does not contain any member rows to sync."
            />
          )}
          {preview.summary.total_rows > 0 && filteredRows.length === 0 && (
            <div className="rounded-xl border border-border bg-background p-6 text-center text-sm text-muted space-y-2">
              <p>
                {filterMode === 'changes'
                  ? 'All valid rows in the Google Sheet match the current member records — no field changes detected.'
                  : 'No rows match the selected filter.'}
              </p>
              {filterMode !== 'all' && (
                <Button
                  type="button"
                  variant="primaryOutline"
                  size="sm"
                  onClick={() => setFilterMode('all')}
                >
                  Show All Rows ({preview.summary.total_rows})
                </Button>
              )}
            </div>
          )}
          {preview.summary.total_rows > 0 && filteredRows.length > 0 && (
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
                  {filteredRows.map((row) => {
                    const isExpanded = expandedRowNumbers.has(row.row_number);
                    const unchanged = isRowUnchanged(row);
                    return (
                      <Fragment key={`${row.row_number}-${row.member_id}`}>
                        <ListTableRow hover="none">
                          <ListTableCell className="text-center">
                            <button
                              type="button"
                              onClick={() => toggleRow(row.row_number)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted transition-colors hover:bg-background hover:text-text focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
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
                            {row.member_id || '—'}
                          </ListTableCell>
                          <ListTableCell className="text-sm font-medium text-text">
                            {row.first_name || row.last_name ? (
                              <>
                                {row.first_name} {row.last_name}{' '}
                                {row.nickname && (
                                  <span className="font-normal text-muted">({row.nickname})</span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted">—</span>
                            )}
                          </ListTableCell>
                          <ListTableCell>
                            {unchanged ? (
                              <span className="inline-flex rounded-full bg-background border border-border px-2 py-0.5 text-xs font-medium text-muted">
                                Unchanged
                              </span>
                            ) : (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getOperationBadgeClass(
                                  row.operation,
                                )}`}
                              >
                                {row.operation === 'error'
                                  ? 'Skipped'
                                  : getOperationLabel(row.operation)}
                              </span>
                            )}
                          </ListTableCell>
                          <ListTableCell className="truncate text-xs text-muted">
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
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="primaryOutline"
          onClick={() => navigate(ROUTE_PATHS.adminMembers)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          disabled={!preview || validRowCount === 0}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Confirm &amp; Sync
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Confirm Google Sheet member sync"
        description={
          <div className="space-y-2 text-sm text-muted">
            <p>
              You are about to sync <strong className="text-text">{validRowCount}</strong> valid
              row(s) from the configured Google Sheet:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>
                <strong className="text-text">{preview?.summary.insert_count ?? 0}</strong> new
                member(s) will be inserted.
              </li>
              <li>
                <strong className="text-text">{preview?.summary.update_count ?? 0}</strong> existing
                member(s) have field changes to update.
              </li>
              {Boolean(preview?.summary.update_member_id_count) && (
                <li>
                  <strong className="text-text">{preview?.summary.update_member_id_count}</strong>{' '}
                  member ID(s) will be reassigned.
                </li>
              )}
              {Boolean(preview?.summary.unchanged_count) && (
                <li>
                  <strong className="text-text">{preview?.summary.unchanged_count}</strong> matched
                  member(s) have no field changes.
                </li>
              )}
              {Boolean(preview?.summary.error_count) && (
                <li>
                  <strong className="text-danger">{preview?.summary.error_count}</strong> invalid or
                  conflicting row(s) will be skipped.
                </li>
              )}
            </ul>
          </div>
        }
        confirmLabel="Start Sync"
        confirmLoadingLabel="Syncing..."
        isPending={isSyncing}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          void handleConfirmSync();
        }}
      />
    </div>
  );
}
