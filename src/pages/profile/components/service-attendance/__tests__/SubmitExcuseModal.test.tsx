import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SubmitExcuseModal } from '../SubmitExcuseModal';

const mockMutateAsync = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('SubmitExcuseModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with default values when open', () => {
    render(
      <SubmitExcuseModal
        isOpen={true}
        onClose={vi.fn()}
        userId="d3b07384-d113-469b-810b-8d89e52c8b82"
        memberId="MEM-456"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Request Excuse' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Service Date/i)).toBeInTheDocument();
    expect(screen.getByText('All Services')).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason/i)).toBeInTheDocument();
  });

  it('does not render dialog content when closed', () => {
    render(
      <SubmitExcuseModal
        isOpen={false}
        onClose={vi.fn()}
        userId="d3b07384-d113-469b-810b-8d89e52c8b82"
        memberId="MEM-456"
      />,
    );

    expect(screen.queryByRole('heading', { name: 'Request Excuse' })).not.toBeInTheDocument();
  });

  it('toggles service slots and submits form data', async () => {
    const handleClose = vi.fn();
    mockMutateAsync.mockResolvedValueOnce({ id: 'excuse-1' });

    render(
      <SubmitExcuseModal
        isOpen={true}
        onClose={handleClose}
        userId="d3b07384-d113-469b-810b-8d89e52c8b82"
        memberId="MEM-456"
      />,
    );

    // Set date
    const dateInput = screen.getByLabelText(/Service Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-10-18' } });

    // Select 9:00 AM slot
    const slot9am = screen.getByRole('button', { name: '9:00 AM' });
    fireEvent.click(slot9am);

    // Enter reason
    const reasonInput = screen.getByLabelText(/Reason/i);
    fireEvent.change(reasonInput, { target: { value: 'Family event' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: 'Submit Excuse' });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'd3b07384-d113-469b-810b-8d89e52c8b82',
          member_id: 'MEM-456',
          request_date: '2026-10-18',
          services: ['9AM'],
          reason: 'Family event',
        }),
      );
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Excuse request submitted successfully.');
    expect(handleClose).toHaveBeenCalled();
  });

  it('shows error toast when mutation fails', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

    render(
      <SubmitExcuseModal
        isOpen={true}
        onClose={vi.fn()}
        userId="d3b07384-d113-469b-810b-8d89e52c8b82"
        memberId="MEM-456"
      />,
    );

    const dateInput = screen.getByLabelText(/Service Date/i);
    fireEvent.change(dateInput, { target: { value: '2026-10-18' } });

    const submitBtn = screen.getByRole('button', { name: 'Submit Excuse' });
    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Network error');
    });
  });
});
