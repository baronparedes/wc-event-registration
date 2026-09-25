import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { formatPaginationSummary } from '@/lib/infrastructure';

import { AdminInfiniteScrollFooter } from '../AdminInfiniteScrollFooter';

describe('formatPaginationSummary', () => {
  it('formats partial count when hasNextPage is true', () => {
    expect(formatPaginationSummary(true, 10, 50, 'event')).toBe('Showing 10 of 50 events');
  });

  it('formats partial count when currentCount is less than totalCount even if hasNextPage is false', () => {
    expect(formatPaginationSummary(false, 3, 10, 'submission')).toBe('Showing 3 of 10 submissions');
  });

  it('formats custom plural when provided and hasNextPage is true', () => {
    expect(
      formatPaginationSummary(true, 10, 50, 'unregistered member', 'unregistered members'),
    ).toBe('Showing 10 of 50 unregistered members');
  });

  it('formats all count singular when totalCount is 1 and hasNextPage is false', () => {
    expect(formatPaginationSummary(false, 1, 1, 'event')).toBe('Showing all 1 event');
  });

  it('formats all count plural when totalCount is > 1 and hasNextPage is false', () => {
    expect(formatPaginationSummary(false, 15, 15, 'form')).toBe('Showing all 15 forms');
  });
});

describe('AdminInfiniteScrollFooter', () => {
  it('renders summary text and does not render Load More button when hasNextPage is false', () => {
    render(
      <AdminInfiniteScrollFooter
        currentCount={5}
        totalCount={5}
        entityName="event"
        hasNextPage={false}
      />,
    );

    expect(screen.getByText('Showing all 5 events')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /load more/i })).not.toBeInTheDocument();
  });

  it('renders Load More button and calls onFetchNextPage when clicked', () => {
    const onFetchNextPage = vi.fn();

    render(
      <AdminInfiniteScrollFooter
        currentCount={10}
        totalCount={25}
        entityName="event"
        hasNextPage={true}
        onFetchNextPage={onFetchNextPage}
      />,
    );

    expect(screen.getByText('Showing 10 of 25 events')).toBeInTheDocument();
    const loadMoreBtn = screen.getByRole('button', { name: /load more/i });
    expect(loadMoreBtn).toBeInTheDocument();

    fireEvent.click(loadMoreBtn);
    expect(onFetchNextPage).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isFetchingNextPage is true', () => {
    render(
      <AdminInfiniteScrollFooter
        currentCount={10}
        totalCount={25}
        entityName="event"
        hasNextPage={true}
        isFetchingNextPage={true}
        onFetchNextPage={vi.fn()}
      />,
    );

    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('renders custom summaryText when provided', () => {
    render(
      <AdminInfiniteScrollFooter
        currentCount={10}
        totalCount={10}
        summaryText="10 records (2 unique volunteers)"
        hasNextPage={false}
      />,
    );

    expect(screen.getByText('10 records (2 unique volunteers)')).toBeInTheDocument();
  });
});
