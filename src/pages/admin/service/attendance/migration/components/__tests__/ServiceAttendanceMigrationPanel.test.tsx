import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ServiceAttendanceMigrationPanel } from '../ServiceAttendanceMigrationPanel';

const mockMutateAsync = vi.fn();
const mockUseServiceLayoutsQuery = vi.fn();
const mockUseServiceSeatsQuery = vi.fn();
const mockUseLookupUsersByRfidsQuery = vi.fn();
const mockUseLookupUsersByNamesQuery = vi.fn();

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

describe('ServiceAttendanceMigrationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseServiceLayoutsQuery.mockReturnValue({
      data: [{ id: 'layout-1', description: 'Base Layout' }],
      isLoading: false,
    });
    mockUseServiceSeatsQuery.mockReturnValue({
      data: [
        { id: 'seat-10', table_number: '10' },
        { id: 'seat-usher', table_number: 'Usher / Backroom' },
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

  it('matches members by nickname + last_name, maps tables > 100 to Usher / Backroom, and filters status', async () => {
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
    fireEvent.change(fileInput, { target: { files: [file] } });

    // 3. Verify preview rows
    await waitFor(() => {
      expect(screen.getByText('Preview (2 rows)')).toBeInTheDocument();
    });

    // Bong Torres should resolve to Marrion Torres via nickname + last name matching
    expect(screen.getByText('Marrion Torres')).toBeInTheDocument();
    // Table 105 should map to Usher / Backroom
    const usherCells = screen.getAllByText('Usher / Backroom');
    expect(usherCells.length).toBeGreaterThan(0);

    // Row 2 is Unknown Person, which fails user matching
    expect(screen.getByText(/1 with error/i)).toBeInTheDocument();

    // 4. Test filtering
    const failedFilterBtn = screen.getByRole('button', { name: /^Failed/i });
    fireEvent.click(failedFilterBtn);

    // Only Unknown Person should be visible in failed filter view
    expect(
      screen.getByText('Member "Unknown Person" (RFID: N/A) not found in system.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Marrion Torres')).not.toBeInTheDocument();

    // Switch to valid filter view
    const validFilterBtn = screen.getByRole('button', { name: /Valid/i });
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
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(
        screen.getByText(/Looking up member details and seat assignments\.\.\./i),
      ).toBeInTheDocument();
    });
  });
});
