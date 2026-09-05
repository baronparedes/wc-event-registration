import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminMember } from '@/lib/domain/members';

import { AdminMemberMilestonesPage } from '../index';

const { mockUseAdminMembersMilestonesQuery, mockUseIsMobileViewport } = vi.hoisted(() => ({
  mockUseAdminMembersMilestonesQuery: vi.fn(),
  mockUseIsMobileViewport: vi.fn(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useAdminMembersMilestonesQuery: () => mockUseAdminMembersMilestonesQuery(),
}));

vi.mock('@/hooks/utils', () => ({
  useIsMobileViewport: () => mockUseIsMobileViewport(),
}));

const sampleMember: AdminMember = {
  id: 'm1',
  member_id: 'MEM-001',
  avatar_object_key: null,
  is_active: true,
  first_name: 'John',
  last_name: 'Doe',
  nickname: 'Johnny',
  full_name: 'John Doe',
  email: 'john@example.com',
  phone: '123-456',
  date_of_birth: '1990-05-15',
  role: 'member',
  category: 'adult',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
  extra_metadata: {
    wedding_anniversary_date: '2015-05-20',
  },
};

function renderComponent() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminMemberMilestonesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminMemberMilestonesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobileViewport.mockReturnValue(false);
  });

  it('renders loading state and error state correctly', () => {
    mockUseAdminMembersMilestonesQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: null,
    });

    renderComponent();
    expect(screen.getByText('Loading member milestones...')).toBeInTheDocument();

    mockUseAdminMembersMilestonesQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to load'),
    });

    renderComponent();
    expect(
      screen.getByText('Failed to load member milestones. Please refresh.'),
    ).toBeInTheDocument();
  });

  it('renders empty state when there are no members', () => {
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });

    renderComponent();
    expect(screen.getByText('No active members')).toBeInTheDocument();
  });

  it('renders milestones, handles month navigation and today button in desktop view', () => {
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [sampleMember],
      isLoading: false,
      error: null,
    });

    renderComponent();

    expect(screen.getByText('Member Milestones')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument();

    const prevButton = screen.getByRole('button', { name: 'Previous month' });
    fireEvent.click(prevButton);

    const todayButton = screen.getByRole('button', { name: 'Today' });
    fireEvent.click(todayButton);

    const nextButton = screen.getByRole('button', { name: 'Next month' });
    fireEvent.click(nextButton);
  });

  it('renders mobile viewport with week options and handles week selection', () => {
    mockUseIsMobileViewport.mockReturnValue(true);
    mockUseAdminMembersMilestonesQuery.mockReturnValue({
      data: [sampleMember],
      isLoading: false,
      error: null,
    });

    renderComponent();

    const week1Btn = screen.getByRole('button', { name: /Week 1|W1/i });
    fireEvent.click(week1Btn);
    expect(week1Btn).toBeInTheDocument();
  });
});
