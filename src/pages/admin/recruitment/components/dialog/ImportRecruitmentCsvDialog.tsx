import { useId, useMemo, useRef, useState } from 'react';

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  UploadCloud,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useBulkImportRecruitmentMutation } from '@/hooks/domain/recruitment';
import {
  type RecruitmentImportPreviewRow,
  type RecruitmentImportPreviewSummary,
  fetchExistingRecruitmentEmails,
  parseRecruitmentCsvText,
} from '@/lib/domain/recruitment';

export interface ImportRecruitmentCsvDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = 'all' | 'valid' | 'duplicates' | 'errors';

const SAMPLE_CSV_HEADERS = [
  'ID',
  'Created',
  'Role',
  'Status',
  'First Name',
  'Middle Name',
  'Last Name',
  'Nickname',
  'DOB',
  'Age',
  'Mobile Number',
  'Email',
  'Gender',
  'Attestation',
  'Endorsement Info',
  'Scheduled Orientation On',
  'Scheduled Evaluation On',
  'Scheduled Observation On',
  'Scheduled Interview On',
  'Scheduled Operations Onboarding On',
  'Started On',
  'Constant DGroup Attendee?',
  'GCL 1 Course Status',
  'GLC 2 Course Status',
  'Is this your first time to apply in the Welcome Center?',
  'What happened to previous application?',
  'Life Stage',
  'Wedding Anniversary',
  'Occupation',
  'Company Name',
  'Emergency Contact Name',
  'Emergency Contact Number',
  'Relation to the Applicant',
  'CCF Member in Years',
  'Other Ministries',
  'How long as a DGroup Member (In Years)',
  'Name of DGroup Leader',
  'Email of DGroup Leader',
  'Mobile of DGroup Leader',
  'Is a DGroup Leader?',
  'How long as a DGroup Leader (In Years)',
  'How many members do you have?',
].join(',');

const SAMPLE_CSV_ROW = [
  '1',
  '2024-01-15T09:00:00Z',
  'Usher',
  'active',
  'Juan',
  '',
  'Dela Cruz',
  'Juan',
  '1995-04-20',
  '29',
  '09171234567',
  'juan.delacruz@example.com',
  'Male',
  '2024-01-15T09:00:00Z',
  'Endorsed',
  '',
  '',
  '',
  '2024-02-01T10:00:00Z',
  '',
  '',
  'Yes',
  'Completed',
  'None',
  'Yes',
  '',
  'Single',
  '',
  'Software Engineer',
  'Tech Corp',
  'Maria Dela Cruz',
  '09179876543',
  'Mother',
  '3',
  'None',
  '2',
  'Pedro Santos',
  'pedro.santos@example.com',
  '09181234567',
  'No',
  '',
  '',
].join(',');

function renderRowValidationBadge(row: RecruitmentImportPreviewRow) {
  if (row.isValid) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ready
      </span>
    );
  }
  if (row.isDuplicate) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
        <AlertTriangle className="h-3.5 w-3.5" />
        Duplicate (Skip)
      </span>
    );
  }
  return (
    <div className="text-danger">
      <span className="inline-flex items-center gap-1 font-medium">
        <AlertCircle className="h-3.5 w-3.5" />
        Invalid
      </span>
      <p className="text-[10px] text-danger/80 mt-0.5">{row.errors.join(', ')}</p>
    </div>
  );
}

