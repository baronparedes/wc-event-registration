import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';
import { usePushSubscription } from '@/hooks/domain/notifications';

import { MemberInfoTab } from '../MemberInfoTab';

vi.mock('@/hooks/domain/notifications', () => ({
  usePushSubscription: vi.fn(() => ({
    isSupported: true,
    isSubscribed: false,
    isLoading: false,
    subscribe: vi.fn(),
    subscribeAsync: vi.fn(),
    unsubscribe: vi.fn(),
    unsubscribeAsync: vi.fn(),
  })),
}));

describe('MemberInfoTab', () => {
  it('renders Personal Details and Sunday Availability', () => {
    const member = makeAdminMember({
      member_id: 'MEM-001',
      email: 'alex@example.com',
      phone: '555-1234',
      date_of_birth: '1990-05-15',
      extra_metadata: {},
    });

    render(<MemberInfoTab member={member} />);

    expect(screen.getByRole('heading', { name: 'Personal Details' })).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com').closest('div')).toHaveClass(
      'col-span-2',
      'md:col-span-1',
    );
    expect(screen.getByText('555-1234')).toBeInTheDocument();
    expect(screen.getByText('May 15, 1990')).toBeInTheDocument();

    expect(screen.getByText('Sunday Availability')).toBeInTheDocument();
  });

  it('renders Sunday Availability with slots when sunday metadata is present', () => {
    const member = makeAdminMember({
      extra_metadata: {
        first_sunday: '9AM',
        second_sunday: '12NN',
        third_sunday: '3PM',
        fourth_sunday: '9AM',
        fifth_sunday: '12NN',
      },
    });

    render(<MemberInfoTab member={member} />);

    expect(screen.getByText('Sunday Availability')).toBeInTheDocument();
  });

  it('promotes Civil Status, DGroup Leader, DGroup Status, and DGroup Member Since to Personal Details', () => {
    const member = makeAdminMember({
      extra_metadata: {
        civil_status: 'Married',
        dgroup_leader: 'Jane Smith',
        dgroup_status: 'Active',
        dgroup_member_since: '2020',
      },
    });

    render(<MemberInfoTab member={member} />);

    // Promoted under Personal Details
    expect(screen.getByText('Civil Status')).toBeInTheDocument();
    expect(screen.getByText('Married')).toBeInTheDocument();

    expect(screen.getByText('DGroup Leader')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();

    expect(screen.getByText('DGroup Status')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();

    expect(screen.getByText('DGroup Member Since')).toBeInTheDocument();
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('handles subscribing to push notifications successfully', async () => {
    const subscribeAsync = vi.fn().mockResolvedValue(true);
    vi.mocked(usePushSubscription).mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      isLoading: false,
      subscribe: vi.fn(),
      subscribeAsync,
      unsubscribe: vi.fn(),
      unsubscribeAsync: vi.fn(),
    });

    const member = makeAdminMember({
      member_id: 'MEM-001',
      extra_metadata: {},
    });

    render(<MemberInfoTab member={member} />);

    const subscribeBtn = screen.getByRole('button', { name: 'Subscribe Device' });
    expect(subscribeBtn).toBeInTheDocument();

    fireEvent.click(subscribeBtn);
    expect(subscribeAsync).toHaveBeenCalled();
  });

  it('handles unsubscribing from push notifications successfully', async () => {
    const unsubscribeAsync = vi.fn().mockResolvedValue(true);
    vi.mocked(usePushSubscription).mockReturnValue({
      isSupported: true,
      isSubscribed: true,
      isLoading: false,
      subscribe: vi.fn(),
      subscribeAsync: vi.fn(),
      unsubscribe: vi.fn(),
      unsubscribeAsync,
    });

    const member = makeAdminMember({
      member_id: 'MEM-001',
      extra_metadata: {},
    });

    render(<MemberInfoTab member={member} />);

    const unsubscribeBtn = screen.getByRole('button', { name: 'Unsubscribe Device' });
    expect(unsubscribeBtn).toBeInTheDocument();

    fireEvent.click(unsubscribeBtn);
    expect(unsubscribeAsync).toHaveBeenCalled();
  });

  it('handles subscription error with toast notification', async () => {
    const subscribeAsync = vi.fn().mockRejectedValue(new Error('Permission denied'));
    vi.mocked(usePushSubscription).mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      isLoading: false,
      subscribe: vi.fn(),
      subscribeAsync,
      unsubscribe: vi.fn(),
      unsubscribeAsync: vi.fn(),
    });

    const member = makeAdminMember({
      member_id: 'MEM-001',
      extra_metadata: {},
    });

    render(<MemberInfoTab member={member} />);

    const subscribeBtn = screen.getByRole('button', { name: 'Subscribe Device' });
    fireEvent.click(subscribeBtn);
    expect(subscribeAsync).toHaveBeenCalled();
  });

  it('shows loading state when push mutation is in progress', () => {
    vi.mocked(usePushSubscription).mockReturnValue({
      isSupported: true,
      isSubscribed: false,
      isLoading: true,
      subscribe: vi.fn(),
      subscribeAsync: vi.fn(),
      unsubscribe: vi.fn(),
      unsubscribeAsync: vi.fn(),
    });

    const member = makeAdminMember({
      member_id: 'MEM-001',
      extra_metadata: {},
    });

    render(<MemberInfoTab member={member} />);

    expect(screen.getByRole('button', { name: 'Updating...' })).toBeDisabled();
  });
});
