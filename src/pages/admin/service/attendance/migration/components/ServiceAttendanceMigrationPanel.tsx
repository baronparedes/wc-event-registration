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
  parseServiceAttendanceCsv,
  processParsedCsvData,
} from '@/lib/domain/services';

import { useAttendanceMigrationEnrichment } from '../hooks/useAttendanceMigrationEnrichment';
import type { StatusFilter } from '../types';
import { MigrationConfirmDialog } from './MigrationConfirmDialog';
import { MigrationPreviewTable } from './MigrationPreviewTable';
import { MigrationUploadControls } from './MigrationUploadControls';

export function ServiceAttendanceMigrationPanel() {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [rawRows, setRawRows] = useState<ServiceAttendanceCsvPreviewRow[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: layouts } = useServiceLayoutsQuery();
  const { data: seats } = useServiceSeatsQuery(selectedLayoutId);

  const bulkUpsertMutation = useBulkUpsertServiceAttendanceMutation();

  const { previewRows, isLoadingLookups, isProcessing } = useAttendanceMigrationEnrichment({
    rawRows,
    seats,
    isParsingCsv,
    fileInputKey,
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedLayoutId) {
      toast.error('Please select a layout before uploading.');
      setFileInputKey((k) => k + 1);
      return;
    }

    setIsParsingCsv(true);
    try {
      // Yield slightly to paint the loading state
      await new Promise((resolve) => setTimeout(resolve, 10));
      const text = await file.text();
      const parseResult = parseServiceAttendanceCsv(text);

      if (!parseResult.success) {
        toast.error(parseResult.error);
        setRawRows([]);
        return;
      }

      const initialPreview = processParsedCsvData(parseResult.data);
      setRawRows(initialPreview);
      setStatusFilter('all');
    } catch (err) {
      console.error(err);
      toast.error('Failed to read CSV file');
      setRawRows([]);
      setStatusFilter('all');
    } finally {
      setIsParsingCsv(false);
      setFileInputKey((k) => k + 1);
    }
  };

  const handleImport = async () => {
    if (previewRows.length === 0) return;

    const invalidRows = previewRows.filter((r) => !r.isValid);
    if (invalidRows.length > 0) {
      toast.error(
        `Cannot import. ${invalidRows.length} rows have errors. Fix the CSV and try again.`,
      );
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
        rows: previewRows.map((r) => ({
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
      toast.success('Migration completed successfully');
      setRawRows([]);
      setSelectedLayoutId('');
      setStatusFilter('all');
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setIsConfirmOpen(false);
    }
  };

  const hasSelectedFile = previewRows.length > 0;
  const totalRowCount = previewRows.length;
  const invalidRowCount = previewRows.filter((r) => !r.isValid).length;
  const validRowCount = totalRowCount - invalidRowCount;

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
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col border-b border-border p-6">
        <h2 className="text-xl font-bold">Import Service Attendance from CSV</h2>
        <p className="mt-1 text-sm text-text-secondary">
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
          />
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Button
          onClick={() => setIsConfirmOpen(true)}
          disabled={
            bulkUpsertMutation.isPending || !hasSelectedFile || invalidRowCount > 0 || isProcessing
          }
          type="button"
        >
          {bulkUpsertMutation.isPending ? 'Migrating...' : 'Run Migration'}
        </Button>
      </div>

      <MigrationConfirmDialog
        isOpen={isConfirmOpen}
        previewRowCount={previewRows.length}
        isPending={bulkUpsertMutation.isPending}
        onConfirm={() => {
          void handleImport();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
