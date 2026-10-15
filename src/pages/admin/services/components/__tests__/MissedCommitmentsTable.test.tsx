import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MissedCommitmentsTable } from '../MissedCommitmentsTable';
import type { GroupedVolunteer } from '../types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function renderWithClient(ui: React.ReactElement) {
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const sampleVolunteers: GroupedVolunteer[] = [
  {
    user_id: 'user-1',
    member_id: 'MEM-001',
    full_name: 'Test Volunteer One',
    nickname: 'Test One',
    phone: '09171234567',
    avatar_object_key: null,
    category: 'Adult',
    roles: ['Usher'],
    commitments: [
      {
        service_date: '2026-03-15',
        time_slot: '9AM',
        status: 'absent',
        role: 'Usher',
      },
    ],
    totalAbsent: 1,
    totalExcused: 0,
  },
  {
    user_id: 'user-2',
    member_id: 'MEM-002',
    full_name: 'Test Volunteer Two',
    nickname: null,
    phone: null,
    avatar_object_key: null,
    category: null,
    roles: ['Prayer Coach', 'Backroom Support'],
    commitments: [
      {
        service_date: '2026-03-15',
        time_slot: '9AM',
        status: 'absent',
        role: 'Prayer Coach',
      },
      {
        service_date: '2026-03-15',
        time_slot: '12NN',
        status: 'excused',
        role: 'Backroom Support',
      },
    ],
    totalAbsent: 1,
    totalExcused: 1,
  },
];

describe('MissedCommitmentsTable', () => {
  it('renders table headers and volunteer rows', () => {
    renderWithClient(<MissedCommitmentsTable volunteers={sampleVolunteers} filterMode="sunday" />);

    expect(screen.getByRole('columnheader', { name: 'Volunteer' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Missed Commitments' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Contact Number' })).toBeInTheDocument();

    // Volunteer 1
    expect(screen.getByText('Test Volunteer One')).toBeInTheDocument();
    expect(screen.getByText('(Test One)')).toBeInTheDocument();
    expect(screen.getByText(/MEM-001/)).toBeInTheDocument();
    expect(screen.getByText('09171234567')).toBeInTheDocument();

    // Volunteer 2 with 2 slots and multiplier
    expect(screen.getByText('Test Volunteer Two')).toBeInTheDocument();
    expect(screen.getByText('2×')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    expect(screen.getByText('Backroom Support')).toBeInTheDocument();
  });

  it('renders date prefixes in month view mode', () => {
    renderWithClient(<MissedCommitmentsTable volunteers={sampleVolunteers} filterMode="month" />);

    expect(screen.getAllByText(/Mar 15 • 9AM/).length).toBeGreaterThanOrEqual(1);
  });
});
