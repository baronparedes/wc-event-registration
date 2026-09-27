import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  type EnrichedServiceAttendanceRow,
  MatchMemberModal,
  MigrationConfigDialog,
  MigrationConfirmDialog,
  MigrationPreviewTable,
  MigrationUploadControls,
} from '../index';

vi.mock('@/hooks/domain/members', () => ({
  useAdminMembersQuery: () => ({
    data: {
      pages: [
        {
          items: [
            {
              id: 'user-alice',
              member_id: 'RFID-001',
              full_name: 'Alice Smith',
              first_name: 'Alice',
              last_name: 'Smith',
              nickname: 'Ali',
            },
          ],
        },
      ],
    },
    isLoading: false,
  }),
  useMemberAvatarQuery: () => ({
    data: null,
    isLoading: false,
  }),
}));

describe('MigrationUploadControls', () => {
  it('renders layout selection and file upload button', () => {
    const onSelectLayoutId = vi.fn();
    const onFileChange = vi.fn();

    render(
      <MigrationUploadControls
        layouts={[{ id: 'layout-1', description: 'Main Auditorium' }]}
        selectedLayoutId=""
        onSelectLayoutId={onSelectLayoutId}
        fileInputKey={0}
        onFileChange={onFileChange}
        isProcessing={false}
        isParsingCsv={false}
      />,
    );

    expect(screen.getByText('1. Select Layout for Migration')).toBeInTheDocument();
    expect(screen.getByText('2. Upload File (.csv, .xlsx)')).toBeInTheDocument();

    const selectFileBtn = screen.getByRole('button', { name: /Select File\.\.\./i });
    expect(selectFileBtn).toBeInTheDocument();
    expect(selectFileBtn).toBeDisabled();
  });

  it('renders loading indicator when processing', () => {
    render(
      <MigrationUploadControls
        layouts={[{ id: 'layout-1', description: 'Main Auditorium' }]}
        selectedLayoutId="layout-1"
        onSelectLayoutId={vi.fn()}
        fileInputKey={0}
        onFileChange={vi.fn()}
        isProcessing={true}
        isParsingCsv={true}
      />,
    );

    expect(screen.getByText('Parsing and validating file...')).toBeInTheDocument();
  });
});

