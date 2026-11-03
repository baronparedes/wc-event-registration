import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ApplicantCommitmentsInput } from '@/lib/domain/recruitment';

import { ApplicantCommitmentSelector } from '../ApplicantCommitmentSelector';

describe('ApplicantCommitmentSelector', () => {
  it('requires at least one Sunday service slot before saving', async () => {
    const onSave = vi.fn<(commitments: ApplicantCommitmentsInput) => void>();
    render(<ApplicantCommitmentSelector commitments={{}} isSaving={false} onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Save Sunday Commitments' }));

    await waitFor(() => expect(onSave).not.toHaveBeenCalled());
    expect(await screen.findByText('Select at least one Sunday service slot')).toBeInTheDocument();
  });

  it('disables the save control while commitments are saving', () => {
    render(<ApplicantCommitmentSelector commitments={{}} isSaving onSave={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  });
});
