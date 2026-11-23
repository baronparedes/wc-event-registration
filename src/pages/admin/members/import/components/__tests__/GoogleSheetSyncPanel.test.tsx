import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useGoogleSheetMembersPreviewQuery,
  useSyncMembersFromSheetMutation,
} from '@/hooks/domain/members';

import { GoogleSheetSyncPanel } from '../GoogleSheetSyncPanel';

vi.mock('@/hooks/domain/members', () => ({
  useGoogleSheetMembersPreviewQuery: vi.fn(),
  useSyncMembersFromSheetMutation: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('GoogleSheetSyncPanel', () => {
  const mockRefetch = vi.fn();
  const mockMutateAsync = vi.fn();
  const mockResetSync = vi.fn();

  function setupMocks(
    previewOverrides: Partial<ReturnType<typeof useGoogleSheetMembersPreviewQuery>> = {},
    syncOverrides: Partial<ReturnType<typeof useSyncMembersFromSheetMutation>> = {},
  ) {
    vi.mocked(useGoogleSheetMembersPreviewQuery).mockReturnValue({
      data: undefined,
      isFetching: false,
      isError: false,
      error: null,
      progress: null,
      refetch: mockRefetch,
      ...previewOverrides,
    } as unknown as ReturnType<typeof useGoogleSheetMembersPreviewQuery>);

    vi.mocked(useSyncMembersFromSheetMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      resetSync: mockResetSync,
      isPending: false,
      data: undefined,
      error: null,
      progress: null,
      ...syncOverrides,
    } as unknown as ReturnType<typeof useSyncMembersFromSheetMutation>);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders live streamed progress while loading dry-run preview', () => {
    setupMocks({
      isFetching: true,
      progress: {
        stage: 'parsing_rows',
        message: 'Parsing and validating sheet rows...',
        percent: 40,
      },
    });

    render(
      <MemoryRouter>
        <GoogleSheetSyncPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading Google Sheet sync preview')).toBeInTheDocument();
    expect(screen.getByText('Parsing and validating sheet rows...')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders filterable diff preview, expands row field changes, and confirms sync', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      inserted_count: 1,
      updated_count: 1,
      skipped_count: 1,
      total_sheet_rows: 4,
      errors: ['Row 5: RFID/Member ID is required.'],
      skipped_rows: [{ row_number: 5, member_id: '', reasons: ['RFID/Member ID is required.'] }],
      timestamp: '2026-11-23T05:00:00.000Z',
    });

    setupMocks({
      data: {
        dry_run: true,
        total_sheet_rows: 4,
        skipped_count: 1,
        summary: {
          total_rows: 4,
          insert_count: 1,
          update_count: 1,
          update_member_id_count: 0,
          unchanged_count: 1,
          error_count: 1,
        },
        preview_rows: [
          {
            row_number: 2,
            member_id: 'RFID-001',
            first_name: 'Test Juan',
            last_name: 'Test Dela Cruz',
            nickname: 'Test Johnny',
            role: 'Prayer Coach',
            category: 'Adults',
            operation: 'update',
            target_user_id: 'u-1',
            target_member_id: 'RFID-001',
            errors: [],
            field_changes: [
              { field: 'role', label: 'Role', old_value: 'Usher', new_value: 'Prayer Coach' },
            ],
            new_member_details: [],
          },
          {
            row_number: 3,
            member_id: 'RFID-002',
            first_name: 'Test Maria',
            last_name: 'Test Santos',
            nickname: 'Test Mia',
            role: 'Usher',
            category: 'Adults',
            operation: 'update',
            target_user_id: 'u-2',
            target_member_id: 'RFID-002',
            errors: [],
            field_changes: [],
            new_member_details: [],
          },
          {
            row_number: 4,
            member_id: 'RFID-003',
            first_name: 'Sample New',
            last_name: 'Sample Member',
            nickname: 'Sample Newbie',
            role: 'Usher',
            category: 'Youth',
            operation: 'insert',
            errors: [],
            field_changes: [],
            new_member_details: [{ field: 'role', label: 'Role', value: 'Usher' }],
          },
          {
            row_number: 5,
            member_id: '',
            first_name: '',
            last_name: '',
            nickname: '',
            role: '',
            category: '',
            operation: 'error',
            errors: ['RFID/Member ID is required.'],
            field_changes: [],
            new_member_details: [],
          },
        ],
        errors: ['Row 5: RFID/Member ID is required.'],
        skipped_rows: [{ row_number: 5, member_id: '', reasons: ['RFID/Member ID is required.'] }],
        timestamp: '2026-11-23T05:00:00.000Z',
      },
    });

    render(
      <MemoryRouter>
        <GoogleSheetSyncPanel />
      </MemoryRouter>,
    );

    // Default filter is Changes & Skipped — hides unchanged RFID-002
    expect(screen.getByText('RFID-001')).toBeInTheDocument();
    expect(screen.getByText('RFID-003')).toBeInTheDocument();
    expect(screen.queryByText('RFID-002')).not.toBeInTheDocument();

    // Expand row 2 to inspect field diff
    fireEvent.click(screen.getByRole('button', { name: /Expand details for row 2/i }));
    expect(screen.getByText('Pending Field Changes for Existing Member')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();

    // Switching to Unchanged reveals RFID-002
    fireEvent.click(screen.getByRole('button', { name: /Unchanged \(1\)/i }));
    expect(screen.getByText('RFID-002')).toBeInTheDocument();

    // Confirm & Sync opens confirm dialog and invokes mutation
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Sync/i }));
    expect(screen.getByText(/Confirm Google Sheet member sync/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Start Sync/i }));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('renders live sync progress and final completion results', () => {
    setupMocks(
      {},
      {
        isPending: true,
        progress: {
          stage: 'upserting_batches',
          message: 'Upserting members (batch 2 of 3)...',
          percent: 78,
          total_sheet_rows: 250,
          resolved_rows: 245,
          processed_rows: 100,
          total_batches: 3,
          current_batch: 2,
          inserted_count: 15,
          updated_count: 85,
          skipped_count: 5,
        },
      },
    );

    const { rerender } = render(
      <MemoryRouter>
        <GoogleSheetSyncPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText('Syncing members from Google Sheet')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText(/Batch 2 of 3 · 100 \/ 245 rows processed/)).toBeInTheDocument();

    setupMocks(
      {},
      {
        isPending: false,
        data: {
          inserted_count: 15,
          updated_count: 230,
          skipped_count: 1,
          total_sheet_rows: 246,
          errors: ['Row 9 (RFID-009): Email is invalid.'],
          skipped_rows: [{ row_number: 9, member_id: 'RFID-009', reasons: ['Email is invalid.'] }],
          timestamp: '2026-11-23T05:01:00.000Z',
        },
      },
    );

    rerender(
      <MemoryRouter>
        <GoogleSheetSyncPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText(/Sync completed with 1 skipped row/i)).toBeInTheDocument();
    expect(screen.getByText('Row 9')).toBeInTheDocument();
    expect(screen.getByText('Email is invalid.')).toBeInTheDocument();

    // Preview Again resets sync and refetches preview
    fireEvent.click(screen.getByRole('button', { name: /Preview Again/i }));
    expect(mockResetSync).toHaveBeenCalledTimes(1);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('handles preview error state with retry and back navigation', () => {
    setupMocks({
      isError: true,
      error: new Error('Missing Google Sheets credentials'),
    });

    render(
      <MemoryRouter>
        <GoogleSheetSyncPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText('Failed to load Google Sheet preview')).toBeInTheDocument();
    expect(screen.getByText('Missing Google Sheets credentials')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Retry Preview/i }));
    expect(mockResetSync).toHaveBeenCalledTimes(1);
    expect(mockRefetch).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Back to Members/i }));
  });

  it('handles empty sheet, all-unchanged filter, expand/collapse all, and sync errors', async () => {
    // 1. Empty sheet
    setupMocks({
      data: {
        dry_run: true,
        total_sheet_rows: 0,
        skipped_count: 0,
        summary: {
          total_rows: 0,
          insert_count: 0,
          update_count: 0,
          update_member_id_count: 0,
          unchanged_count: 0,
          error_count: 0,
        },
        preview_rows: [],
        errors: [],
        skipped_rows: [],
        timestamp: '2026-11-23T05:00:00.000Z',
      },
    });

    const { rerender } = render(
      <MemoryRouter>
        <GoogleSheetSyncPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText('No data rows found in Google Sheet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Confirm & Sync/i })).toBeDisabled();

    // 2. All unchanged rows + sync error banner
    mockMutateAsync.mockRejectedValueOnce(new Error('Network timeout'));
    setupMocks(
      {
        data: {
          dry_run: true,
          total_sheet_rows: 1,
          skipped_count: 0,
          summary: {
            total_rows: 1,
            insert_count: 0,
            update_count: 0,
            update_member_id_count: 0,
            unchanged_count: 1,
            error_count: 0,
          },
          preview_rows: [
            {
              row_number: 2,
              member_id: 'RFID-002',
              first_name: 'Test Maria',
              last_name: 'Test Santos',
              nickname: 'Test Mia',
              role: 'Usher',
              category: 'Adults',
              operation: 'update',
              target_user_id: 'u-2',
              target_member_id: 'RFID-002',
              errors: [],
              field_changes: [],
              new_member_details: [],
            },
          ],
          errors: [],
          skipped_rows: [],
          timestamp: '2026-11-23T05:00:00.000Z',
        },
      },
      {
        error: new Error('Network timeout'),
      },
    );

    rerender(
      <MemoryRouter>
        <GoogleSheetSyncPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText('Google Sheet sync failed')).toBeInTheDocument();
    expect(screen.getByText('Network timeout')).toBeInTheDocument();
    expect(screen.getByText(/no field changes detected/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show All Rows/i }));
    expect(screen.getByText('RFID-002')).toBeInTheDocument();

    // Expand all and collapse all
    fireEvent.click(screen.getByRole('button', { name: /Expand All Details/i }));
    fireEvent.click(screen.getByRole('button', { name: /Collapse All Details/i }));

    // Test filter buttons: Insert, Update, Skipped
    fireEvent.click(screen.getByRole('button', { name: /Insert \(0\)/i }));
    expect(screen.getByText('No rows match the selected filter.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^Update \(0\)$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Skipped \(0\)$/i }));

    // Trigger confirm & sync rejection path
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Sync/i }));
    fireEvent.click(screen.getByRole('button', { name: /Start Sync/i }));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('renders clean success banner when sync completes with zero skipped rows', () => {
    setupMocks(
      {},
      {
        data: {
          inserted_count: 5,
          updated_count: 10,
          skipped_count: 0,
          total_sheet_rows: 15,
          errors: [],
          skipped_rows: [],
          timestamp: '2026-11-23T05:01:00.000Z',
        },
      },
    );

    render(
      <MemoryRouter>
        <GoogleSheetSyncPanel />
      </MemoryRouter>,
    );

    expect(screen.getByText('Google Sheet sync completed successfully')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Members/i }));
  });
});
