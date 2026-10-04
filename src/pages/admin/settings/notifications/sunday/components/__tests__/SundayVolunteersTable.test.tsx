import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SundayVolunteersTable } from '../SundayVolunteersTable';
import type { SundayVolunteerRecipient } from '@/lib/domain/notifications';

const mockVolunteers: SundayVolunteerRecipient[] = [
  {
    user_id: '1',
    member_id: 'MEM-001',
    full_name: 'Alice Smith',
    email: 'alice@example.com',
    formatted_slots: '9:00 AM, 11:00 AM',
    has_push: true,
    has_email: true,
  },
  {
    user_id: '2',
    member_id: 'MEM-002',
    full_name: 'Bob Jones',
    email: 'bob@example.com',
    formatted_slots: '11:00 AM',
    has_push: false,
    has_email: false,
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('SundayVolunteersTable', () => {
  it('renders a list of volunteers', () => {
    renderWithProviders(<SundayVolunteersTable volunteers={mockVolunteers} />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('filters volunteers by name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SundayVolunteersTable volunteers={mockVolunteers} />);

    const searchInput = screen.getByPlaceholderText('Search volunteers or slots...');
    await user.type(searchInput, 'Alice');

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
  });

  it('filters volunteers by slots', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SundayVolunteersTable volunteers={mockVolunteers} />);

    const searchInput = screen.getByPlaceholderText('Search volunteers or slots...');
    await user.type(searchInput, '9:00 AM');

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument();
  });

  it('shows empty state when no volunteers are present', () => {
    renderWithProviders(<SundayVolunteersTable volunteers={[]} />);
    expect(screen.getByText('No scheduled volunteers found')).toBeInTheDocument();
  });

  it('shows loading state when isLoading is true', () => {
    renderWithProviders(<SundayVolunteersTable volunteers={[]} isLoading={true} />);
    expect(screen.getByText('Loading scheduled volunteers...')).toBeInTheDocument();
  });

  it('shows empty search result state', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SundayVolunteersTable volunteers={mockVolunteers} />);

    const searchInput = screen.getByPlaceholderText('Search volunteers or slots...');
    await user.type(searchInput, 'NonExistent');

    expect(screen.getByText('No matches found')).toBeInTheDocument();
  });
});
