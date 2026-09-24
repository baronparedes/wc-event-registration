import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  type EnrichedServiceAttendanceRow,
  MigrationConfirmDialog,
  MigrationPreviewTable,
  MigrationUploadControls,
} from '../index';

describe('MigrationUploadControls', () => {
  it('renders layout selection and file upload input', () => {
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
    expect(screen.getByText('2. Upload CSV File')).toBeInTheDocument();

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toBeDisabled();
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

    expect(screen.getByText('Parsing and validating CSV file...')).toBeInTheDocument();
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
});
