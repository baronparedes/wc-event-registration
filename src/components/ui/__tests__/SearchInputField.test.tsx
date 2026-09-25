import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SearchInputField } from '../SearchInputField';

describe('SearchInputField', () => {
  it('renders input with placeholder and search icon', () => {
    render(<SearchInputField value="" onChange={vi.fn()} placeholder="Search items..." />);

    const input = screen.getByPlaceholderText('Search items...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveAttribute('aria-label', 'Search');
  });

  it('renders custom label and handles change events', () => {
    const handleChange = vi.fn();
    render(
      <SearchInputField id="test-search" label="Find User" value="john" onChange={handleChange} />,
    );

    expect(screen.getByLabelText('Find User')).toBeInTheDocument();
    const input = screen.getByDisplayValue('john');
    fireEvent.change(input, { target: { value: 'john doe' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders and triggers onClear button when value is present', () => {
    const handleClear = vi.fn();
    render(<SearchInputField value="query" onChange={vi.fn()} onClear={handleClear} />);

    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('does not render clear button when value is empty', () => {
    render(<SearchInputField value="" onChange={vi.fn()} onClear={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument();
  });

  it('renders error message when error prop is passed', () => {
    render(<SearchInputField value="" onChange={vi.fn()} error="Invalid search term" />);

    expect(screen.getByText('Invalid search term')).toBeInTheDocument();
  });
});
