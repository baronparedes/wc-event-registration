import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { useExportCommitmentDashboardStatsCSVMutation } from '@/hooks/domain/services';

import { ExportCommitmentDashboardButton } from '../ExportCommitmentDashboardButton';

vi.mock('@/hooks/domain/services', () => ({
  useExportCommitmentDashboardStatsCSVMutation: vi.fn(),
}));

describe('ExportCommitmentDashboardButton', () => {
  let createObjectURLSpy: Mock;
  let revokeObjectURLSpy: Mock;
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    revokeObjectURLSpy = vi.fn();
    global.URL.createObjectURL = createObjectURLSpy;
    global.URL.revokeObjectURL = revokeObjectURLSpy;

    vi.mocked(useExportCommitmentDashboardStatsCSVMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useExportCommitmentDashboardStatsCSVMutation>);
  });

  const defaultFilters = {
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    timeframe: 'YTD',
  };

  it('renders Export as CSV button', () => {
    render(<ExportCommitmentDashboardButton filters={defaultFilters} />);

    expect(
      screen.getByRole('button', { name: 'Export commitment dashboard as CSV' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
  });

  it('triggers CSV download on click when data exists', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      csvText: 'Full Name,Attendance Score\nJane Doe,10',
      filename: 'service-commitment-2026-01-01-to-2026-12-31-20260925-000000.csv',
      totalCount: 1,
    });

    render(<ExportCommitmentDashboardButton filters={defaultFilters} />);

    const button = screen.getByRole('button', { name: 'Export commitment dashboard as CSV' });
    fireEvent.click(button);

    expect(mockMutateAsync).toHaveBeenCalledWith(defaultFilters);
    await waitFor(() => {
      expect(createObjectURLSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  it('handles empty results without downloading', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      csvText: 'Full Name,Attendance Score\n',
      filename: 'service-commitment-2026-01-01-to-2026-12-31-20260925-000000.csv',
      totalCount: 0,
    });

    render(<ExportCommitmentDashboardButton filters={defaultFilters} />);

    const button = screen.getByRole('button', { name: 'Export commitment dashboard as CSV' });
    fireEvent.click(button);

    expect(mockMutateAsync).toHaveBeenCalledWith(defaultFilters);
    await waitFor(() => {
      expect(createObjectURLSpy).not.toHaveBeenCalled();
    });
  });

  it('respects disabled prop', () => {
    render(<ExportCommitmentDashboardButton filters={defaultFilters} disabled={true} />);

    const button = screen.getByRole('button', { name: 'Export commitment dashboard as CSV' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });
});
