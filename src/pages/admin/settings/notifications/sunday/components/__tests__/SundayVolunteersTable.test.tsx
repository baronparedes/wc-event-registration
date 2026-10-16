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

  it('renders excused badge and suppressed delivery status for fully excused volunteer', () => {
    const excusedVolunteers: SundayVolunteerRecipient[] = [
      {
        user_id: '3',
        member_id: 'MEM-003',
        full_name: 'Test Charlie Excused',
        email: 'test.charlie@example.com',
        formatted_slots: '9:00 AM (Excused)',
        has_push: true,
        has_email: true,
        excuse_status: 'full',
      },
    ];

    renderWithProviders(<SundayVolunteersTable volunteers={excusedVolunteers} />);

    expect(screen.getByText('Test Charlie Excused')).toBeInTheDocument();
    expect(screen.getAllByText('Excused').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Suppressed')).toHaveLength(2);
  });

  it('renders partially excused badge for partially excused volunteer', () => {
    const partialVolunteers: SundayVolunteerRecipient[] = [
      {
        user_id: '4',
        member_id: 'MEM-004',
        full_name: 'Test Dana Partial',
        email: 'test.dana@example.com',
        formatted_slots: '9:00 AM, 12:00 NN (Excused) and 3:00 PM',
        has_push: true,
        has_email: true,
        excuse_status: 'partial',
      },
    ];

    renderWithProviders(<SundayVolunteersTable volunteers={partialVolunteers} />);

    expect(screen.getByText('Test Dana Partial')).toBeInTheDocument();
    expect(screen.getByText('Partially Excused')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM')).toBeInTheDocument();
    expect(screen.getByText('12:00 NN')).toBeInTheDocument();
    expect(screen.getByText('3:00 PM')).toBeInTheDocument();
    expect(screen.getByText('Subscribed')).toBeInTheDocument();
    expect(screen.getByText('Reachable')).toBeInTheDocument();
  });

  it('filters volunteers by excuse status search query', async () => {
    const user = userEvent.setup();
    const mixedVolunteers: SundayVolunteerRecipient[] = [
      {
        user_id: '1',
        member_id: 'MEM-001',
        full_name: 'Test Regular Volunteer',
        email: 'reg@example.com',
        formatted_slots: '9:00 AM',
        has_push: true,
        has_email: true,
        excuse_status: 'none',
      },
      {
        user_id: '2',
        member_id: 'MEM-002',
        full_name: 'Test Excused Volunteer',
        email: 'excused@example.com',
        formatted_slots: '12:00 NN (Excused)',
        has_push: true,
        has_email: true,
        excuse_status: 'full',
      },
    ];

    renderWithProviders(<SundayVolunteersTable volunteers={mixedVolunteers} />);

    const searchInput = screen.getByPlaceholderText('Search volunteers or slots...');
    await user.type(searchInput, 'excused');

    expect(screen.getByText('Test Excused Volunteer')).toBeInTheDocument();
    expect(screen.queryByText('Test Regular Volunteer')).not.toBeInTheDocument();
  });
});
