import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as recruitmentDomain from '@/lib/domain/recruitment';

import { ImportRecruitmentCsvDialog } from '../ImportRecruitmentCsvDialog';

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/domain/recruitment', () => ({
  useBulkImportRecruitmentMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock('@/lib/domain/recruitment', async () => {
  const actual = await vi.importActual('@/lib/domain/recruitment');
  return {
    ...actual,
    fetchExistingRecruitmentEmails: vi.fn(),
  };
});

describe('ImportRecruitmentCsvDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(recruitmentDomain.fetchExistingRecruitmentEmails).mockResolvedValue(new Set());
  });

  it('renders initial upload dropzone and download template button', () => {
    render(<ImportRecruitmentCsvDialog {...defaultProps} />);

    expect(
      screen.getByRole('heading', { name: /Import Recruitment Applications/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Click to upload or drag and drop legacy recruitment CSV/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Template CSV/i })).toBeInTheDocument();
  });

  it('calls onClose when Cancel button is clicked', () => {
    render(<ImportRecruitmentCsvDialog {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('parses uploaded CSV and displays summary preview and import action', async () => {
    const csvContent = [
      'Role,Status,First Name,Middle Name,Last Name,Nickname,DOB,Mobile Number,Email,Gender,Attestation',
      'Usher,active,Juan,,Dela Cruz,Juan,1995-04-20,09171234567,juan@example.com,Male,2024-01-01',
    ].join('\n');

    const file = new File([csvContent], 'legacy_applicants.csv', { type: 'text/csv' });

    render(<ImportRecruitmentCsvDialog {...defaultProps} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('legacy_applicants.csv')).toBeInTheDocument();
      expect(screen.getByText('Ready to Import')).toBeInTheDocument();
      expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
      expect(screen.getByText('juan@example.com')).toBeInTheDocument();
    });

    const importButton = screen.getByRole('button', { name: /Import 1 Applicants/i });
    expect(importButton).toBeInTheDocument();

    mockMutateAsync.mockResolvedValueOnce({
      success: true,
      inserted_count: 1,
      skipped_count: 0,
      total_count: 1,
    });

    fireEvent.click(importButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Import Successfully Completed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Done/i })).toBeInTheDocument();
    });
  });
});
