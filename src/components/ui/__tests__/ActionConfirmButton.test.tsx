import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActionConfirmButton } from '../ActionConfirmButton';

const defaultProps = {
  title: 'Confirm Action',
  description: 'Are you sure you want to do this?',
  confirmLabel: 'Yes, do it',
  confirmLoadingLabel: 'Doing it...',
  isPending: false,
  onConfirm: vi.fn(),
};

describe('ActionConfirmButton', () => {
  it('renders the action button with children', () => {
    render(<ActionConfirmButton {...defaultProps}>Trigger Action</ActionConfirmButton>);
    expect(screen.getByRole('button', { name: 'Trigger Action' })).toBeInTheDocument();
  });

  it('opens the confirmation dialog when clicked', async () => {
    const user = userEvent.setup();
    render(<ActionConfirmButton {...defaultProps}>Trigger Action</ActionConfirmButton>);

    // Dialog should not be visible initially
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    // Click the trigger button
    await user.click(screen.getByRole('button', { name: 'Trigger Action' }));

    // Dialog should now be visible
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to do this?')).toBeInTheDocument();
  });

  it('calls onConfirm and closes dialog when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn().mockResolvedValue(undefined);
    render(
      <ActionConfirmButton {...defaultProps} onConfirm={onConfirmMock}>
        Trigger Action
      </ActionConfirmButton>,
    );

    // Open dialog
    await user.click(screen.getByRole('button', { name: 'Trigger Action' }));

    // Click confirm inside dialog
    await user.click(screen.getByRole('button', { name: 'Yes, do it' }));

    expect(onConfirmMock).toHaveBeenCalledTimes(1);

    // Dialog should close after confirming
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('closes dialog without calling onConfirm when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onConfirmMock = vi.fn();
    render(
      <ActionConfirmButton {...defaultProps} onConfirm={onConfirmMock}>
        Trigger Action
      </ActionConfirmButton>,
    );

    // Open dialog
    await user.click(screen.getByRole('button', { name: 'Trigger Action' }));

    // Click cancel inside dialog
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirmMock).not.toHaveBeenCalled();

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    });
  });

  it('disables trigger button and shows loading state when isPending is true', () => {
    render(
      <ActionConfirmButton {...defaultProps} isPending={true}>
        Trigger Action
      </ActionConfirmButton>,
    );

    const triggerBtn = screen.getByRole('button', { name: 'Trigger Action' });
    expect(triggerBtn).toBeDisabled();
  });

  it('shows loading state in dialog when isPending changes to true while open', async () => {
    const { rerender } = render(
      <ActionConfirmButton {...defaultProps} isPending={false}>
        Trigger Action
      </ActionConfirmButton>,
    );

    const user = userEvent.setup();

    // Open dialog
    await user.click(screen.getByRole('button', { name: 'Trigger Action' }));

    // Rerender with isPending=true
    rerender(
      <ActionConfirmButton {...defaultProps} isPending={true}>
        Trigger Action
      </ActionConfirmButton>,
    );

    // Check loading label is shown on the confirm button
    const confirmBtn = screen.getByRole('button', { name: 'Doing it...' });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn).toBeDisabled();
  });
});
