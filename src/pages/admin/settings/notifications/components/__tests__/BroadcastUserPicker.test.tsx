import { faker } from '@faker-js/faker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthUsersQuery } from '@/hooks/domain/auth';

import { BroadcastUserPicker } from '../BroadcastUserPicker';

vi.mock('@/hooks/domain/auth', () => ({
  useAuthUsersQuery: vi.fn(),
}));

const firstUserName = faker.person.fullName();
const firstUserEmail = faker.internet.exampleEmail();
const secondUserName = faker.person.fullName();
const thirdUserName = faker.person.fullName();

const mockUsers = [
  {
    id: 'user-1',
    name: firstUserName,
    email: firstUserEmail,
    avatar_object_key: null,
    has_member_profile: true,
    created_at: '2026-01-01T00:00:00Z',
    last_sign_in_at: null,
  },
  {
    id: 'user-2',
    name: secondUserName,
    email: faker.internet.exampleEmail(),
    avatar_object_key: null,
    has_member_profile: false,
    created_at: '2026-01-02T00:00:00Z',
    last_sign_in_at: null,
  },
  {
    id: 'user-3',
    name: thirdUserName,
    email: faker.internet.exampleEmail(),
    avatar_object_key: null,
    has_member_profile: true,
    created_at: '2026-01-03T00:00:00Z',
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
      data: mockUsers.filter((user) => user.has_member_profile),
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
    expect(screen.getByText(firstUserName)).toBeInTheDocument();
    expect(screen.getByText(thirdUserName)).toBeInTheDocument();
    expect(screen.queryByText(secondUserName)).not.toBeInTheDocument();
    expect(useAuthUsersQuery).toHaveBeenCalledWith('', true, true);
  });

  it('selects a user on click and calls onChange with user id', () => {
    const handleChange = vi.fn();
    renderComponent({ onChange: handleChange });

    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    fireEvent.click(screen.getByText(firstUserName));

    expect(handleChange).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ id: 'user-1', name: firstUserName }),
    );
  });

  it('renders selected user card when value matches cached user', () => {
    const handleChange = vi.fn();
    renderComponent({ value: 'user-1', onChange: handleChange });

    expect(screen.getByText(firstUserName)).toBeInTheDocument();
    expect(screen.getByText(firstUserEmail)).toBeInTheDocument();
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

    // The unmatched auth user is filtered out, so the second option is a verified member.
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith(
      'user-3',
      expect.objectContaining({ id: 'user-3', name: thirdUserName }),
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

    // Initial selected index is 0. ArrowUp wraps to the last verified member.
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(handleChange).toHaveBeenCalledWith('user-3', expect.objectContaining({ id: 'user-3' }));
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
