import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Step8RfidCommitmentsPanel } from '../Step8RfidCommitmentsPanel';
import { mockApplication } from './testStepHelpers';

const mockFocusFirstError = vi.fn();
vi.mock('@/hooks/utils', () => ({
  useFormErrorFocus: () => ({ focusFirstError: mockFocusFirstError }),
}));

// Mock SundayAvailabilityTable to make toggling simple and controllable
vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/ui');
  return {
    ...actual,
    SundayAvailabilityTable: ({
      onChange,
      disabled,
    }: {
      value: Record<string, string[]>;
      onChange?: (sundayKey: string, slot: string, checked?: boolean) => void;
      disabled?: boolean;
    }) => (
      <div data-testid="sunday-table">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange?.('first_sunday', '9AM', true)}
        >
          Select 1st Sunday 9AM
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange?.('first_sunday', '9AM', false)}
        >
          Deselect 1st Sunday 9AM
        </button>
      </div>
    ),
  };
});

describe('Step8RfidCommitmentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders LockedStepCard when isFutureStep is true', () => {
    const onJumpToActive = vi.fn();
    render(
      <Step8RfidCommitmentsPanel
        application={{ ...mockApplication, current_step: 4 }}
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
      <Step8RfidCommitmentsPanel
        application={{
          ...mockApplication,
          current_step: 9,
          assigned_rfid_member_id: 'RFID-1234',
          service_commitments: { first_sunday: ['9AM'] },
        }}
        isCompletedStep={true}
        isFutureStep={false}
        isPending={false}
        onJumpToActive={vi.fn()}
        onRequestComplete={vi.fn()}
      />,
    );

    expect(screen.getByText(/is Completed/i)).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByDisplayValue('RFID-1234')).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Save Commitments/i })).not.toBeInTheDocument();
  });

  it('shows error summary and disables submit when RFID or commitments are missing', () => {
    render(
      <Step8RfidCommitmentsPanel
        application={{
          ...mockApplication,
          current_step: 8,
          assigned_rfid_member_id: null,
          service_commitments: {},
        }}
        isCompletedStep={false}
        isFutureStep={false}
        isPending={false}
        onJumpToActive={vi.fn()}
        onRequestComplete={vi.fn()}
      />,
    );

    expect(screen.getByText('Required before completing Step 8:')).toBeInTheDocument();
    expect(screen.getByText('Assigned Physical RFID Tag')).toBeInTheDocument();
    expect(screen.getByText('At least one committed Sunday service slot')).toBeInTheDocument();

    const jumpBtn = screen.getByRole('button', { name: 'Jump to missing field' });
    fireEvent.click(jumpBtn);
    expect(mockFocusFirstError).toHaveBeenCalledWith(['rfid-tag', 'rfidTag']);

    const submitBtn = screen.getByRole('button', { name: /Save Commitments/i });
    expect(submitBtn).toBeDisabled();
  });

  it('allows selecting slots, entering RFID, and submitting completed Step 8', () => {
    const onRequestComplete = vi.fn();
    render(
      <Step8RfidCommitmentsPanel
        application={{
          ...mockApplication,
          current_step: 8,
          assigned_rfid_member_id: null,
          service_commitments: {},
        }}
        isCompletedStep={false}
        isFutureStep={false}
        isPending={false}
        onJumpToActive={vi.fn()}
        onRequestComplete={onRequestComplete}
      />,
    );

    // Select slot
    fireEvent.click(screen.getByRole('button', { name: 'Select 1st Sunday 9AM' }));
    expect(screen.getByText('Configured')).toBeInTheDocument();

    // Fill RFID input
    const rfidInput = screen.getByPlaceholderText('e.g. 1000123');
    fireEvent.change(rfidInput, { target: { value: 'RFID-98765' } });

    // Summary should be gone and submit enabled
    expect(screen.queryByText('Required before completing Step 8:')).not.toBeInTheDocument();
    const submitBtn = screen.getByRole('button', { name: /Save Commitments/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);
    expect(onRequestComplete).toHaveBeenCalledWith({
      rfidTag: 'RFID-98765',
      serviceCommitments: { first_sunday: ['9AM'] },
    });
  });
});
