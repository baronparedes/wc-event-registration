import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminMembersImportPage } from '@/pages/admin/members/import';

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

describe('AdminMembersImportPage', () => {
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

    // Preview table summary
    expect(screen.getByText((_, el) => el?.textContent === 'Total: 2')).toBeInTheDocument();
    expect(screen.getByText('Insert: 1')).toBeInTheDocument();
    expect(screen.getByText('Update: 1')).toBeInTheDocument();

    // Verify row summaries
    expect(screen.getByText(/Updating 2 field\(s\): Role, Email/)).toBeInTheDocument();
    expect(screen.getByText(/New member \(Usher, Youth\)/)).toBeInTheDocument();

    // Expand Row 2 (the update row)
    const expandButtons = screen.getAllByRole('button', { name: /expand details for row/i });
    fireEvent.click(expandButtons[0]);

    // Check that diff details appear
    expect(screen.getByText('Pending Field Changes for Existing Member')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    expect(screen.getByText('john.old@example.com')).toBeInTheDocument();
    expect(screen.getByText('john.new@example.com')).toBeInTheDocument();

    // Toggle all details
    fireEvent.click(screen.getByRole('button', { name: /expand all details/i }));
    expect(screen.getByText('New Member Attributes to be Inserted')).toBeInTheDocument();
    expect(screen.getAllByText('RFID-002').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();

    // Commit import
    const commitBtn = screen.getByRole('button', { name: 'Commit Import' });
    expect(commitBtn).toBeEnabled();
    fireEvent.click(commitBtn);

    // Confirm dialog appears
    expect(screen.getByText(/You are about to commit/)).toBeInTheDocument();
    expect(screen.getByText(/new member\(s\) will be inserted/)).toBeInTheDocument();
    expect(screen.getByText(/existing member\(s\) will be updated/)).toBeInTheDocument();

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
