import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ArchiveApplicantConfirmDialog } from '../ArchiveApplicantConfirmDialog';

function renderDialog(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ArchiveApplicantConfirmDialog', () => {
  const onConfirm = vi.fn();
  const onClose = vi.fn();

  const mockApplicant = {
    name: 'Timothy Paul',
    email: 'timothy@example.com',
    phone: '09171234567',
    role: 'Usher',
    currentStep: 3,
    avatarObjectKey: null,
  };

  it('renders archive mode confirmation details', async () => {
    const user = userEvent.setup();
    renderDialog(
      <ArchiveApplicantConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isPending={false}
        mode="archive"
        applicant={mockApplicant}
      />,
    );

    expect(screen.getByRole('heading', { name: /^archive applicant$/i })).toBeInTheDocument();
    expect(screen.getByText('Timothy Paul')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText(/The applicant status becomes/i)).toBeInTheDocument();

    const notesInput = screen.getByPlaceholderText(/Applicant requested a pause/i);
    await user.type(notesInput, 'Applicant traveling abroad until February');

    const confirmBtn = screen.getByRole('button', { name: /^Archive Applicant$/i });
    expect(confirmBtn).toHaveClass('bg-red-600');
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith('Applicant traveling abroad until February');
  });

  it('disables confirm button when archive reason is blank in archive mode', async () => {
    const user = userEvent.setup();
    renderDialog(
      <ArchiveApplicantConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isPending={false}
        mode="archive"
        applicant={mockApplicant}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /^Archive Applicant$/i });
    expect(confirmBtn).toBeDisabled();

    const notesInput = screen.getByPlaceholderText(/Applicant requested a pause/i);
    await user.type(notesInput, 'Valid archive reason');
    expect(confirmBtn).toBeEnabled();

    await user.clear(notesInput);
    expect(confirmBtn).toBeDisabled();
  });

  it('renders restore mode confirmation details', async () => {
    const user = userEvent.setup();
    renderDialog(
      <ArchiveApplicantConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isPending={false}
        mode="restore"
        applicant={mockApplicant}
      />,
    );

    expect(screen.getByText('Restore Applicant to Active')).toBeInTheDocument();
    expect(screen.getByText(/The applicant status returns to/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /^Restore Applicant$/i });
    expect(confirmBtn).toHaveClass('bg-primary');
    await user.click(confirmBtn);

    expect(onConfirm).toHaveBeenCalledWith(undefined);
  });

  it('calls onClose when Cancel is clicked', async () => {
    const user = userEvent.setup();
    renderDialog(
      <ArchiveApplicantConfirmDialog
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        isPending={false}
        mode="archive"
        applicant={mockApplicant}
      />,
    );

    const cancelBtn = screen.getByRole('button', { name: /^Cancel$/i });
    await user.click(cancelBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
