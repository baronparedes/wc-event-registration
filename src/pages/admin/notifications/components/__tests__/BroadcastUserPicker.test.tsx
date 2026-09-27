import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthUsersQuery } from '@/hooks/domain/auth';

import { BroadcastUserPicker } from '../BroadcastUserPicker';

vi.mock('@/hooks/domain/auth', () => ({
  useAuthUsersQuery: vi.fn(),
}));

const mockUsers = [
  {
    id: 'user-1',
    name: 'Cecile Vitalicio',
    email: 'cesvitalicio23@gmail.com',
    avatar_object_key: null,
    has_member_profile: true,
    created_at: '2026-01-01T00:00:00Z',
    last_sign_in_at: null,
  },
  {
    id: 'user-2',
    name: 'Cesar Cudala',
    email: 'ccudala@gmail.com',
    avatar_object_key: null,
    has_member_profile: false,
    created_at: '2026-01-02T00:00:00Z',
    last_sign_in_at: null,
  },
];

describe('BroadcastUserPicker', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.mocked(useAuthUsersQuery).mockReturnValue({
      data: mockUsers,
      isLoading: false,
      isFetching: false,
    } as never);
  });

  const renderComponent = (props: React.ComponentProps<typeof BroadcastUserPicker>) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BroadcastUserPicker {...props} />
      </QueryClientProvider>,
    );
  };

  it('renders input combobox with placeholder and label', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    expect(screen.getByLabelText(/Target User/i)).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search user by name or email/i)).toBeInTheDocument();
  });

  it('opens dropdown and displays list of users on focus and typing', async () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Cecile Vitalicio')).toBeInTheDocument();
    expect(screen.getByText('Cesar Cudala')).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('selects a user on click and calls onChange with user id', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    fireEvent.click(screen.getByText('Cecile Vitalicio'));

    expect(handleChange).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ id: 'user-1', name: 'Cecile Vitalicio' }),
    );
  });

  it('renders selected user card when value matches cached user', () => {
    const handleChange = vi.fn();
    renderComponent({ value: 'user-1', onChange: handleChange });

    expect(screen.getByText('Cecile Vitalicio')).toBeInTheDocument();
    expect(screen.getByText('cesvitalicio23@gmail.com')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('clears selected user when remove button is clicked', () => {
    const handleChange = vi.fn();
    renderComponent({ value: 'user-1', onChange: handleChange });

    const removeBtn = screen.getByRole('button', { name: /Remove selected user/i });
    fireEvent.click(removeBtn);

    expect(handleChange).toHaveBeenCalledWith('', null);
  });

  it('navigates options via keyboard arrows and selects with Enter', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    // Press ArrowDown to highlight second user
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith(
      'user-2',
      expect.objectContaining({ id: 'user-2', name: 'Cesar Cudala' }),
    );
  });

  it('closes dropdown on Escape key', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('displays searching indicator when search is active or loading', () => {
    vi.mocked(useAuthUsersQuery).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
    } as never);

    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    expect(screen.getByText('Searching...')).toBeInTheDocument();
  });

  it('closes dropdown when clicking outside the component', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens dropdown when pressing ArrowDown while combobox is closed', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('wraps around selection index when pressing ArrowUp at top item', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    // Initial selected index is 0. ArrowUp wraps to last item (user-2)
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('user-2', expect.objectContaining({ id: 'user-2' }));
  });

  it('renders empty message when query returns no matching users', () => {
    vi.mocked(useAuthUsersQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
    } as never);

    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    expect(screen.getByText('No users found matching query.')).toBeInTheDocument();
  });

  it('renders error message when error prop is provided', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange, error: 'User selection required' });

    expect(screen.getByText('User selection required')).toBeInTheDocument();
  });
});
