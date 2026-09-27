import { AlertCircle, AlertTriangle, Download, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
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

import type { EnrichedServiceAttendanceRow, StatusFilter } from '../types';

interface MigrationPreviewTableProps {
  filteredRows: EnrichedServiceAttendanceRow[];
  totalRowCount: number;
  invalidRowCount: number;
  validRowCount: number;
  statusFilter: StatusFilter;
  onStatusFilterChange: (status: StatusFilter) => void;
  isLoadingLookups: boolean;
  isIgnoringFailed?: boolean;
  onToggleIgnoreFailed?: (ignore: boolean) => void;
  onExportFailedRows?: () => void;
  onEditRow?: (row: EnrichedServiceAttendanceRow) => void;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function MigrationPreviewTable({
  filteredRows,
  totalRowCount,
  invalidRowCount,
  validRowCount,
  statusFilter,
  onStatusFilterChange,
  isLoadingLookups,
  isIgnoringFailed = false,
  onToggleIgnoreFailed,
  onExportFailedRows,
  onEditRow,
}: MigrationPreviewTableProps) {
  return (
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
            <span
              className={cx(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold',
                isIgnoringFailed ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700',
              )}
            >
              {invalidRowCount} with error{invalidRowCount === 1 ? '' : 's'}
              {isIgnoringFailed && ' (Ignored)'}
            </span>
          )}
        </div>

        <Tabs
          value={statusFilter}
          onValueChange={(val) => onStatusFilterChange(val as StatusFilter)}
          className="w-auto"
        >
          <TabsList containerClassName="w-auto justify-start sm:justify-end" className="w-auto">
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
                      ? isIgnoringFailed
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-700'
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

      {invalidRowCount > 0 && (
        <div
          className={cx(
            'mb-4 flex flex-col gap-3 rounded-xl border p-3.5 text-xs sm:flex-row sm:items-center sm:justify-between',
            isIgnoringFailed
              ? 'border-amber-200 bg-amber-50/80 text-amber-900'
              : 'border-red-200 bg-red-50/80 text-red-800',
          )}
        >
          <div className="flex items-center gap-2">
            {isIgnoringFailed ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>
              {isIgnoringFailed ? (
                <>
                  <strong>
                    {invalidRowCount} failed record{invalidRowCount === 1 ? '' : 's'} ignored.
                  </strong>{' '}
                  Only {validRowCount} valid record{validRowCount === 1 ? '' : 's'} will be
                  migrated.
                </>
              ) : (
                <>
                  <strong>
                    {invalidRowCount} row{invalidRowCount === 1 ? '' : 's'} have errors
                  </strong>{' '}
                  and will prevent migration from running.
                </>
              )}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {statusFilter !== 'failed' && (
              <button
                type="button"
                onClick={() => onStatusFilterChange('failed')}
                className={cx(
                  'font-semibold underline',
                  isIgnoringFailed
                    ? 'text-amber-900 hover:text-amber-950'
                    : 'text-red-700 hover:text-red-950',
                )}
              >
                Review failed rows
              </button>
            )}
            {onExportFailedRows && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onExportFailedRows}
                className={cx(
                  'h-7 bg-white text-xs',
                  isIgnoringFailed
                    ? 'border-amber-300 text-amber-800 hover:bg-amber-100'
                    : 'border-red-300 text-red-700 hover:bg-red-100',
                )}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export Failed Records
              </Button>
            )}
            {onToggleIgnoreFailed && (
              <Button
                type="button"
                size="sm"
                variant={isIgnoringFailed ? 'outline' : 'destructive'}
                onClick={() => onToggleIgnoreFailed(!isIgnoringFailed)}
                className={cx(
                  'h-7 text-xs',
                  isIgnoringFailed
                    ? 'border-amber-300 bg-white text-amber-800 hover:bg-amber-100'
                    : 'bg-red-600 text-white hover:bg-red-700',
                )}
              >
                {isIgnoringFailed ? "Don't Ignore" : 'Ignore Failed Records'}
              </Button>
            )}
          </div>
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
              {onEditRow && (
                <ListTableHeaderCell className="text-right">Actions</ListTableHeaderCell>
              )}
            </ListTableHeaderRow>
          </ListTableHead>
          <ListTableBody>
            {filteredRows.length === 0 ? (
              <ListTableRow>
                <ListTableCell
                  colSpan={onEditRow ? 8 : 7}
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
                  className={
                    !row.isValid
                      ? isIgnoringFailed
                        ? 'bg-amber-50/40 opacity-80'
                        : 'bg-red-50/50'
                      : ''
                  }
                >
                  <ListTableCell className="text-xs text-text-secondary">
                    #{row.row_number}
                  </ListTableCell>
                  <ListTableCell>
                    {row.isValid ? (
                      <span className="text-green-600 font-medium text-sm">Valid</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-red-600 font-medium text-sm">Error</span>
                          {isIgnoringFailed && (
                            <span className="inline-flex items-center rounded-sm bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-700">
                              Ignored
                            </span>
                          )}
                        </div>
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
                      <div className="flex items-center gap-1.5">
                        <span>{row.rfid || '—'}</span>
                        {row.isManuallyMatched && (
                          <span className="inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0.2 text-[10px] font-semibold text-primary">
                            Matched
                          </span>
                        )}
                      </div>
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
                  {onEditRow && (
                    <ListTableCell className="text-right">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => onEditRow(row)}
                        className="h-7 text-xs"
                      >
                        {row.user_id ? 'Edit Match' : 'Match Member'}
                      </Button>
                    </ListTableCell>
                  )}
                </ListTableRow>
              ))
            )}
          </ListTableBody>
        </ListTable>
      </div>
    </div>
  );
}
