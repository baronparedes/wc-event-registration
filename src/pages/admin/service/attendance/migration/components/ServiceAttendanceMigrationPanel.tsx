import { useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FormSelectField } from '@/components/ui/FormSelectField';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import {
  type LookupUserByNameResult,
  type LookupUserByRfidResult,
  useBulkUpsertServiceAttendanceMutation,
  useLookupUsersByNamesQuery,
  useLookupUsersByRfidsQuery,
  useServiceLayoutsQuery,
  useServiceSeatsQuery,
} from '@/hooks/domain/services';
import {
  type ServiceAttendanceCsvPreviewRow,
  parseServiceAttendanceCsv,
  processParsedCsvData,
} from '@/lib/domain/services';

function getMemberNameFromRow(originalData: Record<string, string>): string {
  const candidateKeys = ['name', 'full name', 'member name'];
  for (const [key, value] of Object.entries(originalData)) {
    if (candidateKeys.includes(key.trim().toLowerCase()) && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

export function ServiceAttendanceMigrationPanel() {
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [rawRows, setRawRows] = useState<ServiceAttendanceCsvPreviewRow[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: layouts } = useServiceLayoutsQuery();
  const { data: seats } = useServiceSeatsQuery(selectedLayoutId);

  const bulkUpsertMutation = useBulkUpsertServiceAttendanceMutation();

  const rfidsToLookup = useMemo(() => {
    return Array.from(new Set(rawRows.map((r) => r.rfid).filter(Boolean)));
  }, [rawRows]);

  const {
    data: usersByRfid,
    isLoading: isLoadingRfids,
    error: rfidLookupError,
  } = useLookupUsersByRfidsQuery(rfidsToLookup);

  const rfidToUserMap = useMemo(() => {
    const map = new Map<string, LookupUserByRfidResult>();
    (usersByRfid ?? []).forEach((u) => map.set(u.member_id, u));
    return map;
  }, [usersByRfid]);

  const namesToLookup = useMemo(() => {
    if (rawRows.length === 0 || isLoadingRfids) return [];
    const set = new Set<string>();
    rawRows.forEach((row) => {
      if (!rfidToUserMap.has(row.rfid)) {
        const name = getMemberNameFromRow(row.originalData);
        if (name) set.add(name);
      }
    });
    return Array.from(set);
  }, [rawRows, isLoadingRfids, rfidToUserMap]);

  const {
    data: usersByName,
    isLoading: isLoadingNames,
    error: nameLookupError,
  } = useLookupUsersByNamesQuery(namesToLookup);

  const nameToUserMap = useMemo(() => {
    const map = new Map<string, LookupUserByNameResult>();
    (usersByName ?? []).forEach((u) => map.set(u.full_name.trim().toLowerCase(), u));
    return map;
  }, [usersByName]);

  const isLoadingLookups =
    (isLoadingRfids && rfidsToLookup.length > 0) || (isLoadingNames && namesToLookup.length > 0);

  const tableToSeatIdMap = useMemo(() => {
    const map = new Map<string, string>();
    (seats ?? []).forEach((s) => {
      tableToSeatIdMap.set(s.table_number.toLowerCase(), s.id);
    });
    return map;
  }, [seats]);

  const previewRows = useMemo(() => {
    if (rawRows.length === 0) return [];

    return rawRows.map((row) => {
      const enriched = { ...row, errors: [...row.errors] };
      const rowName = getMemberNameFromRow(row.originalData);

      // Try matching by RFID first, then fallback to full name matching
      const matchedUser =
        (row.rfid ? rfidToUserMap.get(row.rfid) : undefined) ??
        (rowName ? nameToUserMap.get(rowName.toLowerCase()) : undefined);

      const seatId = row.table_number
        ? tableToSeatIdMap.get(row.table_number.toLowerCase())
        : undefined;

      if (matchedUser) {
        enriched.user_id = matchedUser.id;
        enriched.member_name = matchedUser.full_name;
      } else {
        enriched.isValid = false;
        if (rowName) {
          enriched.errors.push(
            `Member "${rowName}" (RFID: ${row.rfid || 'N/A'}) not found in system.`,
          );
        } else {
          enriched.errors.push(`RFID ${row.rfid} not found in system.`);
        }
      }

      if (seatId) {
        enriched.service_seat_id = seatId;
      } else {
        enriched.isValid = false;
        enriched.errors.push(`Table ${row.table_number} not found in selected layout.`);
      }

      return enriched;
    });
  }, [rawRows, rfidToUserMap, nameToUserMap, tableToSeatIdMap]);

  const notifiedFileKeyRef = useRef<number>(-1);
  useEffect(() => {
    if (rawRows.length === 0 || isLoadingLookups || notifiedFileKeyRef.current === fileInputKey) {
      return;
    }
    notifiedFileKeyRef.current = fileInputKey;

    const unresolved = previewRows
      .filter((r) => !r.user_id)
      .map((r) => {
        const name = getMemberNameFromRow(r.originalData);
        return name ? `"${name}" (RFID: ${r.rfid || 'N/A'})` : `RFID: ${r.rfid}`;
      });
    const uniqueUnresolved = Array.from(new Set(unresolved));

    if (uniqueUnresolved.length > 0) {
      toast.error(`Could not resolve member(s): ${uniqueUnresolved.join(', ')}`);
    } else {
      toast.success('CSV parsed and validated');
    }
  }, [rawRows.length, isLoadingLookups, fileInputKey, previewRows]);

  useEffect(() => {
    if (rfidLookupError) {
      toast.error('Failed to look up users by RFID');
      console.error(rfidLookupError);
    }
  }, [rfidLookupError]);

  useEffect(() => {
    if (nameLookupError) {
      toast.error('Failed to look up users by name');
      console.error(nameLookupError);
    }
  }, [nameLookupError]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedLayoutId) {
      toast.error('Please select a layout before uploading.');
      setFileInputKey((k) => k + 1);
      return;
    }

    try {
      const text = await file.text();
      const parseResult = parseServiceAttendanceCsv(text);

      if (!parseResult.success) {
        toast.error(parseResult.error);
        setRawRows([]);
        return;
      }

      const initialPreview = processParsedCsvData(parseResult.data);
      setRawRows(initialPreview);
    } catch (err) {
      console.error(err);
      toast.error('Failed to read CSV file');
      setRawRows([]);
    } finally {
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
          is_walk_in: false,
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
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Migration failed');
    } finally {
      setIsConfirmOpen(false);
    }
  };

  const hasSelectedFile = previewRows.length > 0;
  const invalidRowCount = previewRows.filter((r) => !r.isValid).length;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm">
      <div className="flex flex-col border-b border-border p-6">
        <h2 className="text-xl font-bold">Import Service Attendance from CSV</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Select a layout, then upload the Excel-exported CSV to map tables and users.
        </p>
      </div>

      <div className="p-6">
        <div className="mb-6 max-w-sm">
          <label className="mb-2 block text-sm font-medium">1. Select Layout for Migration</label>
          <FormSelectField
            id="layout-select"
            value={selectedLayoutId}
            onChange={(val) => {
              setSelectedLayoutId(val);
              setRawRows([]);
            }}
            placeholder="Select a layout..."
            options={(layouts ?? []).map((l) => ({ value: l.id, label: l.description }))}
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium">2. Upload CSV File</label>
          <input
            key={fileInputKey}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={!selectedLayoutId || isLoadingLookups}
            className="block w-full max-w-sm text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-surface-elevated file:px-4 file:py-2 file:text-sm file:font-medium file:text-text-primary hover:file:bg-surface-elevated-hover focus:outline-none disabled:opacity-50"
          />
          {isLoadingLookups && (
            <p className="mt-2 text-sm text-text-secondary">Looking up data...</p>
          )}
        </div>

        {hasSelectedFile && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">
                Preview ({previewRows.length} row{previewRows.length === 1 ? '' : 's'})
              </h3>
              {invalidRowCount > 0 && (
                <span className="text-sm font-medium text-red-500">
                  {invalidRowCount} row{invalidRowCount === 1 ? '' : 's'} have errors. Migration
                  will fail.
                </span>
              )}
            </div>

            <div className="max-h-[500px] overflow-auto rounded-lg border border-border bg-surface">
              <ListTable>
                <ListTableHead>
                  <ListTableHeaderRow>
                    <ListTableHeaderCell>Status</ListTableHeaderCell>
                    <ListTableHeaderCell>RFID (User)</ListTableHeaderCell>
                    <ListTableHeaderCell>Date</ListTableHeaderCell>
                    <ListTableHeaderCell>Time Slot</ListTableHeaderCell>
                    <ListTableHeaderCell>Table</ListTableHeaderCell>
                    <ListTableHeaderCell>Role</ListTableHeaderCell>
                  </ListTableHeaderRow>
                </ListTableHead>
                <ListTableBody>
                  {previewRows.map((row, index) => (
                    <ListTableRow key={index} className={!row.isValid ? 'bg-red-50/50' : ''}>
                      <ListTableCell>
                        {row.isValid ? (
                          <span className="text-green-600 font-medium text-sm">Valid</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="text-red-600 font-medium text-sm">Error</span>
                            {row.errors.map((e, i) => (
                              <span key={i} className="text-xs text-red-500">
                                {e}
                              </span>
                            ))}
                          </div>
                        )}
                      </ListTableCell>
                      <ListTableCell>
                        <div className="flex flex-col">
                          <span>{row.rfid}</span>
                          {row.member_name && (
                            <span className="text-xs text-text-secondary">{row.member_name}</span>
                          )}
                        </div>
                      </ListTableCell>
                      <ListTableCell>{row.service_date}</ListTableCell>
                      <ListTableCell>{row.time_slot}</ListTableCell>
                      <ListTableCell>{row.table_number}</ListTableCell>
                      <ListTableCell>{row.metadata?.role as string}</ListTableCell>
                    </ListTableRow>
                  ))}
                </ListTableBody>
              </ListTable>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
        <Button
          onClick={() => setIsConfirmOpen(true)}
          disabled={bulkUpsertMutation.isPending || !hasSelectedFile || invalidRowCount > 0}
          type="button"
        >
          {bulkUpsertMutation.isPending ? 'Migrating...' : 'Run Migration'}
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="Migrate Service Attendance"
        description={
          <div className="space-y-2">
            <p>
              This will upsert {previewRows.length} attendance record
              {previewRows.length === 1 ? '' : 's'}. Existing records matching on conflict keys will
              be ignored.
            </p>
            <p>Continue?</p>
          </div>
        }
        confirmLabel="Confirm Migration"
        confirmLoadingLabel="Migrating..."
        confirmVariant="default"
        isPending={bulkUpsertMutation.isPending}
        disabled={previewRows.length === 0}
        onConfirm={() => {
          void handleImport();
        }}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}
