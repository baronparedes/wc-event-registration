import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EndorsementActionDialog } from '../EndorsementActionDialog';

const mutateAsyncMock = vi.fn();
vi.mock('@/hooks/domain/recruitment/mutations/useUpdateRecruitmentStageMutation', () => ({
  useUpdateRecruitmentStageMutation: () => ({
    mutateAsync: mutateAsyncMock,
  }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('EndorsementActionDialog', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly in change_leader mode and prefills values', () => {
    render(
      <EndorsementActionDialog
        isOpen={true}
        onClose={onCloseMock}
        applicationId="app-123"
        applicantName="Jane Doe"
        mode="change_leader"
        initialLeaderName="Pastor Mark"
        initialLeaderEmail="mark@example.com"
        initialLeaderPhone="+639171234567"
      />,
    );

    expect(screen.getByRole('heading', { name: /change dgroup leader/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Pastor Mark')).toBeInTheDocument();
    expect(screen.getByDisplayValue('mark@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+639171234567')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update & send link/i })).toBeInTheDocument();
  });

  it('renders correctly in re_request mode', () => {
    render(
      <EndorsementActionDialog
        isOpen={true}
        onClose={onCloseMock}
        applicationId="app-123"
        applicantName="Jane Doe"
        mode="re_request"
        initialLeaderName="Pastor Mark"
        initialLeaderEmail="mark@example.com"
      />,
    );

    expect(screen.getByRole('heading', { name: /request endorsement again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send endorsement request/i })).toBeInTheDocument();
  });

  it('validates required fields before submitting', async () => {
    const user = userEvent.setup();
    render(
      <EndorsementActionDialog
        isOpen={true}
        onClose={onCloseMock}
        applicationId="app-123"
        applicantName="Jane Doe"
        mode="change_leader"
      />,
    );

    await user.click(screen.getByRole('button', { name: /update & send link/i }));

    expect(await screen.findByText(/leader name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/valid email address is required/i)).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('submits updated values and closes on success', async () => {
    mutateAsyncMock.mockResolvedValueOnce({ success: true });
    const user = userEvent.setup();

    render(
      <EndorsementActionDialog
        isOpen={true}
        onClose={onCloseMock}
        applicationId="app-123"
        applicantName="Jane Doe"
        mode="change_leader"
        initialLeaderName="Pastor Mark"
        initialLeaderEmail="mark@example.com"
      />,
    );

    const emailInput = screen.getByDisplayValue('mark@example.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'newleader@example.com');

    const notesInput = screen.getByLabelText(/reason for leader change/i);
    await user.type(notesInput, 'Leader moved to different satellite');

    await user.click(screen.getByRole('button', { name: /update & send link/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        action: 'request_endorsement',
        application_id: 'app-123',
        leader_name: 'Pastor Mark',
        leader_email: 'newleader@example.com',
        leader_contact_number: null,
        notes: 'Leader moved to different satellite',
      });
      expect(toastSuccessMock).toHaveBeenCalled();
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('displays error toast when mutation fails', async () => {
    mutateAsyncMock.mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();

    render(
      <EndorsementActionDialog
        isOpen={true}
        onClose={onCloseMock}
        applicationId="app-123"
        applicantName="Jane Doe"
        mode="re_request"
        initialLeaderName="Pastor Mark"
        initialLeaderEmail="mark@example.com"
      />,
    );

    await user.click(screen.getByRole('button', { name: /send endorsement request/i }));

    await waitFor(() => {
      expect(toastErrorMock).toHaveBeenCalledWith('Network error');
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });
});
