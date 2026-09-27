import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceAttendanceMigrationPanel } from '../ServiceAttendanceMigrationPanel';

const mockMutateAsync = vi.fn();
const mockUseServiceLayoutsQuery = vi.fn();
const mockUseServiceSeatsQuery = vi.fn();
const mockUseLookupUsersByRfidsQuery = vi.fn();
const mockUseLookupUsersByNamesQuery = vi.fn();
const mockUseAdminMembersQuery = vi.fn();

vi.mock('@/hooks/domain/services', () => ({
  useServiceLayoutsQuery: () => mockUseServiceLayoutsQuery(),
  useServiceSeatsQuery: (layoutId: string) => mockUseServiceSeatsQuery(layoutId),
  useLookupUsersByRfidsQuery: (rfids: string[]) => mockUseLookupUsersByRfidsQuery(rfids),
  useLookupUsersByNamesQuery: (names: string[]) => mockUseLookupUsersByNamesQuery(names),
  useBulkUpsertServiceAttendanceMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/domain/members', () => ({
  useAdminMembersQuery: () => mockUseAdminMembersQuery(),
  useMemberAvatarQuery: () => ({ data: null, isLoading: false }),
}));

describe('ServiceAttendanceMigrationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminMembersQuery.mockReturnValue({
      data: {
        pages: [
          {
            items: [
              {
                id: 'user-sarah',
                member_id: '8888',
                full_name: 'Sarah Connor',
                first_name: 'Sarah',
                last_name: 'Connor',
                nickname: 'Sarah',
              },
            ],
          },
        ],
      },
      isLoading: false,
    });
    mockUseServiceLayoutsQuery.mockReturnValue({
      data: [{ id: 'layout-1', description: 'Base Layout' }],
      isLoading: false,
    });
    mockUseServiceSeatsQuery.mockReturnValue({
      data: [
        { id: 'seat-10', table_number: '10' },
        { id: 'seat-usher', table_number: 'Usher / Backroom / IMT / VMT' },
        { id: 'seat-unassigned', table_number: 'Unassigned' },
      ],
      isLoading: false,
    });
    mockUseLookupUsersByRfidsQuery.mockReturnValue({
      data: [],
      isLoading: false,
    });
    mockUseLookupUsersByNamesQuery.mockReturnValue({
      data: [
        {
          id: 'user-marrion',
          member_id: '1322281947',
          full_name: 'Marrion Torres',
          first_name: 'Marrion',
          last_name: 'Torres',
          nickname: 'Bong',
        },
      ],
      isLoading: false,
    });
  });

  it('matches members by nickname + last_name, maps tables > 100 to Usher / Backroom / IMT / VMT, and filters status', async () => {
    render(<ServiceAttendanceMigrationPanel />);

    // 1. Select layout
    const trigger = screen.getByRole('button', { name: /Select a layout.../i });
    fireEvent.click(trigger);
    const option = screen.getByRole('option', { name: 'Base Layout' });
    fireEvent.click(option);

    // 2. Upload CSV content
    const csvContent = [
      'RFID,Date,Time,Time_Slot,Table,Name,Role',
      ',3/9/2026,09:00:00,9AM,105,Bong Torres,Usher',
      ',3/9/2026,09:00:00,9AM,999,Unknown Person,Attendee',
    ].join('\n');

    const file = new File([csvContent], 'attendance.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const selectFileBtn = screen.getByRole('button', { name: /Select File.../i });
    fireEvent.click(selectFileBtn);
    // Now modal is open. We don't really care about testing modal inputs here, just need to submit it to trigger the hidden file input.
    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    // Actually we need to set the date first since continue is disabled
    const dateInput = screen.getByLabelText(/Target Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-03-09' } });
    fireEvent.click(continueBtn);
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 3. Verify preview rows
    await waitFor(() => {
      expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument();
    });

    // Bong Torres should resolve to Marrion Torres via nickname + last name matching
    expect(screen.getByText('Marrion Torres')).toBeInTheDocument();
    // Table 105 should map to Usher / Backroom / IMT / VMT
    const usherCells = screen.getAllByText('Usher / Backroom / IMT / VMT');
    expect(usherCells.length).toBeGreaterThan(0);

    // Row 2 is Unknown Person, which fails user matching
    expect(screen.getByText(/1 with error/i)).toBeInTheDocument();

    // 4. Test filtering
    const failedFilterBtn = screen.getByRole('tab', { name: /^Failed/i });
    fireEvent.click(failedFilterBtn);

    // Only Unknown Person should be visible in failed filter view
    expect(
      screen.getByText('Member "Unknown Person" (RFID: N/A) not found in system.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Marrion Torres')).not.toBeInTheDocument();

    // Switch to valid filter view
    const validFilterBtn = screen.getByRole('tab', { name: /Valid/i });
    fireEvent.click(validFilterBtn);

    expect(screen.getByText('Marrion Torres')).toBeInTheDocument();
    expect(screen.queryByText(/Unknown Person/)).not.toBeInTheDocument();
  });

  it('displays loading state indicator while looking up member details', async () => {
    mockUseLookupUsersByRfidsQuery.mockReturnValue({
      data: [],
      isLoading: true,
    });

    render(<ServiceAttendanceMigrationPanel />);

    // Upload with selected layout
    const trigger = screen.getByRole('button', { name: /Select a layout.../i });
    fireEvent.click(trigger);
    const option = screen.getByRole('option', { name: 'Base Layout' });
    fireEvent.click(option);

    const csvContent = [
      'RFID,Date,Time,Time_Slot,Table,Name',
      '1322281947,3/9/2026,09:00:00,9AM,10,Bong Torres',
    ].join('\n');
    const file = new File([csvContent], 'attendance.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const selectFileBtn = screen.getByRole('button', { name: /Select File.../i });
    fireEvent.click(selectFileBtn);
    // Now modal is open. We don't really care about testing modal inputs here, just need to submit it to trigger the hidden file input.
    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    // Actually we need to set the date first since continue is disabled
    const dateInput = screen.getByLabelText(/Target Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-03-09' } });
    fireEvent.click(continueBtn);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Looking up member details and seat assignments\.\.\./i),
      ).toBeInTheDocument();
    });
  });

  it('allows ignoring failed records to migrate valid records only', async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<ServiceAttendanceMigrationPanel />);

    // 1. Select layout
    const trigger = screen.getByRole('button', { name: /Select a layout.../i });
    fireEvent.click(trigger);
    const option = screen.getByRole('option', { name: 'Base Layout' });
    fireEvent.click(option);

    // 2. Upload CSV with 1 valid and 1 invalid row
    const csvContent = [
      'RFID,Date,Time,Time_Slot,Table,Name,Role',
      ',3/9/2026,09:00:00,9AM,105,Bong Torres,Usher',
      ',3/9/2026,09:00:00,9AM,999,Unknown Person,Attendee',
    ].join('\n');

    const file = new File([csvContent], 'attendance.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const selectFileBtn = screen.getByRole('button', { name: /Select File.../i });
    fireEvent.click(selectFileBtn);
    // Now modal is open. We don't really care about testing modal inputs here, just need to submit it to trigger the hidden file input.
    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    // Actually we need to set the date first since continue is disabled
    const dateInput = screen.getByLabelText(/Target Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-03-09' } });
    fireEvent.click(continueBtn);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument();
    });

    // Run Migration button should initially be disabled due to failed row
    const runBtn = screen.getByRole('button', { name: /Run Migration/i });
    expect(runBtn).toBeDisabled();

    // 3. Click "Ignore Failed Records"
    const ignoreBtn = screen.getByRole('button', { name: /Ignore Failed Records/i });
    fireEvent.click(ignoreBtn);

    // Button should change label and be enabled
    const migrateValidBtn = screen.getByRole('button', { name: /Migrate Valid Records \(1\)/i });
    expect(migrateValidBtn).toBeEnabled();

    // 4. Click Migrate Valid Records to open confirmation dialog
    fireEvent.click(migrateValidBtn);

    expect(screen.getByText(/This will upsert 1 attendance record\./i)).toBeInTheDocument();
    expect(
      screen.getByText(/Note: 1 failed record will be ignored and skipped\./i),
    ).toBeInTheDocument();

    // 5. Confirm migration
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Migration' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        layout_id: 'layout-1',
        rows: [
          expect.objectContaining({
            user_id: 'user-marrion',
            rfid: '1322281947',
            service_date: '2026-03-09',
            time_slot: '9AM',
            service_seat_id: 'seat-usher',
          }),
        ],
      });
    });
  });

  it('allows correcting names and IDs on the fly using Match Member modal', async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<ServiceAttendanceMigrationPanel />);

    // 1. Select layout
    const trigger = screen.getByRole('button', { name: /Select a layout.../i });
    fireEvent.click(trigger);
    const option = screen.getByRole('option', { name: 'Base Layout' });
    fireEvent.click(option);

    // 2. Upload CSV with 1 valid row (table 105 maps to seat-usher) and 1 invalid row (table 10 maps to seat-10)
    const csvContent = [
      'RFID,Date,Time,Time_Slot,Table,Name,Role',
      ',3/9/2026,09:00:00,9AM,105,Bong Torres,Usher',
      ',3/9/2026,09:00:00,9AM,10,Unknown Person,Attendee',
    ].join('\n');

    const file = new File([csvContent], 'attendance.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const selectFileBtn = screen.getByRole('button', { name: /Select File.../i });
    fireEvent.click(selectFileBtn);
    // Now modal is open. We don't really care about testing modal inputs here, just need to submit it to trigger the hidden file input.
    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    // Actually we need to set the date first since continue is disabled
    const dateInput = screen.getByLabelText(/Target Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-03-09' } });
    fireEvent.click(continueBtn);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument();
    });

    // Row 2 is invalid
    expect(screen.getByText(/1 with error/i)).toBeInTheDocument();

    // 3. Click "Match Member" for Row 2
    const matchBtns = screen.getAllByRole('button', { name: /Match Member|Edit Match/i });
    fireEvent.click(matchBtns[1]);

    // MatchMemberModal opens
    expect(screen.getByText('Match Member for Row #3')).toBeInTheDocument();
    expect(screen.getByText('Sarah Connor')).toBeInTheDocument();

    // Select Sarah Connor
    const sarahBtn = screen.getByRole('button', { name: /Sarah Connor/i });
    fireEvent.click(sarahBtn);

    // Click Assign Member
    const assignBtn = screen.getByRole('button', { name: 'Assign Member' });
    fireEvent.click(assignBtn);

    // 4. Row 2 should now be valid and Matched badge displayed
    await waitFor(() => {
      expect(screen.getByText('Sarah Connor')).toBeInTheDocument();
      expect(screen.getByText('Matched')).toBeInTheDocument();
      expect(screen.queryByText(/1 with error/i)).not.toBeInTheDocument();
    });

    // Run Migration button is now active for all 2 rows
    const runBtn = screen.getByRole('button', { name: /Run Migration/i });
    expect(runBtn).toBeEnabled();

    fireEvent.click(runBtn);
    expect(screen.getByText(/This will upsert 2 attendance records\./i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Migration' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        layout_id: 'layout-1',
        rows: [
          expect.objectContaining({
            user_id: 'user-marrion',
            rfid: '1322281947',
            service_seat_id: 'seat-usher',
          }),
          expect.objectContaining({
            user_id: 'user-sarah',
            rfid: '8888',
            service_seat_id: 'seat-10',
          }),
        ],
      });
    });
  });

  it('automatically applies member match to all failed records sharing the same name/RFID', async () => {
    mockMutateAsync.mockResolvedValue({});

    render(<ServiceAttendanceMigrationPanel />);

    // 1. Select layout
    const trigger = screen.getByRole('button', { name: /Select a layout.../i });
    fireEvent.click(trigger);
    const option = screen.getByRole('option', { name: 'Base Layout' });
    fireEvent.click(option);

    // 2. Upload CSV with 3 rows: 1 valid, 2 failed rows sharing the same name "Unknown Person"
    const csvContent = [
      'RFID,Date,Time,Time_Slot,Table,Name,Role',
      ',3/9/2026,09:00:00,9AM,105,Bong Torres,Usher',
      ',3/9/2026,09:00:00,9AM,10,Unknown Person,Attendee',
      ',3/9/2026,09:00:00,9AM,10,Unknown Person,Attendee',
    ].join('\n');

    const file = new File([csvContent], 'attendance.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const selectFileBtn = screen.getByRole('button', { name: /Select File.../i });
    fireEvent.click(selectFileBtn);
    // Now modal is open. We don't really care about testing modal inputs here, just need to submit it to trigger the hidden file input.
    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    // Actually we need to set the date first since continue is disabled
    const dateInput = screen.getByLabelText(/Target Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-03-09' } });
    fireEvent.click(continueBtn);
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Preview (3 rows)')).toBeInTheDocument();
    });

    // 2 failed rows
    expect(screen.getByText(/2 with errors/i)).toBeInTheDocument();

    // 3. Open match modal for the first failed row (Row #3 in 1-indexed CSV line)
    const matchBtns = screen.getAllByRole('button', { name: /Match Member|Edit Match/i });
    fireEvent.click(matchBtns[1]);

    // Select Sarah Connor
    const sarahBtn = screen.getByRole('button', { name: /Sarah Connor/i });
    fireEvent.click(sarahBtn);

    // Bulk match checkbox is visible and checked by default for 1 other matching failed row
    expect(
      screen.getByText(/Apply match to all 1 other matching failed record/i),
    ).toBeInTheDocument();

    // Click Assign to 2 Records
    const assignBtn = screen.getByRole('button', { name: /Assign to 2 Records/i });
    fireEvent.click(assignBtn);

    // 4. Both failed rows are now matched and valid!
    await waitFor(() => {
      const sarahInstances = screen.getAllByText('Sarah Connor');
      expect(sarahInstances.length).toBe(2);
      expect(screen.queryByText(/with errors/i)).not.toBeInTheDocument();
    });

    // Run Migration button is active for all 3 rows
    const runBtn = screen.getByRole('button', { name: /Run Migration/i });
    expect(runBtn).toBeEnabled();
    fireEvent.click(runBtn);

    const confirmBtn = screen.getByRole('button', { name: 'Confirm Migration' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        layout_id: 'layout-1',
        rows: [
          expect.objectContaining({ user_id: 'user-marrion' }),
          expect.objectContaining({ user_id: 'user-sarah', service_date: '2026-03-09' }),
          expect.objectContaining({ user_id: 'user-sarah', service_date: '2026-03-09' }),
        ],
      });
    });
  });
});
