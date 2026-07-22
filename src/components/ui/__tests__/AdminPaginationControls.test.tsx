import type { ComponentProps } from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls';

function renderControls(overrides: Partial<ComponentProps<typeof AdminPaginationControls>> = {}) {
  const props: ComponentProps<typeof AdminPaginationControls> = {
    currentPage: 3,
    totalPages: 10,
    canGoPrevious: true,
    canGoNext: true,
    onFirstPage: vi.fn(),
    onPreviousPage: vi.fn(),
    onNextPage: vi.fn(),
    onLastPage: vi.fn(),
    onGoToPage: vi.fn(),
    ...overrides,
  };

  render(<AdminPaginationControls {...props} />);
  return props;
}

describe('AdminPaginationControls', () => {
  it('renders page size selector and emits numeric page size changes', () => {
    const onPageSizeChange = vi.fn();

    renderControls({ pageSize: 25, pageSizeOptions: [10, 25, 50], onPageSizeChange });

    fireEvent.click(screen.getByRole('button', { name: 'Rows per page' }));
    fireEvent.click(screen.getByRole('option', { name: '50' }));

    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it('hides page size selector when required props are missing', () => {
    renderControls();

    expect(screen.queryByText('Rows per page')).not.toBeInTheDocument();
  });

  it('clamps and commits the page on blur', () => {
    const props = renderControls({ currentPage: 3, totalPages: 8 });
    const input = screen.getByLabelText('Go to page');

    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.blur(input);

    expect(props.onGoToPage).toHaveBeenCalledWith(8);
    expect(input).toHaveValue(3);
  });

  it('resets invalid page input to current page without navigation on submit', () => {
    const props = renderControls({ currentPage: 4, totalPages: 8 });
    const input = screen.getByLabelText('Go to page');

    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(props.onGoToPage).not.toHaveBeenCalled();
    expect(input).toHaveValue(4);
  });

  it('auto-commits adjacent page changes while editing', () => {
    const props = renderControls({ currentPage: 5, totalPages: 9 });
    const input = screen.getByLabelText('Go to page');

    fireEvent.change(input, { target: { value: '6' } });

    expect(props.onGoToPage).toHaveBeenCalledWith(6);
  });

  it('does not auto-commit non-adjacent page changes until submit', () => {
    const props = renderControls({ currentPage: 3, totalPages: 9 });
    const input = screen.getByLabelText('Go to page');

    fireEvent.change(input, { target: { value: '7' } });

    expect(props.onGoToPage).not.toHaveBeenCalled();

    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(props.onGoToPage).toHaveBeenCalledWith(7);
  });

  it('disables controls when loading and on first/last pages', () => {
    renderControls({
      isLoading: true,
      canGoPrevious: false,
      canGoNext: false,
      totalPages: 1,
    });

    expect(screen.getByRole('button', { name: 'Go to first page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Go to last page' })).toBeDisabled();
    expect(screen.getByLabelText('Go to page')).toBeDisabled();
  });
});
