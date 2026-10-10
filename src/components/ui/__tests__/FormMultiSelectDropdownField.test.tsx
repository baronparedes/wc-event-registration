import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FormMultiSelectDropdownField } from '../FormMultiSelectDropdownField';

describe('FormMultiSelectDropdownField', () => {
  const defaultProps = {
    triggerAriaLabel: 'Select options',
    optionsAriaLabel: 'Available options',
    selectedLabel: '0 selected',
    options: [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
    ],
    selectedValues: [],
    clearButtonLabel: 'Clear all',
    onClearSelection: vi.fn(),
    onToggleSelection: vi.fn(),
  };

  it('renders correctly with closed initial state', () => {
    render(<FormMultiSelectDropdownField {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: 'Select options' });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<FormMultiSelectDropdownField {...defaultProps} label="My Custom Label" />);
    expect(screen.getByText('My Custom Label')).toBeInTheDocument();
  });

  it('handles string array options correctly', async () => {
    const user = userEvent.setup();
    render(<FormMultiSelectDropdownField {...defaultProps} options={['Apple', 'Banana']} />);

    await user.click(screen.getByRole('button', { name: 'Select options' }));
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
  });

  it('shows empty state label when no options are provided', async () => {
    const user = userEvent.setup();
    render(
      <FormMultiSelectDropdownField
        {...defaultProps}
        options={[]}
        emptyStateLabel="Nothing to see here"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Select options' }));
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument();
  });

  it('opens and closes dropdown when trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<FormMultiSelectDropdownField {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: 'Select options' });

    // Open
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox', { name: 'Available options' })).toBeInTheDocument();

    // Close
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown when pressing Escape', async () => {
    const user = userEvent.setup();
    render(<FormMultiSelectDropdownField {...defaultProps} />);

    const trigger = screen.getByRole('button', { name: 'Select options' });
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Outside Area</div>
        <FormMultiSelectDropdownField {...defaultProps} />
      </div>,
    );

    const trigger = screen.getByRole('button', { name: 'Select options' });
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('calls onToggleSelection when an option is clicked', async () => {
    const onToggleSelection = vi.fn();
    const user = userEvent.setup();

    render(
      <FormMultiSelectDropdownField {...defaultProps} onToggleSelection={onToggleSelection} />,
    );

    await user.click(screen.getByRole('button', { name: 'Select options' }));
    await user.click(screen.getByLabelText('Option 1'));

    expect(onToggleSelection).toHaveBeenCalledWith('opt1');
  });

  it('reflects selected values visually', async () => {
    const user = userEvent.setup();
    render(<FormMultiSelectDropdownField {...defaultProps} selectedValues={['opt2']} />);

    await user.click(screen.getByRole('button', { name: 'Select options' }));

    const opt1Checkbox = screen.getByLabelText('Option 1') as HTMLInputElement;
    const opt2Checkbox = screen.getByLabelText('Option 2') as HTMLInputElement;

    expect(opt1Checkbox.checked).toBe(false);
    expect(opt2Checkbox.checked).toBe(true);
  });

  it('calls onClearSelection and closes dropdown when clear button is clicked', async () => {
    const onClearSelection = vi.fn();
    const user = userEvent.setup();

    render(<FormMultiSelectDropdownField {...defaultProps} onClearSelection={onClearSelection} />);

    await user.click(screen.getByRole('button', { name: 'Select options' }));

    const clearBtn = screen.getByRole('button', { name: 'Clear all' });
    await user.click(clearBtn);

    expect(onClearSelection).toHaveBeenCalled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
