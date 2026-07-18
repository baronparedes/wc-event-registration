import { useState } from 'react';

import { toast } from 'sonner';

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
import { useBulkUpsertAttendanceAnswersMutation } from '@/hooks/domain/attendance';
import {
  type BulkAttendanceCsvRowInput,
  buildBulkAttendanceCsvRowsSchema,
  buildBulkAttendanceRowsFromCsv,
  parseCsvText,
} from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';

type BulkUploadPanelProps = {
  eventId: string;
  fields: AttendanceField[];
  onClose: () => void;
  displayMode?: 'overlay' | 'page';
};

function extractBulkUploadErrorMessages(error: unknown): string[] {
  if (!(error instanceof Error)) {
    return ['Bulk upload failed.'];
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
    // Fall through to raw error message.
  }

  return [error.message || 'Bulk upload failed.'];
}

function getCellInputType(field: AttendanceField): 'number' | 'text' | 'date' | 'datetime-local' {
  if (field.field_type === 'number') return 'number';
  if (field.field_type === 'date') return 'date';
  if (field.field_type === 'datetime') return 'datetime-local';
  return 'text';
}

const previewInputClassName =
  'w-full min-w-24 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text shadow-xs focus:outline-none focus:ring-2 focus:ring-primary/30';

/** Bulk CSV upload UI for attendance answers. Can render either as an overlay or a standalone page section. */
export function BulkUploadPanel({
  eventId,
  fields,
  onClose,
  displayMode = 'overlay',
}: BulkUploadPanelProps) {
  const bulkUpsertMutation = useBulkUpsertAttendanceAnswersMutation();
  const [fileName, setFileName] = useState<string>('');
  const [preparedRows, setPreparedRows] = useState<BulkAttendanceCsvRowInput[]>([]);
  const [parsedPreviewRows, setParsedPreviewRows] = useState<Record<string, string>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const hasSelectedFile = fileName.trim().length > 0;

  function applyPreviewRowValidation(rows: Record<string, string>[]) {
    const builtRows = buildBulkAttendanceRowsFromCsv(rows, fields);
    if (builtRows.errors.length > 0) {
      setPreparedRows([]);
      setErrors(builtRows.errors);
      return;
    }

    const validator = buildBulkAttendanceCsvRowsSchema(fields);
    const validation = validator.safeParse(builtRows.rows);
    if (!validation.success) {
      setPreparedRows([]);
      setErrors(
        validation.error.issues.map((issue) => {
          const path = issue.path.join('.');
          return path.length > 0 ? `${path}: ${issue.message}` : issue.message;
        }),
      );
      return;
    }

    setPreparedRows(validation.data);
    setErrors([]);
  }

  function handleCellChange(rowIndex: number, fieldKey: string, nextValue: string) {
    const nextRows = parsedPreviewRows.map((row, index) =>
      index === rowIndex ? { ...row, [fieldKey]: nextValue } : row,
    );

    setParsedPreviewRows(nextRows);
    applyPreviewRowValidation(nextRows);
  }

  async function handleFileChange(file: File | null) {
    if (!file) {
      setFileName('');
      setPreparedRows([]);
      setParsedPreviewRows([]);
      setErrors([]);
      return;
    }

    setFileName(file.name);
    setErrors([]);

    const fileText = await file.text();
    const parsedCsv = parseCsvText(fileText);

    if (!parsedCsv.success) {
      setPreparedRows([]);
      setParsedPreviewRows([]);
      setErrors([parsedCsv.error]);
      return;
    }

    setParsedPreviewRows(parsedCsv.data.rows);
    applyPreviewRowValidation(parsedCsv.data.rows);
  }

  async function handleImport() {
    if (preparedRows.length === 0) {
      setErrors(['Upload a valid CSV file before importing.']);
      return;
    }

    try {
      const result = await bulkUpsertMutation.mutateAsync({
        event_id: eventId,
        rows: preparedRows,
      });

      if (!result.success) {
        throw new Error(result.error ?? 'Bulk import failed.');
      }

      setIsConfirmOpen(false);
      toast.success(`Imported attendance data for ${result.imported_count} attendee(s).`);
      onClose();
    } catch (error) {
      setErrors(extractBulkUploadErrorMessages(error));
    }
  }

  const content = (
    <>
      {displayMode === 'overlay' && (
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-lg font-semibold text-text">Bulk CSV Upload</h2>
          <p className="mt-1 text-sm text-muted">
            Upload a CSV generated from the attendance template to overwrite attendee answers in
            bulk.
          </p>
        </div>
      )}

      <div className="space-y-4 px-6 py-4">
        <div className="rounded-lg border border-border bg-background p-3">
          <label htmlFor="attendance-csv-file" className="text-sm font-medium text-text">
            CSV file
          </label>
          <input
            id="attendance-csv-file"
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
        </div>

        {errors.length > 0 && (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2">
            <p className="text-sm font-medium text-danger">CSV validation failed</p>
            <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5 text-xs text-danger">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {parsedPreviewRows.length > 0 && (
          <div>
            <p className="font-heading text-lg font-semibold text-text">
              Preview ({parsedPreviewRows.length} row{parsedPreviewRows.length === 1 ? '' : 's'})
            </p>
            <p className="mt-1 text-sm text-muted">
              Edit the staged values below before confirming the import.
            </p>
            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
              <ListTable density="dense">
                <ListTableHead>
                  <ListTableHeaderRow variant="plain">
                    <ListTableHeaderCell className="w-40">Attendee Kind</ListTableHeaderCell>
                    <ListTableHeaderCell className="w-72">Name</ListTableHeaderCell>
                    {fields.map((field) => (
                      <ListTableHeaderCell key={field.id} className="min-w-44">
                        {field.label}
                      </ListTableHeaderCell>
                    ))}
                  </ListTableHeaderRow>
                </ListTableHead>
                <ListTableBody divider="default">
                  {parsedPreviewRows.map((row, index) => {
                    const attendeeName = row.full_name?.trim() || '—';
                    const rowKey =
                      row.registration_id?.trim() ||
                      row.public_registration_id?.trim() ||
                      `${row.attendee_kind ?? 'attendee'}-${index}`;

                    return (
                      <ListTableRow key={rowKey} hover="none">
                        <ListTableCell className="align-top text-sm text-text">
                          {row.attendee_kind}
                        </ListTableCell>
                        <ListTableCell className="align-top text-sm font-medium text-text">
                          {attendeeName}
                        </ListTableCell>
                        {fields.map((field) => {
                          const value = row[field.field_key] ?? '';
                          const fieldId = `preview-${index}-${field.field_key}`;

                          if (
                            (field.field_type === 'select' || field.field_type === 'radio') &&
                            field.options.length > 0
                          ) {
                            return (
                              <ListTableCell key={field.id} className="align-top">
                                <select
                                  id={fieldId}
                                  value={value}
                                  onChange={(event) =>
                                    handleCellChange(index, field.field_key, event.target.value)
                                  }
                                  className={previewInputClassName}
                                >
                                  <option value="">-- Select --</option>
                                  {field.options.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </ListTableCell>
                            );
                          }

                          if (field.field_type === 'boolean' || field.field_type === 'checkbox') {
                            return (
                              <ListTableCell key={field.id} className="align-top">
                                <select
                                  id={fieldId}
                                  value={value}
                                  onChange={(event) =>
                                    handleCellChange(index, field.field_key, event.target.value)
                                  }
                                  className={previewInputClassName}
                                >
                                  <option value="">--</option>
                                  <option value="true">True</option>
                                  <option value="false">False</option>
                                </select>
                              </ListTableCell>
                            );
                          }

                          return (
                            <ListTableCell key={field.id} className="align-top">
                              <input
                                id={fieldId}
                                type={getCellInputType(field)}
                                value={value}
                                onChange={(event) =>
                                  handleCellChange(index, field.field_key, event.target.value)
                                }
                                className={previewInputClassName}
                              />
                            </ListTableCell>
                          );
                        })}
                      </ListTableRow>
                    );
                  })}
                </ListTableBody>
              </ListTable>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={bulkUpsertMutation.isPending}
          type="button"
        >
          Cancel
        </Button>
        <Button
          onClick={() => setIsConfirmOpen(true)}
          disabled={bulkUpsertMutation.isPending || !hasSelectedFile}
          type="button"
        >
          {bulkUpsertMutation.isPending ? 'Importing...' : 'Import CSV'}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {displayMode === 'overlay' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface shadow-xl">
            {content}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface shadow-sm">{content}</div>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Import Attendance CSV"
        description={
          <div className="space-y-2">
            <p>
              This will overwrite attendance answers for the {preparedRows.length} attendee
              {preparedRows.length === 1 ? '' : 's'} included in this CSV.
            </p>
            <p>Continue only if you want to replace the existing values for those rows.</p>
          </div>
        }
        confirmLabel="Confirm Import"
        confirmLoadingLabel="Importing..."
        confirmVariant="default"
        isPending={bulkUpsertMutation.isPending}
        disabled={preparedRows.length === 0}
        onConfirm={() => {
          void handleImport();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
