import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Step7VmtRegistrationPanel } from '../Step7VmtRegistrationPanel';
import { mockApplication } from './testStepHelpers';

const mockFocusFirstError = vi.fn();
vi.mock('@/hooks/utils', () => ({
  useFormErrorFocus: () => ({ focusFirstError: mockFocusFirstError }),
}));

describe('Step7VmtRegistrationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders LockedStepCard when isFutureStep is true', () => {
    const onJumpToActive = vi.fn();
    render(
      <Step7VmtRegistrationPanel
        application={{ ...mockApplication, current_step: 3 }}
        isCompletedStep={false}
        isFutureStep={true}
        isPending={false}
        onJumpToActive={onJumpToActive}
        onRequestComplete={vi.fn()}
      />,
    );

    expect(screen.getByText(/is Locked/i)).toBeInTheDocument();
    const jumpBtn = screen.getByRole('button', { name: /Go to Active Step/i });
    fireEvent.click(jumpBtn);
    expect(onJumpToActive).toHaveBeenCalledTimes(1);
  });

  it('renders CompletedStepCard with disabled inputs when isCompletedStep is true', () => {
    render(
      <Step7VmtRegistrationPanel
        application={{
          ...mockApplication,
          current_step: 8,
          ccf_vmt_id: 'VMT-999',
          ccf_vmt_date: '2026-11-05',
          vmt_registered: true,
          vmt_registered_at: '2026-11-05T10:00:00Z',
        }}
        isCompletedStep={true}
        isFutureStep={false}
        isPending={false}
        onJumpToActive={vi.fn()}
        onRequestComplete={vi.fn()}
      />,
    );

    expect(screen.getByText(/is Completed/i)).toBeInTheDocument();
    expect(screen.getByText(/Completed on/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('VMT-999')).toBeDisabled();
    expect(screen.getByDisplayValue('2026-11-05')).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /Verify & Complete Step 7/i }),
    ).not.toBeInTheDocument();
  });

  it('shows missing details error summary and disables submit when fields are empty', () => {
    render(
      <Step7VmtRegistrationPanel
        application={{
          ...mockApplication,
          current_step: 7,
          ccf_vmt_id: null,
          ccf_vmt_date: null,
          vmt_registered: false,
        }}
        isCompletedStep={false}
        isFutureStep={false}
        isPending={false}
        onJumpToActive={vi.fn()}
        onRequestComplete={vi.fn()}
      />,
    );

    expect(screen.getByText('Pending applicant confirmation')).toBeInTheDocument();
    expect(screen.getByText('Required before completing Step 7:')).toBeInTheDocument();
    expect(screen.getByText('CCF VMT ID')).toBeInTheDocument();
    expect(screen.getByText('CCF VMT Registration Date')).toBeInTheDocument();

    const jumpBtn = screen.getByRole('button', { name: 'Jump to missing field' });
    fireEvent.click(jumpBtn);
    expect(mockFocusFirstError).toHaveBeenCalledWith(['ccfVmtId']);

    const submitBtn = screen.getByRole('button', { name: /Verify & Complete Step 7/i });
    expect(submitBtn).toBeDisabled();
  });

  it('focuses date field when ID is entered and jumps, then submits when complete', () => {
    const onRequestComplete = vi.fn();
    render(
      <Step7VmtRegistrationPanel
        application={{
          ...mockApplication,
          current_step: 7,
          ccf_vmt_id: null,
          ccf_vmt_date: null,
          vmt_registered: false,
        }}
        isCompletedStep={false}
        isFutureStep={false}
        isPending={false}
        onJumpToActive={vi.fn()}
        onRequestComplete={onRequestComplete}
      />,
    );

    const idInput = screen.getByPlaceholderText('e.g. VMT-12345');
    fireEvent.change(idInput, { target: { value: 'VMT-54321' } });

    // ID is filled, now clicking jump should target ccfVmtDate
    const jumpBtn = screen.getByRole('button', { name: 'Jump to missing field' });
    fireEvent.click(jumpBtn);
    expect(mockFocusFirstError).toHaveBeenCalledWith(['ccfVmtDate']);

    // Now fill date
    const dateInput = screen.getByLabelText(/CCF VMT Registration Date \*/i);
    fireEvent.change(dateInput, { target: { value: '2026-11-06' } });

    // Error summary should disappear
    expect(screen.queryByText('Required before completing Step 7:')).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Verify & Complete Step 7/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    expect(onRequestComplete).toHaveBeenCalledWith({
      ccfVmtId: 'VMT-54321',
      ccfVmtDate: '2026-11-06',
    });
  });
});
