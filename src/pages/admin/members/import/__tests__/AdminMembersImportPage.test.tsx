import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberCsvPreviewRow } from '@/lib/domain/members';
import { AdminMembersImportPage } from '@/pages/admin/members/import';
import {
  extractBulkImportErrors,
  getOperationBadgeClass,
  getOperationLabel,
  getRowSummaryNote,
} from '@/pages/admin/members/import/utils';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const { mockUseAdminMembersImportSnapshotQuery, mockUseBulkUpsertMembersMutation } = vi.hoisted(
  () => ({
    mockUseAdminMembersImportSnapshotQuery: vi.fn(),
    mockUseBulkUpsertMembersMutation: vi.fn(),
  }),
);

vi.mock('@/hooks/domain/members', async () => {
  const actual =
    await vi.importActual<typeof import('@/hooks/domain/members')>('@/hooks/domain/members');
  return {
    ...actual,
    useAdminMembersImportSnapshotQuery: () => mockUseAdminMembersImportSnapshotQuery(),
    useBulkUpsertMembersMutation: () => mockUseBulkUpsertMembersMutation(),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AdminMembersImportPage Helpers', () => {
  describe('getOperationBadgeClass', () => {
    it('returns appropriate class names for all operations', () => {
      expect(getOperationBadgeClass('insert')).toContain('text-secondary');
      expect(getOperationBadgeClass('update')).toContain('text-primary');
      expect(getOperationBadgeClass('update_member_id')).toContain('text-amber-700');
      expect(getOperationBadgeClass('error')).toContain('text-danger');
      expect(getOperationBadgeClass('unknown' as 'insert')).toContain('text-muted');
    });
  });

  describe('getOperationLabel', () => {
    it('returns human-readable labels for all operations', () => {
      expect(getOperationLabel('insert')).toBe('Insert');
      expect(getOperationLabel('update')).toBe('Update');
      expect(getOperationLabel('update_member_id')).toBe('Update Member ID');
      expect(getOperationLabel('error')).toBe('Error');
      expect(getOperationLabel('custom' as 'insert')).toBe('custom');
    });
  });

  describe('getRowSummaryNote', () => {
    it('returns validation errors if present', () => {
      const row: MemberCsvPreviewRow = {
        row_number: 1,
        member_id: 'RFID-1',
        first_name: 'Test First',
        last_name: 'Test Last',
        nickname: 'Test Nick',
        role: 'Member',
        category: 'Adults',
        operation: 'error',
        errors: ['Error 1.', 'Error 2.'],
        field_changes: [],
        new_member_details: [],
      };
      expect(getRowSummaryNote(row)).toBe('Error 1. Error 2.');
    });

    it('returns insert note', () => {
      const row: MemberCsvPreviewRow = {
        row_number: 1,
        member_id: 'RFID-1',
        first_name: 'Test First',
        last_name: 'Test Last',
        nickname: 'Test Nick',
        role: 'Prayer Coach',
        category: 'Youth',
        operation: 'insert',
        errors: [],
        field_changes: [],
        new_member_details: [],
      };
      expect(getRowSummaryNote(row)).toBe('New member (Prayer Coach, Youth)');
    });

    it('returns RFID reassignment note with and without other field changes', () => {
      const rowWithoutOther: MemberCsvPreviewRow = {
        row_number: 1,
        member_id: 'RFID-NEW',
        target_member_id: 'RFID-OLD',
        first_name: 'Test First',
        last_name: 'Test Last',
        nickname: 'Test Nick',
        role: 'Member',
        category: 'Adults',
        operation: 'update_member_id',
        errors: [],
        field_changes: [
          { field: 'member_id', label: 'RFID', old_value: 'RFID-OLD', new_value: 'RFID-NEW' },
        ],
        new_member_details: [],
      };
      expect(getRowSummaryNote(rowWithoutOther)).toBe('RFID change: RFID-OLD → RFID-NEW');

      const rowWithOther: MemberCsvPreviewRow = {
        ...rowWithoutOther,
        field_changes: [
          { field: 'member_id', label: 'RFID', old_value: 'RFID-OLD', new_value: 'RFID-NEW' },
          { field: 'phone', label: 'Phone', old_value: '111', new_value: '222' },
          {
            field: 'email',
            label: 'Email',
            old_value: 'a@example.com',
            new_value: 'b@example.com',
          },
        ],
      };
      expect(getRowSummaryNote(rowWithOther)).toBe(
        'RFID change: RFID-OLD → RFID-NEW (+2 other field changes)',
      );
    });

    it('returns update note with 0 changes, <=2 changes, and >2 changes', () => {
      const row0: MemberCsvPreviewRow = {
        row_number: 1,
        member_id: 'RFID-1',
        first_name: 'Test First',
        last_name: 'Test Last',
        nickname: 'Test Nick',
        role: 'Member',
        category: 'Adults',
        operation: 'update',
        errors: [],
        field_changes: [],
        new_member_details: [],
      };
      expect(getRowSummaryNote(row0)).toBe('No field changes (already up to date).');

      const row2: MemberCsvPreviewRow = {
        ...row0,
        field_changes: [
          { field: 'email', label: 'Email', old_value: null, new_value: 'a@example.com' },
          { field: 'phone', label: 'Phone', old_value: null, new_value: '0911' },
        ],
      };
      expect(getRowSummaryNote(row2)).toBe('Updating 2 field(s): Email, Phone');

      const row3: MemberCsvPreviewRow = {
        ...row0,
        field_changes: [
          { field: 'email', label: 'Email', old_value: null, new_value: 'a@example.com' },
          { field: 'phone', label: 'Phone', old_value: null, new_value: '0911' },
          { field: 'role', label: 'Role', old_value: 'Member', new_value: 'OIC' },
        ],
      };
      expect(getRowSummaryNote(row3)).toBe('Updating 3 field(s): Email, Phone +1 more');
    });

    it('returns empty string for unrecognized operation', () => {
      const row = {
        operation: 'other',
        errors: [],
      } as unknown as MemberCsvPreviewRow;
      expect(getRowSummaryNote(row)).toBe('');
    });
  });

  describe('extractBulkImportErrors', () => {
    it('handles non-Error objects', () => {
      expect(extractBulkImportErrors('random string')).toEqual(['Import failed.']);
      expect(extractBulkImportErrors(null)).toEqual(['Import failed.']);
    });

    it('extracts parsed.details array', () => {
      const err = new Error(JSON.stringify({ details: ['Detail A', 'Detail B', 123] }));
      expect(extractBulkImportErrors(err)).toEqual(['Detail A', 'Detail B']);
    });

    it('extracts parsed.detail string with semicolons', () => {
      const err = new Error(JSON.stringify({ detail: 'First issue;  Second issue' }));
      expect(extractBulkImportErrors(err)).toEqual(['First issue', 'Second issue']);
    });

    it('extracts parsed.error string', () => {
      const err = new Error(JSON.stringify({ error: 'Single error message' }));
      expect(extractBulkImportErrors(err)).toEqual(['Single error message']);
    });

    it('falls back to raw error message if not json', () => {
      const err = new Error('Database network timeout');
      expect(extractBulkImportErrors(err)).toEqual(['Database network timeout']);
    });

    it('falls back to Import failed if error message is empty', () => {
      const err = new Error('');
      expect(extractBulkImportErrors(err)).toEqual(['Import failed.']);
    });
  });
});

describe('AdminMembersImportPage Component', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBulkUpsertMembersMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it('renders loading state when snapshot query is loading', () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: true,
      isError: false,
      isSuccess: false,
      data: undefined,
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Loading member snapshot...')).toBeInTheDocument();
  });

  it('renders error banner when snapshot query fails', () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: true,
      isSuccess: false,
      data: undefined,
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Failed to load members for preview.')).toBeInTheDocument();
  });

  it('renders CSV format guide card and toggles open/close', () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: [],
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('CSV Format Guide & Guidelines')).toBeInTheDocument();
    expect(screen.getByText('Show Guide')).toBeInTheDocument();

    // Open guide
    fireEvent.click(screen.getByText('CSV Format Guide & Guidelines'));
    expect(screen.getByText('Hide Guide')).toBeInTheDocument();
    expect(screen.getByText('Mandatory Columns (Required on every row)')).toBeInTheDocument();
    expect(screen.getByText('Copy Template')).toBeInTheDocument();

    // Close guide
    fireEvent.click(screen.getByText('CSV Format Guide & Guidelines'));
    expect(screen.getByText('Show Guide')).toBeInTheDocument();
  });

  it('navigates back to admin members when Cancel button is clicked', () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: [],
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/members');
  });

  it('resets state when file input is cleared', async () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: [],
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText(/csv file/i);
    const file = new File(
      [
        'member_id,first_name,last_name,nickname,role,category\nRFID-001,Test A,Test B,Test C,Member,Adults',
      ],
      'test.csv',
      { type: 'text/csv' },
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(await screen.findByText(/Loaded file: test\.csv/)).toBeInTheDocument();

    // Clear file
    await act(async () => {
      fireEvent.change(input, { target: { files: [] } });
    });

    expect(screen.queryByText(/Loaded file: test\.csv/)).not.toBeInTheDocument();
  });

  it('shows error if members snapshot is not ready during file upload', async () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: undefined,
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    const input = screen.getByLabelText(/csv file/i);
    const file = new File(
      [
        'member_id,first_name,last_name,nickname,role,category\nRFID-001,Test A,Test B,Test C,Member,Adults',
      ],
      'test.csv',
      { type: 'text/csv' },
    );

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(
      await screen.findByText('Member snapshot is still loading. Please try again in a moment.'),
    ).toBeInTheDocument();
  });

  it('parses CSV, classifies insert and update, expands row diffs, and commits import', async () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: [
        {
          id: 'user-1',
          member_id: 'RFID-001',
          first_name: 'Test John',
          last_name: 'Test Doe',
          nickname: 'Test JD',
          email: 'john.old@example.com',
          phone: '111',
          date_of_birth: '1990-01-01',
          role: 'Member',
          category: 'Adults',
          metadata: { is_oic: false },
          is_active: true,
        },
      ],
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    const csvContent = [
      'member_id,first_name,last_name,nickname,role,category,email,phone',
      'RFID-001,Test John,Test Doe,Test JD,Prayer Coach,Adults,john.new@example.com,111',
      'RFID-002,Test Jane,Test Smith,Test Janey,Usher,Youth,jane@example.com,222',
    ].join('\n');

    const file = new File([csvContent], 'members.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/csv file/i);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await screen.findByText(/Loaded file: members\.csv/);

    expect(screen.getByText((_, el) => el?.textContent === 'Total: 2')).toBeInTheDocument();
    expect(screen.getByText('Insert: 1')).toBeInTheDocument();
    expect(screen.getByText('Update: 1')).toBeInTheDocument();

    expect(screen.getByText(/Updating 2 field\(s\): Role, Email/)).toBeInTheDocument();
    expect(screen.getByText(/New member \(Usher, Youth\)/)).toBeInTheDocument();

    // Expand Row 2 (the update row)
    const expandButtons = screen.getAllByRole('button', { name: /expand details for row/i });
    fireEvent.click(expandButtons[0]);

    expect(screen.getByText('Pending Field Changes for Existing Member')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    expect(screen.getByText('john.old@example.com')).toBeInTheDocument();
    expect(screen.getByText('john.new@example.com')).toBeInTheDocument();

    // Collapse Row 2 again
    fireEvent.click(expandButtons[0]);
    expect(screen.queryByText('Pending Field Changes for Existing Member')).not.toBeInTheDocument();

    // Toggle all details open
    const expandAllBtn = screen.getByRole('button', { name: /expand all details/i });
    fireEvent.click(expandAllBtn);
    expect(screen.getByText('New Member Attributes to be Inserted')).toBeInTheDocument();
    expect(screen.getAllByText('RFID-002').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();

    // Toggle all details closed
    expect(screen.getByRole('button', { name: /collapse all details/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /collapse all details/i }));
    expect(screen.queryByText('New Member Attributes to be Inserted')).not.toBeInTheDocument();

    // Commit import
    const commitBtn = screen.getByRole('button', { name: 'Commit Import' });
    expect(commitBtn).toBeEnabled();
    fireEvent.click(commitBtn);

    expect(screen.getByText(/You are about to commit/)).toBeInTheDocument();
    expect(screen.getByText(/new member\(s\) will be inserted/)).toBeInTheDocument();
    expect(screen.getByText(/existing member\(s\) will be updated/)).toBeInTheDocument();

    // Test cancel button in confirmation dialog
    const dialogCancelBtn = screen.getAllByRole('button', { name: 'Cancel' })[1];
    fireEvent.click(dialogCancelBtn);
    expect(screen.queryByText(/You are about to commit/)).not.toBeInTheDocument();

    // Reopen dialog and commit
    fireEvent.click(commitBtn);
    mockMutateAsync.mockResolvedValueOnce({
      success: true,
      inserted_count: 1,
      updated_count: 1,
    });

    const dialogConfirmBtn = screen.getAllByRole('button', { name: 'Commit Import' })[1];
    await act(async () => {
      fireEvent.click(dialogConfirmBtn);
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        rows: expect.arrayContaining([
          expect.objectContaining({ member_id: 'RFID-001' }),
          expect.objectContaining({ member_id: 'RFID-002' }),
        ]),
      });
      expect(mockNavigate).toHaveBeenCalledWith('/admin/members');
    });
  });

  it('handles update_member_id (RFID reassignment), no changes, and >2 field changes', async () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: [
        {
          id: 'user-reassign',
          member_id: 'RFID-OLD-TAG',
          first_name: 'Test Alice',
          last_name: 'Test Wonderland',
          nickname: 'Test Ally',
          email: 'alice@example.com',
          phone: '0911',
          date_of_birth: '1992-02-02',
          role: 'Member',
          category: 'Adults',
          metadata: {},
          is_active: true,
        },
        {
          id: 'user-same',
          member_id: 'RFID-SAME',
          first_name: 'Test Bob',
          last_name: 'Test Builder',
          nickname: 'Test Bobby',
          email: 'bob@example.com',
          phone: '0922',
          date_of_birth: '1993-03-03',
          role: 'Member',
          category: 'Adults',
          metadata: {},
          is_active: true,
        },
        {
          id: 'user-multi-diff',
          member_id: 'RFID-MULTI',
          first_name: 'Test Charlie',
          last_name: 'Test Chocolate',
          nickname: 'Test Chuck',
          email: 'old.char@example.com',
          phone: '0933',
          date_of_birth: '1994-04-04',
          role: 'Member',
          category: 'Adults',
          metadata: {},
          is_active: true,
        },
      ],
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    const csvContent = [
      'member_id,first_name,last_name,nickname,role,category,email,phone,date_of_birth',
      'RFID-NEW-TAG,Test Alice,Test Wonderland,Test Ally,Prayer Coach,Adults,alice@example.com,0911,1992-02-02',
      'RFID-SAME,Test Bob,Test Builder,Test Bobby,Member,Adults,bob@example.com,0922,1993-03-03',
      'RFID-MULTI,Test Charlie,Test Chocolate,Test Chuck,OIC,Youth,new.char@example.com,0999,1995-05-05',
    ].join('\n');

    const file = new File([csvContent], 'complex.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/csv file/i);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await screen.findByText(/Loaded file: complex\.csv/);

    expect(screen.getByText(/RFID change: RFID-OLD-TAG → RFID-NEW-TAG/)).toBeInTheDocument();
    expect(screen.getByText('No field changes (already up to date).')).toBeInTheDocument();
    expect(screen.getByText(/\+\d+ more/)).toBeInTheDocument();

    const expandButtons = screen.getAllByRole('button', { name: /expand details for row/i });
    fireEvent.click(expandButtons[0]);
    expect(screen.getByText('RFID Reassignment & Pending Field Changes')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Commit Import' }));
    expect(screen.getByText(/member ID\(s\) will be reassigned/)).toBeInTheDocument();
  });

  it('displays error banner when backend commit returns success false', async () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: [],
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    const csvContent = [
      'member_id,first_name,last_name,nickname,role,category',
      'RFID-001,Test John,Test Doe,Test JD,Member,Adults',
    ].join('\n');

    const file = new File([csvContent], 'fail.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/csv file/i);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await screen.findByText(/Loaded file: fail\.csv/);

    mockMutateAsync.mockResolvedValueOnce({
      success: false,
      error: 'Database constraint violation',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Commit Import' }));
    const dialogConfirmBtn = screen.getAllByRole('button', { name: 'Commit Import' })[1];
    await act(async () => {
      fireEvent.click(dialogConfirmBtn);
    });

    expect(await screen.findByText('Database constraint violation')).toBeInTheDocument();
  });

  it('displays import validation error when duplicate member IDs are uploaded', async () => {
    mockUseAdminMembersImportSnapshotQuery.mockReturnValue({
      isLoading: false,
      isError: false,
      isSuccess: true,
      data: [],
    });

    render(
      <MemoryRouter>
        <AdminMembersImportPage />
      </MemoryRouter>,
    );

    const csvContent = [
      'member_id,first_name,last_name,nickname,role,category',
      'RFID-001,Test John,Test Doe,Test JD,Member,Adults',
      'RFID-001,Test Jane,Test Smith,Test Janey,Member,Adults',
    ].join('\n');

    const file = new File([csvContent], 'duplicate.csv', { type: 'text/csv' });
    const input = screen.getByLabelText(/csv file/i);

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(await screen.findByText('Import validation failed')).toBeInTheDocument();
    expect(
      screen.getByText('Row 2: Member ID appears multiple times in this CSV batch.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Commit Import' })).toBeDisabled();
  });
});
