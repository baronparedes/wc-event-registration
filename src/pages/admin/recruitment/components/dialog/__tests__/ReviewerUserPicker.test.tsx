import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReviewerUserItem } from '@/lib/domain/recruitment';
import { ReviewerUserPicker } from '@/pages/admin/recruitment/components/dialog/ReviewerUserPicker';

const { mockUsersQuery, mockUserByIdQuery } = vi.hoisted(() => ({
  mockUsersQuery: vi.fn(),
  mockUserByIdQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/recruitment', () => ({
  useReviewerUsersQuery: mockUsersQuery,
  useReviewerUserByIdQuery: mockUserByIdQuery,
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

    mockUsersQuery.mockReturnValue({
      data: mockReviewers,
      isLoading: false,
      isFetching: false,
    });

    mockUserByIdQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
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

  it('navigates down and up, wraps at both ends, and selects with Enter', () => {
    const onChange = vi.fn();
    renderComponent({ onChange });
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(mockReviewers[0].id, mockReviewers[0]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens with Enter, changes the highlighted option on hover, and closes with Escape', () => {
    renderComponent({ onChange: vi.fn() });
    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'a' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    const options = screen.getAllByRole('option');
    fireEvent.mouseEnter(options[1]);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes for outside clicks but keeps the menu open for inside clicks', () => {
    renderComponent({ onChange: vi.fn() });
    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.mouseDown(screen.getByRole('listbox'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('debounces searches and removes a leading mention marker', async () => {
    renderComponent({ onChange: vi.fn() });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '@coach' } });
    expect(screen.getByText('Searching...')).toBeInTheDocument();
    await waitFor(() => expect(mockUsersQuery).toHaveBeenLastCalledWith('coach', true));
    expect(screen.queryByText('Searching...')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'usher' } });
    await waitFor(() => expect(mockUsersQuery).toHaveBeenLastCalledWith('usher', true));
  });

  it.each([
    { isLoading: true, isFetching: false },
    { isLoading: false, isFetching: true },
  ])('shows search progress for pending query state %j', (state) => {
    mockUsersQuery.mockReturnValue({ ...state, data: [] });
    renderComponent({ onChange: vi.fn() });
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getAllByText('Searching...')).toHaveLength(2);
    expect(screen.queryByText('No users found matching query.')).not.toBeInTheDocument();
  });

  it('handles absent users and ignores Enter when there is no selectable option', () => {
    mockUsersQuery.mockReturnValue({ isLoading: false, isFetching: false });
    const onChange = vi.fn();
    renderComponent({ onChange });
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByText('No users found matching query.')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows validation errors and supports an optional label', () => {
    renderComponent({ onChange: vi.fn(), label: '', required: false, error: 'Reviewer required' });
    expect(screen.getByText('Reviewer required')).toBeInTheDocument();
    expect(screen.queryByText('*')).not.toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveClass('border-danger');
  });

  it('disables selection and hides removal for a disabled selected reviewer', () => {
    const { rerender } = renderComponent({ onChange: vi.fn(), disabled: true });
    const input = screen.getByRole('combobox');
    expect(input).toBeDisabled();
    fireEvent.focus(input);
    fireEvent.click(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(mockUsersQuery).toHaveBeenCalledWith('', false);
    rerender(
      <QueryClientProvider client={queryClient}>
        <ReviewerUserPicker onChange={vi.fn()} disabled value={mockReviewers[0].id} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(mockReviewers[0].name)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Remove assigned reviewer/i }),
    ).not.toBeInTheDocument();
  });

  it('resolves a selected reviewer by id when absent from search results', () => {
    mockUsersQuery.mockReturnValue({ data: [], isLoading: false, isFetching: false });
    mockUserByIdQuery.mockReturnValue({ data: mockReviewers[1] });
    renderComponent({ value: mockReviewers[1].id, onChange: vi.fn() });
    expect(screen.getByText(mockReviewers[1].name)).toBeInTheDocument();
    expect(mockUserByIdQuery).toHaveBeenCalledWith(mockReviewers[1].id, true);
  });

  it.each(['unknown-user', ''])('falls back to the supplied reviewer name for id %j', (value) => {
    renderComponent({ value, reviewerName: 'Test External Reviewer', onChange: vi.fn() });
    expect(screen.getByText('Test External Reviewer')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByText('OIC')).not.toBeInTheDocument();
  });

  it('keeps the input visible when an unknown reviewer cannot be resolved', () => {
    renderComponent({ value: 'unknown-user', onChange: vi.fn() });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('uses full name fallbacks and omits absent role and email', () => {
    const user = { ...mockReviewers[0], name: '', role: null, email: null };
    mockUsersQuery.mockReturnValue({ data: [user], isLoading: false, isFetching: false });
    const { rerender } = renderComponent({ onChange: vi.fn() });
    fireEvent.focus(screen.getByRole('combobox'));
    expect(screen.getByRole('option')).toHaveTextContent(user.full_name);
    expect(screen.queryByText('OIC')).not.toBeInTheDocument();
    rerender(
      <QueryClientProvider client={queryClient}>
        <ReviewerUserPicker value={user.id} onChange={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(user.full_name)).toBeInTheDocument();
    expect(screen.queryByText(mockReviewers[0].email ?? '')).not.toBeInTheDocument();
  });

  it('retains the selected reviewer in cache when search results change and restores focus on clear', async () => {
    const onChange = vi.fn();
    const { rerender } = renderComponent({ onChange });
    fireEvent.focus(screen.getByRole('combobox'));
    fireEvent.click(screen.getAllByRole('option')[1]);
    mockUsersQuery.mockReturnValue({ data: [], isLoading: false, isFetching: false });
    rerender(
      <QueryClientProvider client={queryClient}>
        <ReviewerUserPicker value={mockReviewers[1].id} onChange={onChange} />
      </QueryClientProvider>,
    );
    expect(screen.getByText(mockReviewers[1].name)).toBeInTheDocument();
    expect(mockUserByIdQuery).toHaveBeenLastCalledWith(mockReviewers[1].id, false);
    fireEvent.click(screen.getByRole('button', { name: /Remove assigned reviewer/i }));
    rerender(
      <QueryClientProvider client={queryClient}>
        <ReviewerUserPicker onChange={onChange} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus());
    expect(onChange).toHaveBeenLastCalledWith('', null);
  });
});
