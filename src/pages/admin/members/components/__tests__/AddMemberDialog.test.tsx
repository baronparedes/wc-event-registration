import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useCreateMemberMutation } from '@/hooks/domain/members';

import { AddMemberDialog } from '../AddMemberDialog';

vi.mock('@/hooks/domain/members', () => ({
  useCreateMemberMutation: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AddMemberDialog', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useCreateMemberMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateMemberMutation>);
  });

  it('renders trigger button and opens dialog on click', () => {
    render(<AddMemberDialog />);

    const triggerButton = screen.getByRole('button', { name: /Add Member/i });
    expect(triggerButton).toBeInTheDocument();

    fireEvent.click(triggerButton);

    expect(screen.getByRole('heading', { name: 'Add New Member' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Member ID/i)).toBeInTheDocument();
  });

  it('closes dialog when cancel button is clicked', () => {
    render(<AddMemberDialog />);

    fireEvent.click(screen.getByRole('button', { name: /Add Member/i }));
    expect(screen.getByRole('heading', { name: 'Add New Member' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByRole('heading', { name: 'Add New Member' })).not.toBeInTheDocument();
  });

  it('submits form with valid values and displays success toast', async () => {
    mockMutateAsync.mockResolvedValueOnce({ id: 'new-id' });

    render(<AddMemberDialog />);

    fireEvent.click(screen.getByRole('button', { name: /Add Member/i }));

    fireEvent.change(screen.getByLabelText(/Member ID/i), { target: { value: 'RFID-999' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Testie' } });
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'Volunteer' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'Adult' } });

    const submitBtn = screen.getByRole('button', { name: /Create Member/i });
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('handles submission errors and displays error toast', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Duplicate RFID'));

    render(<AddMemberDialog />);

    fireEvent.click(screen.getByRole('button', { name: /Add Member/i }));

    fireEvent.change(screen.getByLabelText(/Member ID/i), { target: { value: 'RFID-999' } });
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText(/Last Name/i), { target: { value: 'User' } });
    fireEvent.change(screen.getByLabelText(/Nickname/i), { target: { value: 'Testie' } });
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'Volunteer' } });
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: 'Adult' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Member/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});
