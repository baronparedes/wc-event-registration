import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useReviewerUserByIdQuery, useReviewerUsersQuery } from '@/hooks/domain/recruitment';
import type { ReviewerUserItem } from '@/lib/domain/recruitment';

import { ReviewerUserPicker } from '../ReviewerUserPicker';

vi.mock('@/hooks/domain/recruitment', () => ({
  useReviewerUsersQuery: vi.fn(),
  useReviewerUserByIdQuery: vi.fn(),
}));

const mockReviewers: ReviewerUserItem[] = [
  {
    id: 'user-oic-1',
    name: 'Test Paul Apostle (Test OIC Paul)',
    full_name: 'Test Paul Apostle',
    nickname: 'Test OIC Paul',
    email: 'paul.oic@example.com',
    role: 'OIC',
    avatar_object_key: null,
  },
  {
    id: 'user-coach-2',
    name: 'Test Barnabas Encourager',
    full_name: 'Test Barnabas Encourager',
    nickname: null,
    email: 'barnabas@example.com',
    role: 'Prayer Coach',
    avatar_object_key: null,
  },
];

describe('ReviewerUserPicker', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useReviewerUsersQuery).mockReturnValue({
      data: mockReviewers,
      isLoading: false,
      isFetching: false,
    } as never);

    vi.mocked(useReviewerUserByIdQuery).mockReturnValue({
      data: null,
      isLoading: false,
    } as never);
  });

  const renderComponent = (props: React.ComponentProps<typeof ReviewerUserPicker>) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ReviewerUserPicker {...props} />
      </QueryClientProvider>,
    );
  };

  it('renders input combobox with label and placeholder', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    expect(screen.getByLabelText(/Assigned Reviewer \/ Coach/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search user by name, email, or role/i)).toBeInTheDocument();
  });

  it('opens dropdown and displays list of reviewers with OIC badges', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Test Paul Apostle (Test OIC Paul)')).toBeInTheDocument();
    expect(screen.getByText('OIC')).toBeInTheDocument();
    expect(screen.getByText('Test Barnabas Encourager')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
  });

  it('selects a reviewer on click and calls onChange with user id and object', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    fireEvent.click(screen.getByText('Test Paul Apostle (Test OIC Paul)'));

    expect(handleChange).toHaveBeenCalledWith('user-oic-1', mockReviewers[0]);
  });

  it('renders selected reviewer card when value is provided', () => {
    const handleChange = vi.fn();
    renderComponent({
      value: 'user-oic-1',
      reviewerName: 'Test Paul Apostle (Test OIC Paul)',
      onChange: handleChange,
    });

    expect(screen.getByText('Test Paul Apostle (Test OIC Paul)')).toBeInTheDocument();
    expect(screen.getByText('OIC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove assigned reviewer/i })).toBeInTheDocument();
  });

  it('clears selection when remove button is clicked', () => {
    const handleChange = vi.fn();
    renderComponent({
      value: 'user-oic-1',
      reviewerName: 'Test Paul Apostle (Test OIC Paul)',
      onChange: handleChange,
    });

    fireEvent.click(screen.getByRole('button', { name: /Remove assigned reviewer/i }));

    expect(handleChange).toHaveBeenCalledWith('', null);
  });
});
