import { useMemo, useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import {
  useBulkUpsertServiceAttendanceMutation,
  useServiceLayoutsQuery,
  useServiceSeatsQuery,
} from '@/hooks/domain/services';
import {
  type ServiceAttendanceCsvPreviewRow,
  buildFailedServiceAttendanceCsvExport,
  parseServiceAttendanceCsv,
  parseServiceAttendanceXlsx,
  processParsedCsvData,
} from '@/lib/domain/services';

import { useAttendanceMigrationEnrichment } from '../hooks/useAttendanceMigrationEnrichment';
import type { EnrichedServiceAttendanceRow, RowOverride, StatusFilter } from '../types';
import { MatchMemberModal } from './MatchMemberModal';
import { MigrationConfirmDialog } from './MigrationConfirmDialog';
import { MigrationPreviewTable } from './MigrationPreviewTable';
import { type FileChangeData, MigrationUploadControls } from './MigrationUploadControls';

export function ServiceAttendanceMigrationPanel() {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [rawRows, setRawRows] = useState<ServiceAttendanceCsvPreviewRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [ignoreFailedRecords, setIgnoreFailedRecords] = useState(false);
  const [rowOverrides, setRowOverrides] = useState<Record<number, RowOverride>>({});
  const [editingRow, setEditingRow] = useState<EnrichedServiceAttendanceRow | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: layouts } = useServiceLayoutsQuery();
  const { data: seats } = useServiceSeatsQuery(selectedLayoutId);

  const bulkUpsertMutation = useBulkUpsertServiceAttendanceMutation();

  const { previewRows, isLoadingLookups, isProcessing } = useAttendanceMigrationEnrichment({
    rawRows,
    seats,
    isParsingCsv,
    fileInputKey,
    rowOverrides,
  });

  const handleFileChange = async ({ file, targetDate, sheets }: FileChangeData) => {
    if (!selectedLayoutId) {
      toast.error('Please select a layout before uploading.');
      setFileInputKey((k) => k + 1);
      return;
    }

    setIsParsingCsv(true);
    try {
      // Yield slightly to paint the loading state
      await new Promise((resolve) => setTimeout(resolve, 10));

      const isXlsx = file.name.endsWith('.xlsx');
      let parseResult;

      if (isXlsx) {
        parseResult = await parseServiceAttendanceXlsx(file, { sheets });
      } else {
        const text = await file.text();
        parseResult = parseServiceAttendanceCsv(text);
      }

      if (!parseResult.success) {
        toast.error(parseResult.error);
        setRawRows([]);
        return;
      }

      let initialPreview = processParsedCsvData(parseResult.data);

      // Filter out rows where the mapped date does not match the chosen target Sunday
      if (targetDate) {
        initialPreview = initialPreview.filter((r) => r.service_date === targetDate);
      }

      if (initialPreview.length === 0) {
        toast.error(`No records found matching the target date: ${targetDate}`);
        setRawRows([]);
        return;
      }

      setRawRows(initialPreview);
      setStatusFilter('all');
      setIgnoreFailedRecords(false);
      setRowOverrides({});
    } catch (err) {
      console.error(err);
      toast.error('Failed to read or parse the file');
      setRawRows([]);
      setStatusFilter('all');
      setIgnoreFailedRecords(false);
      setRowOverrides({});
    } finally {
      setIsParsingCsv(false);
      setFileInputKey((k) => k + 1);
    }
  };

  const handleAssignMember = (
    rowNumber: number,
    override: RowOverride,
    options?: { applyToMatchingFailed?: boolean; matchingRowNumbers?: number[] },
  ) => {
    const targetRowNumbers =
      options?.applyToMatchingFailed &&
      options.matchingRowNumbers &&
      options.matchingRowNumbers.length > 0
        ? options.matchingRowNumbers
        : [rowNumber];

    setRowOverrides((prev) => {
      const next = { ...prev };
      for (const num of targetRowNumbers) {
        next[num] = override;
      }
      return next;
    });

    if (targetRowNumbers.length > 1) {
      toast.success(
        `Matched ${override.memberName} to ${targetRowNumbers.length} records (Rows ${targetRowNumbers.map((n) => `#${n}`).join(', ')})`,
      );
    } else {
      toast.success(`Row #${rowNumber} matched to ${override.memberName}`);
    }
  };

  const handleExportFailedRows = () => {
    const failedRows = previewRows.filter((r) => !r.isValid);
    if (failedRows.length === 0) {
      toast.info('No failed rows to export.');
      return;
    }

    try {
      const { csvText, filename } = buildFailedServiceAttendanceCsvExport({ failedRows });
      const blob = new Blob([csvText], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(
        `Successfully exported ${failedRows.length} failed record${failedRows.length === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to export failed records CSV.');
    }
  };

  const totalRowCount = previewRows.length;
  const invalidRowCount = previewRows.filter((r) => !r.isValid).length;
  const validRowCount = totalRowCount - invalidRowCount;
  const hasSelectedFile = previewRows.length > 0;

  const handleImport = async () => {
    if (previewRows.length === 0) return;

    const validRows = previewRows.filter((r) => r.isValid);
    const invalidRows = previewRows.filter((r) => !r.isValid);

    if (invalidRows.length > 0 && !ignoreFailedRecords) {
      toast.error(
        `Cannot import. ${invalidRows.length} rows have errors. Fix the CSV or ignore failed records and try again.`,
      );
      setIsConfirmOpen(false);
      return;
    }

    const rowsToMigrate = ignoreFailedRecords ? validRows : previewRows;
    if (rowsToMigrate.length === 0) {
      toast.error('No valid rows available to import.');
      setIsConfirmOpen(false);
      return;
    }

    if (!selectedLayoutId) {
      toast.error('No layout selected');
      setIsConfirmOpen(false);
      return;
    }

    try {
      const payload = {
        layout_id: selectedLayoutId,
        rows: rowsToMigrate.map((r) => ({
          user_id: r.user_id as string,
          rfid: r.rfid,
          service_date: r.service_date,
          time_slot: r.time_slot,
          checked_in_at: r.checked_in_at,
          is_walk_in: r.is_walk_in,
          is_override: r.is_override,
          is_manual_entry: r.is_manual_entry,
          service_seat_id: r.service_seat_id,
          metadata: r.metadata,
        })),
      };

      await bulkUpsertMutation.mutateAsync(payload);
      toast.success(
        ignoreFailedRecords && invalidRowCount > 0
          ? `Migration completed successfully (${validRows.length} valid row${validRows.length === 1 ? '' : 's'} imported, ${invalidRowCount} failed row${invalidRowCount === 1 ? '' : 's'} skipped)`
          : 'Migration completed successfully',
      );
      setRawRows([]);
      setSelectedLayoutId('');
      setStatusFilter('all');
      setIgnoreFailedRecords(false);
      setRowOverrides({});
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setIsConfirmOpen(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (statusFilter === 'failed') {
      return previewRows.filter((r) => !r.isValid);
    }
    if (statusFilter === 'valid') {
      return previewRows.filter((r) => r.isValid);
    }
    return previewRows;
  }, [previewRows, statusFilter]);

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-xs">
      <div className="flex flex-col border-b border-border p-6">
        <h2 className="font-heading text-xl font-semibold text-text">
          Import Service Attendance from CSV
        </h2>
        <p className="mt-1 text-sm text-muted">
          Select a layout, then upload the Excel-exported CSV to map tables and users.
        </p>
      </div>

      <div className="p-6">
        <MigrationUploadControls
          layouts={layouts}
          selectedLayoutId={selectedLayoutId}
          onSelectLayoutId={(val) => {
            setSelectedLayoutId(val);
            setRawRows([]);
            setStatusFilter('all');
            setIgnoreFailedRecords(false);
            setRowOverrides({});
          }}
          fileInputKey={fileInputKey}
          onFileChange={handleFileChange}
          isProcessing={isProcessing}
          isParsingCsv={isParsingCsv}
        />

        {hasSelectedFile && (
          <MigrationPreviewTable
            filteredRows={filteredRows}
            totalRowCount={totalRowCount}
            invalidRowCount={invalidRowCount}
            validRowCount={validRowCount}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            isLoadingLookups={isLoadingLookups}
            isIgnoringFailed={ignoreFailedRecords}
            onToggleIgnoreFailed={setIgnoreFailedRecords}
            onExportFailedRows={handleExportFailedRows}
            onEditRow={setEditingRow}
          />
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted">
          {hasSelectedFile && (
            <>
              {invalidRowCount > 0 && !ignoreFailedRecords ? (
                <span className="font-medium text-danger">
                  {invalidRowCount} row{invalidRowCount === 1 ? '' : 's'} with errors must be fixed
                  or ignored before migrating.
                </span>
              ) : invalidRowCount > 0 && ignoreFailedRecords ? (
                <span className="font-medium text-amber-800">
                  Skipping {invalidRowCount} failed row{invalidRowCount === 1 ? '' : 's'}. Ready to
                  migrate {validRowCount} valid record{validRowCount === 1 ? '' : 's'}.
                </span>
              ) : (
                <span>
                  {validRowCount} record{validRowCount === 1 ? '' : 's'} ready for migration.
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-3">
          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={
              bulkUpsertMutation.isPending ||
              !hasSelectedFile ||
              validRowCount === 0 ||
              (!ignoreFailedRecords && invalidRowCount > 0) ||
              isProcessing
            }
            type="button"
          >
            {bulkUpsertMutation.isPending
              ? 'Migrating...'
              : ignoreFailedRecords && invalidRowCount > 0
                ? `Migrate Valid Records (${validRowCount})`
                : 'Run Migration'}
          </Button>
        </div>
      </div>

      <MigrationConfirmDialog
        isOpen={isConfirmOpen}
        previewRowCount={ignoreFailedRecords ? validRowCount : previewRows.length}
        ignoredRowCount={ignoreFailedRecords ? invalidRowCount : 0}
        isPending={bulkUpsertMutation.isPending}
        onConfirm={() => {
          void handleImport();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <MatchMemberModal
        isOpen={Boolean(editingRow)}
        row={editingRow}
        allRows={previewRows}
        onClose={() => setEditingRow(null)}
        onAssignMember={handleAssignMember}
      />
    </div>
  );
}
