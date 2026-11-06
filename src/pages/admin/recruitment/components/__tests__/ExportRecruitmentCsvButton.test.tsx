import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as recruitmentDomain from '@/lib/domain/recruitment';

import { ExportRecruitmentCsvButton } from '../ExportRecruitmentCsvButton';

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/domain/recruitment', async () => {
  const actual = await vi.importActual('@/lib/domain/recruitment');
  return {
    ...actual,
    fetchAdminRecruitmentApplicationsForExport: vi.fn(),
    buildRecruitmentCsvExport: vi.fn(),
  };
});

describe('ExportRecruitmentCsvButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in normal state', () => {
    render(<ExportRecruitmentCsvButton />);
    expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument();
  });

  it('respects disabled prop', () => {
    render(<ExportRecruitmentCsvButton disabled />);
    const button = screen.getByRole('button', { name: /Export CSV/i });
    expect(button).toBeDisabled();
  });

  it('informs user if no applications are returned for export', async () => {
    vi.mocked(recruitmentDomain.fetchAdminRecruitmentApplicationsForExport).mockResolvedValueOnce(
      [],
    );

    render(<ExportRecruitmentCsvButton searchTerm="nobody" />);
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('No recruitment applications to export.');
    });
  });

  it('successfully exports CSV when records exist', async () => {
    const mockRecords = [
      {
        id: 'rec-1',
        full_name: 'Test Candidate',
        email: 'test@example.com',
        phone: '09171234567',
        desired_role: 'Prayer Coach',
        confirmed_role: 'Prayer Coach',
        current_step: 2,
        status: 'active' as const,
        survey_score: 18,
        survey_total: 20,
        applicant_attested_at: '2026-11-01T10:00:00Z',
        created_at: '2026-11-01T10:00:00Z',
        updated_at: '2026-11-01T10:00:00Z',
      },
    ];

    vi.mocked(recruitmentDomain.fetchAdminRecruitmentApplicationsForExport).mockResolvedValueOnce(
      mockRecords as unknown as recruitmentDomain.RecruitmentCsvRecord[],
    );
    vi.mocked(recruitmentDomain.buildRecruitmentCsvExport).mockReturnValueOnce({
      csvText: 'full_name,email\nTest Candidate,test@example.com',
      filename: 'recruitment-export-20261106.csv',
    });

    const createObjectURLSpy = vi.fn().mockReturnValue('blob:mock-url');
    const revokeObjectURLSpy = vi.fn();
    window.URL.createObjectURL = createObjectURLSpy;
    window.URL.revokeObjectURL = revokeObjectURLSpy;

    render(<ExportRecruitmentCsvButton status="active" currentStep={2} role="Prayer Coach" />);
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Successfully exported 1 application to CSV.');
    });

    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('handles and displays error message if export fetch throws', async () => {
    vi.mocked(recruitmentDomain.fetchAdminRecruitmentApplicationsForExport).mockRejectedValueOnce(
      new Error('Network error loading applications'),
    );

    render(<ExportRecruitmentCsvButton />);
    fireEvent.click(screen.getByRole('button', { name: /Export CSV/i }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error loading applications');
    });
  });
});