describe('MigrationPreviewTable', () => {
  const sampleRows: EnrichedServiceAttendanceRow[] = [
    {
      row_number: 1,
      originalData: { Name: 'Alice' },
      isValid: true,
      errors: [],
      rfid: 'RFID-001',
      member_name: 'Alice Smith',
      service_date: '2026-03-15',
      time_slot: '9AM',
      checked_in_at: '09:05:00',
      is_manual_entry: false,
      is_override: false,
      is_walk_in: true,
      table_number: '10',
      metadata: { role: 'Usher' },
    },
    {
      row_number: 2,
      originalData: { Name: 'Bob' },
      isValid: false,
      errors: ['RFID not found in system.'],
      rfid: 'RFID-999',
      service_date: '2026-03-15',
      time_slot: '9AM',
      checked_in_at: '09:10:00',
      is_manual_entry: false,
      is_override: false,
      is_walk_in: false,
      table_number: '12',
      metadata: {},
    },
  ];

  it('renders summary counts, tabs, and row details', () => {
    const onStatusFilterChange = vi.fn();

    render(
      <MigrationPreviewTable
        filteredRows={sampleRows}
        totalRowCount={2}
        invalidRowCount={1}
        validRowCount={1}
        statusFilter="all"
        onStatusFilterChange={onStatusFilterChange}
        isLoadingLookups={false}
      />,
    );

    expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument();
    expect(screen.getByText('1 with error')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Walk-in')).toBeInTheDocument();
    expect(screen.getByText('RFID not found in system.')).toBeInTheDocument();

    const failedTab = screen.getByRole('tab', { name: /^Failed/i });
    fireEvent.click(failedTab);
    expect(onStatusFilterChange).toHaveBeenCalledWith('failed');
  });

  it('triggers onToggleIgnoreFailed and onExportFailedRows when buttons are clicked', () => {
    const onToggleIgnoreFailed = vi.fn();
    const onExportFailedRows = vi.fn();

    render(
      <MigrationPreviewTable
        filteredRows={sampleRows}
        totalRowCount={2}
        invalidRowCount={1}
        validRowCount={1}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        isLoadingLookups={false}
        isIgnoringFailed={false}
        onToggleIgnoreFailed={onToggleIgnoreFailed}
        onExportFailedRows={onExportFailedRows}
      />,
    );

    const exportBtn = screen.getByRole('button', { name: /Export Failed Records/i });
    fireEvent.click(exportBtn);
    expect(onExportFailedRows).toHaveBeenCalledTimes(1);

    const ignoreBtn = screen.getByRole('button', { name: /Ignore Failed Records/i });
    fireEvent.click(ignoreBtn);
    expect(onToggleIgnoreFailed).toHaveBeenCalledWith(true);
  });

  it('renders ignored status banner and ignored badge when isIgnoringFailed is true', () => {
    const onToggleIgnoreFailed = vi.fn();

    render(
      <MigrationPreviewTable
        filteredRows={sampleRows}
        totalRowCount={2}
        invalidRowCount={1}
        validRowCount={1}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        isLoadingLookups={false}
        isIgnoringFailed={true}
        onToggleIgnoreFailed={onToggleIgnoreFailed}
      />,
    );

    expect(screen.getByText(/1 failed record ignored\./i)).toBeInTheDocument();
    expect(screen.getByText(/Only 1 valid record will be migrated\./i)).toBeInTheDocument();
    expect(screen.getByText('Ignored')).toBeInTheDocument();

    const dontIgnoreBtn = screen.getByRole('button', { name: /Don't Ignore/i });
    fireEvent.click(dontIgnoreBtn);
    expect(onToggleIgnoreFailed).toHaveBeenCalledWith(false);
  });

  it('renders actions column and triggers onEditRow when Match Member button is clicked', () => {
    const onEditRow = vi.fn();

    render(
      <MigrationPreviewTable
        filteredRows={sampleRows}
        totalRowCount={2}
        invalidRowCount={1}
        validRowCount={1}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        isLoadingLookups={false}
        onEditRow={onEditRow}
      />,
    );

    expect(screen.getByText('Actions')).toBeInTheDocument();
    const matchBtns = screen.getAllByRole('button', { name: /Match Member|Edit Match/i });
    expect(matchBtns.length).toBe(2);

    fireEvent.click(matchBtns[1]);
    expect(onEditRow).toHaveBeenCalledWith(sampleRows[1]);
  });
});

describe('MatchMemberModal', () => {
  const sampleRow: EnrichedServiceAttendanceRow = {
    row_number: 2,
    originalData: { Name: 'Bobby', RFID: '9999' },
    isValid: false,
    errors: ['RFID not found in system.'],
    rfid: '9999',
    service_date: '2026-03-15',
    time_slot: '9AM',
    checked_in_at: '09:10:00',
    is_manual_entry: false,
    is_override: false,
    is_walk_in: false,
    table_number: '12',
    metadata: {},
  };

  const matchingRow: EnrichedServiceAttendanceRow = {
    row_number: 5,
    originalData: { Name: 'bobby', RFID: '9999' },
    isValid: false,
    errors: ['RFID not found in system.'],
    rfid: '9999',
    service_date: '2026-03-22',
    time_slot: '9AM',
    checked_in_at: '09:12:00',
    is_manual_entry: false,
    is_override: false,
    is_walk_in: false,
    table_number: '12',
    metadata: {},
  };

  it('renders modal with row metadata, allows selecting a member, and triggers onAssignMember', () => {
    const onAssignMember = vi.fn();
    const onClose = vi.fn();

    render(
      <MatchMemberModal
        isOpen={true}
        row={sampleRow}
        onClose={onClose}
        onAssignMember={onAssignMember}
      />,
    );

    expect(screen.getByText('Match Member for Row #2')).toBeInTheDocument();
    expect(screen.getByText('Bobby')).toBeInTheDocument();
    expect(screen.getByText('RFID not found in system.')).toBeInTheDocument();

    const searchInput = screen.getByRole('textbox', { name: /Search/i });
    expect(searchInput).toHaveValue('Bobby');

    // Type to search
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    expect(searchInput).toHaveValue('Alice');
  });

  it('detects matching failed rows and displays bulk matching checkbox', () => {
    const onAssignMember = vi.fn();
    const onClose = vi.fn();

    render(
      <MatchMemberModal
        isOpen={true}
        row={sampleRow}
        allRows={[sampleRow, matchingRow]}
        onClose={onClose}
        onAssignMember={onAssignMember}
      />,
    );

    // Select Alice
    const aliceBtn = screen.getByRole('button', { name: /Alice Smith/i });
    fireEvent.click(aliceBtn);

    // Verify bulk match checkbox is shown
    expect(
      screen.getByText(/Apply match to all 1 other matching failed record/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Assign to 2 Records/i)).toBeInTheDocument();

    // Confirm assign
    const assignBtn = screen.getByRole('button', { name: /Assign to 2 Records/i });
    fireEvent.click(assignBtn);

    expect(onAssignMember).toHaveBeenCalledWith(
      2,
      {
        userId: 'user-alice',
        memberName: 'Alice Smith',
        rfid: 'RFID-001',
      },
      {
        applyToMatchingFailed: true,
        matchingRowNumbers: [2, 5],
      },
    );
  });
});

describe('MigrationConfirmDialog', () => {
  it('renders dialog and triggers callbacks', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <MigrationConfirmDialog
        isOpen={true}
        onCancel={onCancel}
        onConfirm={onConfirm}
        isPending={false}
        previewRowCount={25}
      />,
    );

    expect(screen.getByText(/This will upsert 25 attendance records/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Migration' });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders skipped note when ignoredRowCount is greater than 0', () => {
    render(
      <MigrationConfirmDialog
        isOpen={true}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        isPending={false}
        previewRowCount={10}
        ignoredRowCount={3}
      />,
    );

    expect(screen.getByText(/This will upsert 10 attendance records/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Note: 3 failed records will be ignored and skipped\./i),
    ).toBeInTheDocument();
  });
});

describe('MigrationConfigDialog', () => {
  it('renders default 3 sheets and allows editing, toggling walkin, removing, and adding sheets', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<MigrationConfigDialog isOpen={true} onClose={onClose} onConfirm={onConfirm} />);

    expect(screen.getByText('Configure Migration')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Comm_Attend')).toBeInTheDocument();
    expect(screen.getByDisplayValue('OIC_Attend')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Walkin_Attend')).toBeInTheDocument();

    // Check that Walk-in checkbox for Walkin_Attend is checked
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(3);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).toBeChecked();

    // Set target date
    const dateInput = screen.getByLabelText(/Target Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-03-15' } });

    // Add a new sheet
    const addSheetBtn = screen.getByRole('button', { name: /Add Sheet/i });
    fireEvent.click(addSheetBtn);

    const sheet4Input = screen.getByPlaceholderText('Sheet name 4');
    fireEvent.change(sheet4Input, { target: { value: 'Extra_Attend' } });

    // Remove OIC_Attend (second remove button)
    const removeBtns = screen.getAllByRole('button', { name: /Remove sheet/i });
    fireEvent.click(removeBtns[1]);

    expect(screen.queryByDisplayValue('OIC_Attend')).not.toBeInTheDocument();

    // Submit
    const continueBtn = screen.getByRole('button', { name: 'Select File' });
    fireEvent.click(continueBtn);

    expect(onConfirm).toHaveBeenCalledWith({
      targetDate: '2026-03-15',
      sheets: [
        { name: 'Comm_Attend', isWalkIn: false },
        { name: 'Walkin_Attend', isWalkIn: true },
        { name: 'Extra_Attend', isWalkIn: false },
      ],
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('validates that target date must be a Sunday and displays an error message', () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();

    render(<MigrationConfigDialog isOpen={true} onClose={onClose} onConfirm={onConfirm} />);

    const continueBtn = screen.getByRole('button', { name: 'Select File' });
    expect(continueBtn).toBeDisabled();

    // Select a Monday (2026-03-16)
    const dateInput = screen.getByLabelText(/Target Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-03-16' } });

    expect(screen.getByText('Target date must be a Sunday.')).toBeInTheDocument();
    expect(continueBtn).toBeDisabled();

    // Change to Sunday (2026-03-15)
    fireEvent.change(dateInput, { target: { value: '2026-03-15' } });
    expect(screen.queryByText('Target date must be a Sunday.')).not.toBeInTheDocument();
    expect(continueBtn).toBeEnabled();
  });
});
