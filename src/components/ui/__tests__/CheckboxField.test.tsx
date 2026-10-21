import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheckboxField } from '../CheckboxField';

describe('CheckboxField', () => {
  const mockRegistration = {
    onChange: vi.fn(),
    onBlur: vi.fn(),
    ref: vi.fn(),
    name: 'test-checkbox',
  };

  const defaultProps = {
    id: 'test-checkbox-id',
    label: 'Test Checkbox',
    description: 'This is a test description.',
    registration: mockRegistration,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with label and description', () => {
    render(<CheckboxField {...defaultProps} />);

    expect(screen.getByRole('checkbox', { name: 'Test Checkbox' })).toBeInTheDocument();
    expect(screen.getByText('This is a test description.')).toBeInTheDocument();
  });

  it('associates the label with the input correctly', () => {
    render(<CheckboxField {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Test Checkbox' });
    expect(checkbox).toHaveAttribute('id', 'test-checkbox-id');
  });

  it('calls onChange handler when clicked', async () => {
    const user = userEvent.setup();
    render(<CheckboxField {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Test Checkbox' });
    await user.click(checkbox);

    expect(mockRegistration.onChange).toHaveBeenCalled();
  });

  it('can be disabled', () => {
    render(<CheckboxField {...defaultProps} disabled={true} />);

    const checkbox = screen.getByRole('checkbox', { name: 'Test Checkbox' });
    expect(checkbox).toBeDisabled();
  });

  it('does not show the lock icon by default', () => {
    render(<CheckboxField {...defaultProps} />);

    expect(screen.queryByRole('img', { hidden: true })).not.toBeInTheDocument();
  });

  it('shows the lock icon when showLock is true', () => {
    render(<CheckboxField {...defaultProps} showLock={true} />);

    expect(
      screen.getByRole('img', {
        name: /This field cannot be changed on published events/i,
      }),
    ).toBeInTheDocument();
  });
});
