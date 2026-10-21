import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpdateMemberIdMutation } from '@/hooks/domain/members';

import { UpdateMemberIdDialog } from '../UpdateMemberIdDialog';

vi.mock('@/hooks/domain/members', () => ({
  useUpdateMemberIdMutation: vi.fn(),
}));

vi.mock('@/hooks/utils', () => ({
  useRfidAutoFocus: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('UpdateMemberIdDialog', () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useUpdateMemberIdMutation).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateMemberIdMutation>);
  });

  it('renders trigger button and opens dialog with member details', () => {
    render(
      <UpdateMemberIdDialog
        memberId="user-123"
        memberName="Test Jane Doe"
        currentMemberId="RFID-OLD"
      />,
    );

    const triggerBtn = screen.getByRole('button', { name: /Update Member ID/i });
    expect(triggerBtn).toBeInTheDocument();

    fireEvent.click(triggerBtn);

    expect(screen.getByRole('heading', { name: 'Update Member ID' })).toBeInTheDocument();
    expect(screen.getByText(/Member: Test Jane Doe/i)).toBeInTheDocument();
    expect(screen.getByText(/Current Member ID: RFID-OLD/i)).toBeInTheDocument();
  });

  it('closes dialog on cancel button click', () => {
    render(
      <UpdateMemberIdDialog
        memberId="user-123"
        memberName="Test Jane Doe"
        currentMemberId="RFID-OLD"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Update Member ID/i }));
    expect(screen.getByRole('heading', { name: 'Update Member ID' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(screen.queryByRole('heading', { name: 'Update Member ID' })).not.toBeInTheDocument();
  });

  it('disables submit when new ID is empty or identical to current ID', () => {
    render(
      <UpdateMemberIdDialog
        memberId="user-123"
        memberName="Test Jane Doe"
        currentMemberId="RFID-OLD"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Update Member ID/i }));

    const submitBtn = screen.getByRole('button', { name: /Confirm Update/i });
    expect(submitBtn).toBeDisabled();

    // Type identical ID
    const input = screen.getByLabelText(/New Member ID/i);
    fireEvent.change(input, { target: { value: 'RFID-OLD' } });
    expect(submitBtn).toBeDisabled();

    // Type different ID
    fireEvent.change(input, { target: { value: 'RFID-NEW' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('submits updated ID and calls toast.success', async () => {
    mockMutateAsync.mockResolvedValueOnce({});

    render(
      <UpdateMemberIdDialog
        memberId="user-123"
        memberName="Test Jane Doe"
        currentMemberId="RFID-OLD"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Update Member ID/i }));

    const input = screen.getByLabelText(/New Member ID/i);
    fireEvent.change(input, { target: { value: 'RFID-NEW' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Update/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 'user-123',
        newMemberId: 'RFID-NEW',
      });
    });
  });

  it('handles update rejection and calls toast.error', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('RFID already assigned'));

    render(
      <UpdateMemberIdDialog
        memberId="user-123"
        memberName="Test Jane Doe"
        currentMemberId="RFID-OLD"
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Update Member ID/i }));

    const input = screen.getByLabelText(/New Member ID/i);
    fireEvent.change(input, { target: { value: 'RFID-TAKEN' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirm Update/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});
