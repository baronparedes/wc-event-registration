import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SundayVolunteerRecipient } from '@/lib/domain/notifications';

import { SundayVolunteerMobileCard } from '../SundayVolunteerMobileCard';

const mockVolunteer: SundayVolunteerRecipient = {
  user_id: 'vol-1',
  member_id: 'MEM-101',
  full_name: 'Test Adolf Edison Uy',
  email: 'test.adolf@example.com',
  formatted_slots: '9:00 AM, 11:00 AM',
  has_push: true,
  has_email: true,
};

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('SundayVolunteerMobileCard', () => {
  it('renders volunteer name, member ID, slots, email, and active statuses', () => {
    renderWithProviders(<SundayVolunteerMobileCard volunteer={mockVolunteer} />);

    expect(screen.getByText('Test Adolf Edison Uy')).toBeInTheDocument();
    expect(screen.getByText('MEM-101')).toBeInTheDocument();
    expect(screen.getByText('9:00 AM, 11:00 AM')).toBeInTheDocument();
    expect(screen.getByText('test.adolf@example.com')).toBeInTheDocument();
    expect(screen.getByText('Subscribed')).toBeInTheDocument();
    expect(screen.getByText('Reachable')).toBeInTheDocument();
  });

  it('renders fallback statuses when push is not subscribed and email is missing', () => {
    const unreachedVolunteer: SundayVolunteerRecipient = {
      user_id: 'vol-2',
      member_id: null,
      full_name: 'Test Jane Doe',
      email: null,
      formatted_slots: '11:00 AM',
      has_push: false,
      has_email: false,
    };

    renderWithProviders(<SundayVolunteerMobileCard volunteer={unreachedVolunteer} />);

    expect(screen.getByText('Test Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('No Device')).toBeInTheDocument();
    expect(screen.getByText('Missing Email')).toBeInTheDocument();
  });
});
