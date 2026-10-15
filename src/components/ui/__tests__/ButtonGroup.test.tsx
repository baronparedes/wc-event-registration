import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ButtonGroup, ButtonGroupItem } from '@/components/ui/ButtonGroup';

describe('ButtonGroup Component', () => {
  it('renders options correctly with declarative options prop', () => {
    const onChange = vi.fn();
    const options = [
      { value: 'all', label: 'All' },
      { value: '9am', label: '9 AM' },
      { value: '12nn', label: '12 NN' },
    ];

    render(
      <ButtonGroup value="9am" onChange={onChange} options={options} ariaLabel="Slot selection" />,
    );

    const group = screen.getByRole('group', { name: 'Slot selection' });
    expect(group).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);

    expect(screen.getByRole('button', { name: '9 AM' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: '12 NN' }));
    expect(onChange).toHaveBeenCalledWith('12nn');
  });

  it('renders correctly with compound ButtonGroup.Item children', () => {
    const onChange = vi.fn();

    render(
      <ButtonGroup value="table" onChange={onChange} ariaLabel="View toggle">
        <ButtonGroup.Item value="table">Table</ButtonGroup.Item>
        <ButtonGroup.Item value="chart">Chart</ButtonGroup.Item>
      </ButtonGroup>,
    );

    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Chart' })).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Chart' }));
    expect(onChange).toHaveBeenCalledWith('chart');
  });

  it('handles icons in options and items', () => {
    render(
      <ButtonGroup value="view1">
        <ButtonGroup.Item value="view1" icon={<span data-testid="test-icon">icon</span>}>
          View 1
        </ButtonGroup.Item>
      </ButtonGroup>,
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('disables item when disabled prop is set on item or group', () => {
    const onChange = vi.fn();

    const { rerender } = render(
      <ButtonGroup value="a" onChange={onChange}>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b" disabled>
          B
        </ButtonGroup.Item>
      </ButtonGroup>,
    );

    const btnB = screen.getByRole('button', { name: 'B' });
    expect(btnB).toBeDisabled();
    fireEvent.click(btnB);
    expect(onChange).not.toHaveBeenCalled();

    // Now disable entire group
    rerender(
      <ButtonGroup value="a" onChange={onChange} disabled>
        <ButtonGroup.Item value="a">A</ButtonGroup.Item>
        <ButtonGroup.Item value="b">B</ButtonGroup.Item>
      </ButtonGroup>,
    );

    const btnA = screen.getByRole('button', { name: 'A' });
    expect(btnA).toBeDisabled();
    fireEvent.click(btnA);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('throws an error if ButtonGroupItem is used outside ButtonGroup', () => {
    // Suppress console.error for expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<ButtonGroupItem value="orphaned">Test</ButtonGroupItem>);
    }).toThrow('<ButtonGroup.Item /> must be used within a <ButtonGroup />.');

    spy.mockRestore();
  });
});
