import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobileViewport } from '@/hooks/utils';
import type { SundayVolunteerRecipient } from '@/lib/domain/notifications';

import { SundayVolunteersTable } from '../SundayVolunteersTable';

vi.mock('@/hooks/utils', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/hooks/utils');
  return {
    ...actual,
    useIsMobileViewport: vi.fn(),
  };
});

const mockVolunteers: SundayVolunteerRecipient[] = [
  {
    user_id: '1',
    member_id: 'MEM-001',
    full_name: 'Test Alice Smith',
    email: 'test.alice@example.com',
    formatted_slots: '9:00 AM, 11:00 AM',
    has_push: true,
    has_email: true,
  },
  {
    user_id: '2',
    member_id: 'MEM-002',
    full_name: 'Test Bob Jones',
    email: 'test.bob@example.com',
    formatted_slots: '11:00 AM',
    has_push: false,
    has_email: false,
  },
];

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('SundayVolunteersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useIsMobileViewport).mockReturnValue(false);
  });
  it('renders a list of volunteers', () => {
    renderWithProviders(<SundayVolunteersTable volunteers={mockVolunteers} />);
    expect(screen.getByText('Test Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('test.bob@example.com')).toBeInTheDocument();
  });

  it('filters volunteers by name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SundayVolunteersTable volunteers={mockVolunteers} />);

    const searchInput = screen.getByPlaceholderText('Search volunteers or slots...');
    await user.type(searchInput, 'Alice');

    expect(screen.getByText('Test Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Test Bob Jones')).not.toBeInTheDocument();
  });

  it('filters volunteers by slots', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SundayVolunteersTable volunteers={mockVolunteers} />);

    const searchInput = screen.getByPlaceholderText('Search volunteers or slots...');
    await user.type(searchInput, '9:00 AM');

    expect(screen.getByText('Test Alice Smith')).toBeInTheDocument();
    expect(screen.queryByText('Test Bob Jones')).not.toBeInTheDocument();
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

  it('renders mobile cards when in mobile viewport', () => {
    vi.mocked(useIsMobileViewport).mockReturnValue(true);
    renderWithProviders(<SundayVolunteersTable volunteers={mockVolunteers} />);

    expect(screen.getByText('Test Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Test Bob Jones')).toBeInTheDocument();
    expect(screen.getAllByText('Push Status').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Email Status').length).toBeGreaterThan(0);
  });
});
