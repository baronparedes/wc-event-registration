import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type MissedServiceCommitment } from '@/lib/domain/services';
import * as serviceExports from '@/lib/domain/services/service-attendance-export';

import { ExportMissedCommitmentsButton } from '../ExportMissedCommitmentsButton';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/domain/services/service-attendance-export', async () => {
  const actual = await vi.importActual('@/lib/domain/services/service-attendance-export');
  return {
    ...actual,
    buildMissedServiceCommitmentsCsvExport: vi.fn(),
  };
});

describe('ExportMissedCommitmentsButton', () => {
  const mockRecords: MissedServiceCommitment[] = [
    {
      user_id: 'u1',
      member_id: 'm1',
      full_name: 'Test First Test Last',
      nickname: 'Test Nickname',
      role: 'Worship',
      phone: '1234567890',
      avatar_object_key: null,
      service_date: '2024-01-01',
      time_slot: '09:00',
      status: 'absent',
      category: null,
    },
  ];

  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    vi.clearAllMocks();

    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn(() => 'blob:http://localhost/test-blob');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('renders default state correctly', () => {
    render(<ExportMissedCommitmentsButton records={mockRecords} />);
    const button = screen.getByRole('button', { name: /export missed commitments as csv/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(screen.getByText('Export as CSV')).toBeInTheDocument();
  });

  it('is disabled when records array is empty', () => {
    render(<ExportMissedCommitmentsButton records={[]} />);
    const button = screen.getByRole('button', { name: /export missed commitments as csv/i });
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<ExportMissedCommitmentsButton records={mockRecords} disabled={true} />);
    const button = screen.getByRole('button', { name: /export missed commitments as csv/i });
    expect(button).toBeDisabled();
  });

  it('successfully exports and shows success toast', async () => {
    const user = userEvent.setup();

    vi.spyOn(serviceExports, 'buildMissedServiceCommitmentsCsvExport').mockReturnValue({
      csvText: 'test,csv\n1,2',
      filename: 'missed-commitments-test.csv',
    });

    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ExportMissedCommitmentsButton records={mockRecords} />);
    const button = screen.getByRole('button', { name: /export missed commitments as csv/i });

    await user.click(button);

    expect(serviceExports.buildMissedServiceCommitmentsCsvExport).toHaveBeenCalledWith({
      records: mockRecords,
      startDate: undefined,
      endDate: undefined,
    });

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/test-blob');
    expect(toast.success).toHaveBeenCalledWith('Successfully exported 1 missed commitment record.');

    clickSpy.mockRestore();
  });

  it('handles export failure and shows error toast', async () => {
    const user = userEvent.setup();

    vi.spyOn(serviceExports, 'buildMissedServiceCommitmentsCsvExport').mockImplementation(() => {
      throw new Error('CSV Generation Failed');
    });

    render(<ExportMissedCommitmentsButton records={mockRecords} />);
    const button = screen.getByRole('button', { name: /export missed commitments as csv/i });

    await user.click(button);

    expect(toast.error).toHaveBeenCalledWith('CSV Generation Failed');
  });
});
