import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from '@/components/ui/Switch';

describe('Switch', () => {
  it('renders with switch semantics and checked state', () => {
    render(<Switch checked={true} onCheckedChange={vi.fn()} ariaLabel="Enable feature" />);

    const switchControl = screen.getByRole('switch', { name: 'Enable feature' });
    expect(switchControl).toHaveAttribute('aria-checked', 'true');
  });

  it('renders with switch semantics and unchecked state', () => {
    render(<Switch checked={false} onCheckedChange={vi.fn()} ariaLabel="Enable feature" />);

    const switchControl = screen.getByRole('switch', { name: 'Enable feature' });
    expect(switchControl).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onCheckedChange with the next value when clicked', () => {
    const onCheckedChange = vi.fn();

    render(<Switch checked={false} onCheckedChange={onCheckedChange} ariaLabel="Enable feature" />);

    fireEvent.click(screen.getByRole('switch', { name: 'Enable feature' }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('calls onCheckedChange with false when toggling from checked state', () => {
    const onCheckedChange = vi.fn();

    render(<Switch checked={true} onCheckedChange={onCheckedChange} ariaLabel="Enable feature" />);

    fireEvent.click(screen.getByRole('switch', { name: 'Enable feature' }));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('does not trigger callback when disabled', () => {
    const onCheckedChange = vi.fn();

    render(
      <Switch
        checked={false}
        onCheckedChange={onCheckedChange}
        ariaLabel="Enable feature"
        disabled
      />,
    );

    fireEvent.click(screen.getByRole('switch', { name: 'Enable feature' }));
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it('renders custom state text in labeled mode', () => {
    render(
      <Switch
        checked={true}
        onCheckedChange={vi.fn()}
        ariaLabel="Enable feature"
        showStateText
        onText="YES"
        offText="NO"
      />,
    );

    expect(screen.getByText('YES')).toBeInTheDocument();
  });

  it('renders off text in labeled mode when unchecked', () => {
    render(
      <Switch
        checked={false}
        onCheckedChange={vi.fn()}
        ariaLabel="Enable feature"
        showStateText
        onText="Active"
        offText="Inactive"
      />,
    );

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
