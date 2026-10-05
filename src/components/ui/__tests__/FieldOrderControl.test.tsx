import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FieldOrderControl } from '../FieldOrderControl';

describe('FieldOrderControl', () => {
  it('renders disabled up button when at first index', () => {
    const handleMove = vi.fn();
    render(
      <FieldOrderControl
        index={0}
        total={3}
        isReorderable={true}
        onMove={handleMove}
        itemLabel="First Field"
      />,
    );

    const upButton = screen.getByRole('button', { name: 'Move "First Field" up' });
    const downButton = screen.getByRole('button', { name: 'Move "First Field" down' });

    expect(upButton).toBeDisabled();
    expect(downButton).toBeEnabled();

    fireEvent.click(downButton);
    expect(handleMove).toHaveBeenCalledWith(0, 'down');
  });

  it('renders disabled down button when at last index', () => {
    const handleMove = vi.fn();
    render(
      <FieldOrderControl
        index={2}
        total={3}
        isReorderable={true}
        onMove={handleMove}
        itemLabel="Last Field"
      />,
    );

    const upButton = screen.getByRole('button', { name: 'Move "Last Field" up' });
    const downButton = screen.getByRole('button', { name: 'Move "Last Field" down' });

    expect(upButton).toBeEnabled();
    expect(downButton).toBeDisabled();

    fireEvent.click(upButton);
    expect(handleMove).toHaveBeenCalledWith(2, 'up');
  });

  it('renders non-interactive indicator when isReorderable is false', () => {
    render(
      <FieldOrderControl
        index={1}
        total={3}
        isReorderable={false}
        onMove={vi.fn()}
        disabledTooltip="Cannot reorder on published forms"
      />,
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTitle('Cannot reorder on published forms')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