export function ImportRecruitmentCsvDialog({ isOpen, onClose }: ImportRecruitmentCsvDialogProps) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<RecruitmentImportPreviewRow[]>([]);
  const [summary, setSummary] = useState<RecruitmentImportPreviewSummary | null>(null);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [importComplete, setImportComplete] = useState(false);
  const [importedCounts, setImportedCounts] = useState<{
    inserted: number;
    skipped: number;
    total: number;
  } | null>(null);

  const bulkImportMutation = useBulkImportRecruitmentMutation();

  const handleReset = () => {
    setFile(null);
    setIsParsing(false);
    setParseError(null);
    setPreviewRows([]);
    setSummary(null);
    setFilterTab('all');
    setImportComplete(false);
    setImportedCounts(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setIsParsing(true);
    setImportComplete(false);

    try {
      const [existingEmails, csvText] = await Promise.all([
        fetchExistingRecruitmentEmails(),
        selectedFile.text(),
      ]);

      const result = parseRecruitmentCsvText(csvText, existingEmails);
      if (!result.success) {
        setParseError(result.error ?? 'Failed to parse CSV file.');
        setPreviewRows([]);
        setSummary(null);
      } else {
        setPreviewRows(result.rows);
        setSummary(result.summary);
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Error processing CSV file.');
      setPreviewRows([]);
      setSummary(null);
    } finally {
      setIsParsing(false);
    }
  };

  const filteredRows = useMemo(() => {
    if (filterTab === 'valid') {
      return previewRows.filter((r) => r.isValid);
    }
    if (filterTab === 'duplicates') {
      return previewRows.filter((r) => r.isDuplicate);
    }
    if (filterTab === 'errors') {
      return previewRows.filter((r) => r.errors.length > 0 && !r.isDuplicate);
    }
    return previewRows;
  }, [previewRows, filterTab]);

  const handleDownloadTemplate = () => {
    const csvContent = `${SAMPLE_CSV_HEADERS}\r\n${SAMPLE_CSV_ROW}\r\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recruitment-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExecuteImport = async () => {
    const validRows = previewRows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    try {
      const response = await bulkImportMutation.mutateAsync(validRows.map((r) => r.payload));
      setImportedCounts({
        inserted: response.inserted_count,
        skipped: response.skipped_count,
        total: response.total_count,
      });
      setImportComplete(true);
    } catch {
      // Mutation error handled by React Query / AlertBanner below
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="xl">
      <Dialog.Header showCloseButton>
        <Dialog.Title>Import Recruitment Applications</Dialog.Title>
        <Dialog.Description>
          Migrate legacy applicant profiles, milestones, and endorsement history into the 9-step
          pipeline.
        </Dialog.Description>
      </Dialog.Header>

      <Dialog.Body>
        <div className="space-y-5">
          {importComplete && importedCounts ? (
            <div className="rounded-2xl border border-border bg-surface p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-text">Import Successfully Completed</h3>
                <p className="text-sm text-muted">
                  The applicant records and pipeline transaction logs have been created in the
                  database.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-background p-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-text">{importedCounts.inserted}</div>
                  <div className="text-xs text-muted">Newly Inserted</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-amber-600">{importedCounts.skipped}</div>
                  <div className="text-xs text-muted">Skipped (Duplicate)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">{importedCounts.total}</div>
                  <div className="text-xs text-muted">Processed</div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {!file ? (
                <div className="space-y-4">
                  <label
                    htmlFor={fileInputId}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-background/50 p-8 text-center transition-colors hover:border-primary hover:bg-surface/50 cursor-pointer"
                  >
                    <UploadCloud className="mb-3 h-10 w-10 text-muted" aria-hidden="true" />
                    <span className="text-sm font-semibold text-text">
                      Click to upload or drag and drop legacy recruitment CSV
                    </span>
                    <span className="mt-1 text-xs text-muted">
                      Supports the legacy 42-column applicant export or standard Welcome Center CSV
                    </span>
                    <input
                      id={fileInputId}
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      className="sr-only"
                      onChange={(e) => {
                        const selected = e.target.files?.[0];
                        if (selected) {
                          void handleFileChange(selected);
                        }
                      }}
                    />
                  </label>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" />
                      <span>Need the legacy column structure reference?</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      className="text-primary hover:text-primary/80 shrink-0"
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download Template CSV
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileSpreadsheet className="h-5 w-5 text-primary shrink-0" />
                      <div className="min-w-0 truncate">
                        <p className="text-sm font-medium text-text truncate">{file.name}</p>
                        <p className="text-xs text-muted">
                          {(file.size / 1024).toFixed(1)} KB • {previewRows.length} rows parsed
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                      className="text-muted hover:text-text self-start sm:self-auto"
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Change File
                    </Button>
                  </div>

                  {isParsing && (
                    <div className="flex items-center justify-center p-8">
                      <Spinner size="md" />
                      <span className="ml-3 text-sm text-muted">
                        Validating and mapping rows...
                      </span>
                    </div>
                  )}

                  {parseError && (
                    <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger flex items-start gap-2.5">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Unable to parse file</p>
                        <p className="text-xs mt-0.5">{parseError}</p>
                      </div>
                    </div>
                  )}

                  {summary && !isParsing && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="rounded-xl border border-border bg-background p-3 text-center">
                          <div className="text-lg font-bold text-text">{summary.totalRows}</div>
                          <div className="text-xs text-muted">Total Rows</div>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-3 text-center">
                          <div className="text-lg font-bold text-emerald-600">
                            {summary.validRowsCount}
                          </div>
                          <div className="text-xs text-muted">Ready to Import</div>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-3 text-center">
                          <div className="text-lg font-bold text-amber-600">
                            {summary.duplicateRowsCount}
                          </div>
                          <div className="text-xs text-muted">Duplicate (Skip)</div>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-3 text-center">
                          <div className="text-lg font-bold text-danger">
                            {summary.errorRowsCount}
                          </div>
                          <div className="text-xs text-muted">Errors</div>
                        </div>
                      </div>

                      <Tabs
                        value={filterTab}
                        onValueChange={(val) => setFilterTab(val as FilterTab)}
                      >
                        <TabsList containerClassName="justify-start" className="w-auto">
                          <TabsTrigger value="all">All ({previewRows.length})</TabsTrigger>
                          <TabsTrigger value="valid">Ready ({summary.validRowsCount})</TabsTrigger>
                          <TabsTrigger value="duplicates">
                            Duplicates ({summary.duplicateRowsCount})
                          </TabsTrigger>
                          {summary.errorRowsCount > 0 && (
                            <TabsTrigger value="errors">
                              Errors ({summary.errorRowsCount})
                            </TabsTrigger>
                          )}
                        </TabsList>
                      </Tabs>

                      {/* Inner dynamic list container with colocated scrolling */}
                      <div className="max-h-[340px] overflow-y-auto rounded-xl border border-border bg-background pr-1">
                        {filteredRows.length === 0 ? (
                          <div className="p-8 text-center text-xs text-muted">
                            No records in this category.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="sticky top-0 bg-surface border-b border-border text-muted font-medium">
                              <tr>
                                <th className="p-2.5">Row</th>
                                <th className="p-2.5">Applicant</th>
                                <th className="p-2.5">Role</th>
                                <th className="p-2.5">Inferred Step</th>
                                <th className="p-2.5">Status</th>
                                <th className="p-2.5">Validation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {filteredRows.map((row) => (
                                <tr key={row.rowNumber} className="hover:bg-surface/50">
                                  <td className="p-2.5 font-mono text-muted">{row.rowNumber}</td>
                                  <td className="p-2.5">
                                    <div className="font-medium text-text">{row.fullName}</div>
                                    <div className="text-muted text-[11px]">{row.email}</div>
                                  </td>
                                  <td className="p-2.5">
                                    <Badge variant="outline">{row.desiredRole}</Badge>
                                  </td>
                                  <td className="p-2.5">
                                    <span className="font-semibold text-primary">
                                      Step {row.inferredStep}
                                    </span>
                                  </td>
                                  <td className="p-2.5">
                                    <span className="capitalize text-muted">{row.status}</span>
                                  </td>
                                  <td className="p-2.5">{renderRowValidationBadge(row)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  )}

                  {bulkImportMutation.isError && (
                    <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-xs text-danger">
                      {bulkImportMutation.error instanceof Error
                        ? bulkImportMutation.error.message
                        : 'Failed to complete bulk import. Please check your network and try again.'}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Dialog.Body>

      <Dialog.Footer>
        {importComplete ? (
          <Button variant="default" onClick={handleClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            {file && summary && summary.validRowsCount > 0 && (
              <Button
                variant="default"
                onClick={() => void handleExecuteImport()}
                disabled={bulkImportMutation.isPending || isParsing}
              >
                {bulkImportMutation.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Importing {summary.validRowsCount} applicants...
                  </>
                ) : (
                  `Import ${summary.validRowsCount} Applicants`
                )}
              </Button>
            )}
          </>
        )}
      </Dialog.Footer>
    </Dialog>
  );
}
