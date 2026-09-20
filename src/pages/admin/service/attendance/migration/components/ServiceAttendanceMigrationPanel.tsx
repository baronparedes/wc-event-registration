import { useEffect, useMemo, useRef, useState } from 'react';

import { Loader2 } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
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
  USHER_BACKROOM_TABLE,
  mapServiceAttendanceTableNumber,
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

type StatusFilter = 'all' | 'failed' | 'valid';

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
    (usersByName ?? []).forEach((u) => {
      // 1. Primary: nickname + ' ' + last name
      const nickname = (u.nickname ?? '').trim();
      const lastName = (u.last_name ?? '').trim();
      if (nickname && lastName) {
        map.set(`${nickname} ${lastName}`.toLowerCase(), u);
      }

      // 2. Fallback: full_name
      if (u.full_name) {
        const fullNameKey = u.full_name.trim().toLowerCase();
        if (!map.has(fullNameKey)) {
          map.set(fullNameKey, u);
        }
      }

      // 3. Fallback: first_name + ' ' + last_name
      const firstName = (u.first_name ?? '').trim();
      if (firstName && lastName) {
        const firstLast = `${firstName} ${lastName}`.toLowerCase();
        if (!map.has(firstLast)) {
          map.set(firstLast, u);
        }
      }
    });
    return map;
  }, [usersByName]);

  const isLoadingLookups =
    (isLoadingRfids && rfidsToLookup.length > 0) || (isLoadingNames && namesToLookup.length > 0);

  const isProcessing = isParsingCsv || isLoadingLookups;

  const tableToSeatIdMap = useMemo(() => {
    const map = new Map<string, string>();
    (seats ?? []).forEach((s) => {
      map.set(s.table_number.toLowerCase(), s.id);
    });
    return map;
  }, [seats]);

  const previewRows = useMemo(() => {
    if (rawRows.length === 0) return [];

    return rawRows.map((row) => {
      const enriched = { ...row, errors: [...row.errors] };
      const rowName = getMemberNameFromRow(row.originalData);
      const normalizedRowName = rowName.trim().replace(/\s+/g, ' ').toLowerCase();

      // Try matching by RFID first, then fallback to nickname + last name / name matching
      const matchedUser =
        (row.rfid ? rfidToUserMap.get(row.rfid) : undefined) ??
        (normalizedRowName ? nameToUserMap.get(normalizedRowName) : undefined);

      const effectiveTableNumber = mapServiceAttendanceTableNumber(row.table_number);
      enriched.table_number = effectiveTableNumber;

      if (
        effectiveTableNumber === USHER_BACKROOM_TABLE &&
        row.table_number !== USHER_BACKROOM_TABLE
      ) {
        enriched.metadata = {
          ...enriched.metadata,
          original_table_number: enriched.metadata.original_table_number ?? row.table_number,
        };
      }

      const seatId = effectiveTableNumber
        ? tableToSeatIdMap.get(effectiveTableNumber.toLowerCase())
        : undefined;

      if (matchedUser) {
        enriched.user_id = matchedUser.id;
        enriched.member_name = matchedUser.full_name;
        if (!enriched.rfid && matchedUser.member_id) {
          enriched.rfid = matchedUser.member_id;
        }
        enriched.errors = enriched.errors.filter((e) => e !== 'RFID is missing');
        enriched.isValid = enriched.errors.length === 0;
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
        enriched.errors.push(
          `Table ${effectiveTableNumber || row.table_number} not found in selected layout.`,
        );
      }

      return enriched;
    });
  }, [rawRows, rfidToUserMap, nameToUserMap, tableToSeatIdMap]);

  const notifiedFileKeyRef = useRef<number>(-1);
  useEffect(() => {
    if (rawRows.length === 0 || isProcessing || notifiedFileKeyRef.current === fileInputKey) {
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
  }, [rawRows.length, isProcessing, fileInputKey, previewRows]);

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
        <div className="mb-6 max-w-sm">
          <label className="mb-2 block text-sm font-medium">1. Select Layout for Migration</label>
          <FormSelectField
            id="layout-select"
            value={selectedLayoutId}
            onChange={(val) => {
              setSelectedLayoutId(val);
              setRawRows([]);
              setStatusFilter('all');
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
            disabled={!selectedLayoutId || isProcessing}
            className="block w-full max-w-sm text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:bg-surface-elevated file:px-4 file:py-2 file:text-sm file:font-medium file:text-text-primary hover:file:bg-surface-elevated-hover focus:outline-none disabled:opacity-50"
          />
          {isProcessing && (
            <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>
                {isParsingCsv
                  ? 'Parsing and validating CSV file...'
                  : 'Looking up member details and seat assignments...'}
              </span>
            </div>
          )}
        </div>

        {hasSelectedFile && (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h3 className="flex items-center gap-2 font-semibold">
                  <span>
                    Preview ({totalRowCount} row{totalRowCount === 1 ? '' : 's'})
                  </span>
                  {isLoadingLookups && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Matching members...
                    </span>
                  )}
                </h3>
                {invalidRowCount > 0 && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    {invalidRowCount} with error{invalidRowCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>

              <Tabs
                value={statusFilter}
                onValueChange={(val) => setStatusFilter(val as StatusFilter)}
                className="w-auto"
              >
                <TabsList
                  containerClassName="w-auto justify-start sm:justify-end"
                  className="w-auto"
                >
                  <TabsTrigger value="all" className="!px-3 !py-1.5 !text-xs">
                    All ({totalRowCount})
                  </TabsTrigger>
                  <TabsTrigger
                    value="failed"
                    className={cx(
                      '!px-3 !py-1.5 !text-xs',
                      statusFilter === 'failed'
                        ? '!bg-red-600 text-white shadow-xs'
                        : 'hover:text-red-600',
                    )}
                  >
                    <span>Failed</span>
                    <span
                      className={cx(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                        statusFilter === 'failed'
                          ? 'bg-white/25 text-white'
                          : invalidRowCount > 0
                            ? 'bg-red-100 text-red-700'
                            : 'bg-border text-text-secondary',
                      )}
                    >
                      {invalidRowCount}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="valid"
                    className={cx(
                      '!px-3 !py-1.5 !text-xs',
                      statusFilter === 'valid'
                        ? '!bg-emerald-600 text-white shadow-xs'
                        : 'hover:text-emerald-600',
                    )}
                  >
                    <span>Valid</span>
                    <span
                      className={cx(
                        'rounded-full px-1.5 py-0.2 text-[10px] font-bold',
                        statusFilter === 'valid'
                          ? 'bg-white/25 text-white'
                          : 'bg-emerald-100 text-emerald-700',
                      )}
                    >
                      {validRowCount}
                    </span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {invalidRowCount > 0 && statusFilter === 'all' && (
              <div className="mb-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50/75 px-3.5 py-2 text-xs text-red-700">
                <span>
                  <strong>
                    {invalidRowCount} row{invalidRowCount === 1 ? '' : 's'} have errors
                  </strong>{' '}
                  and will prevent migration from running.
                </span>
                <button
                  type="button"
                  onClick={() => setStatusFilter('failed')}
                  className="font-semibold underline hover:text-red-800"
                >
                  Show only failed rows
                </button>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <ListTable>
                <ListTableHead>
                  <ListTableHeaderRow>
                    <ListTableHeaderCell>Row</ListTableHeaderCell>
                    <ListTableHeaderCell>Status</ListTableHeaderCell>
                    <ListTableHeaderCell>RFID (User)</ListTableHeaderCell>
                    <ListTableHeaderCell>Date</ListTableHeaderCell>
                    <ListTableHeaderCell>Time Slot</ListTableHeaderCell>
                    <ListTableHeaderCell>Table</ListTableHeaderCell>
                    <ListTableHeaderCell>Role</ListTableHeaderCell>
                  </ListTableHeaderRow>
                </ListTableHead>
                <ListTableBody>
                  {filteredRows.length === 0 ? (
                    <ListTableRow>
                      <ListTableCell
                        colSpan={7}
                        className="py-8 text-center text-sm text-text-secondary"
                      >
                        {statusFilter === 'failed'
                          ? 'No failed rows found! All rows are valid.'
                          : statusFilter === 'valid'
                            ? 'No valid rows found.'
                            : 'No preview data available.'}
                      </ListTableCell>
                    </ListTableRow>
                  ) : (
                    filteredRows.map((row) => (
                      <ListTableRow
                        key={row.row_number}
                        className={!row.isValid ? 'bg-red-50/50' : ''}
                      >
                        <ListTableCell className="text-xs text-text-secondary">
                          #{row.row_number}
                        </ListTableCell>
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
                        <ListTableCell>
                          <div className="flex flex-col items-start gap-1">
                            <span>{(row.metadata?.role as string) || '—'}</span>
                            {row.is_walk_in && (
                              <span className="inline-flex items-center rounded-sm border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                                Walk-in
                              </span>
                            )}
                          </div>
                        </ListTableCell>
                      </ListTableRow>
                    ))
                  )}
                </ListTableBody>
              </ListTable>
            </div>
          </div>
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
