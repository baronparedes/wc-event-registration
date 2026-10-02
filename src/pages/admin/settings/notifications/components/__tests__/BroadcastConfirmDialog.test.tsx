import { faker } from '@faker-js/faker';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BroadcastConfirmDialog, type BroadcastPreviewValues } from '../BroadcastConfirmDialog';

describe('BroadcastConfirmDialog', () => {
  let queryClient: QueryClient;

  const defaultValues: BroadcastPreviewValues = {
    title: 'Sunday Service Update',
    message: 'Service starts at 10:00 AM.',
    channels: ['push', 'email'],
    targetType: 'all',
    destinationUrl: '/profile',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderDialog = (props: React.ComponentProps<typeof BroadcastConfirmDialog>) =>
    render(
      <QueryClientProvider client={queryClient}>
        <BroadcastConfirmDialog {...props} />
      </QueryClientProvider>,
    );

  it('renders nothing when isOpen is false or values is null', () => {
    const { container, rerender } = renderDialog({
      isOpen: false,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: false,
      values: defaultValues,
    });

    expect(container.firstChild).toBeNull();

    rerender(
      <QueryClientProvider client={queryClient}>
        <BroadcastConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          isPending={false}
          values={null}
        />
      </QueryClientProvider>,
    );

    expect(container.firstChild).toBeNull();
  });

  it('renders delivery channel badges and mass broadcast warning when targetType is "all"', () => {
    renderDialog({
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: false,
      values: defaultValues,
    });

    expect(screen.getByText('Confirm Broadcast')).toBeInTheDocument();
    expect(screen.getByText('Delivery Channels')).toBeInTheDocument();
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Mass Broadcast')).toBeInTheDocument();
    expect(screen.getByText('Registered Members')).toBeInTheDocument();
    expect(screen.getByText('Sunday Service Update')).toBeInTheDocument();
    expect(screen.getByText('Service starts at 10:00 AM.')).toBeInTheDocument();
    expect(screen.getByText('/profile')).toBeInTheDocument();
  });

  it('renders target event and audience stats when targetType is "event"', () => {
    renderDialog({
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: false,
      values: {
        ...defaultValues,
        targetType: 'event',
        targetEventId: 'event-uuid-1234',
      },
      targetEvent: {
        id: 'event-uuid-1234',
        title: 'Youth Camp 2026',
        slug: 'youth-camp-2026',
        status: 'published',
        duplicate_policy: 'block',
        require_id_lookup: false,
        registration_mode: 'open',
        allow_public_registrations: true,
        metadata: {},
        created_by_admin_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
        description: 'Annual youth camp',
        location: 'Camp Venue',
        starts_at: '2026-10-10T09:00:00Z',
        ends_at: '2026-10-12T17:00:00Z',
        registration_opens_at: null,
        registration_closes_at: null,
      },
      audienceStats: {
        total_recipients: 50,
        email_recipients_count: 48,
        push_recipients_count: 32,
        registered_members_count: 35,
        public_registrants_count: 15,
      },
    });

    expect(screen.getByText('Event Attendees')).toBeInTheDocument();
    expect(screen.getByText('Youth Camp 2026')).toBeInTheDocument();
    expect(
      screen.getByText(/50 attendees detected \(35 members, 15 guests\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText('48 / 50')).toBeInTheDocument();
    expect(screen.getByText('32 devices')).toBeInTheDocument();
  });

  it('renders role pills when targetType is "role"', () => {
    renderDialog({
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: false,
      values: {
        ...defaultValues,
        targetType: 'role',
        targetRoles: ['admin', 'Prayer Coach'],
      },
    });

    expect(screen.getByText('Selected Roles (2):')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
  });

  it('renders target user avatar, name, email, and member badge when targetType is "user"', () => {
    const targetName = faker.person.fullName();
    const targetEmail = faker.internet.exampleEmail();
    renderDialog({
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: false,
      values: {
        ...defaultValues,
        targetType: 'user',
        targetUserId: 'user-uuid-1234',
      },
      targetUser: {
        id: 'user-uuid-1234',
        name: targetName,
        email: targetEmail,
        avatar_object_key: null,
        has_member_profile: true,
        created_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: null,
      },
    });

    expect(screen.getByText(targetName)).toBeInTheDocument();
    expect(screen.getByText(targetEmail)).toBeInTheDocument();
    expect(screen.getByText('Member')).toBeInTheDocument();
  });

  it('renders fallback user details when targetUser object is not provided', () => {
    renderDialog({
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: false,
      values: {
        ...defaultValues,
        targetType: 'user',
        targetUserId: 'raw-user-uuid-9999',
      },
    });

    expect(screen.getByText('Target User')).toBeInTheDocument();
    expect(screen.getByText('raw-user-uuid-9999')).toBeInTheDocument();
  });

  it('omits destination URL row when destinationUrl is not provided', () => {
    renderDialog({
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: false,
      values: {
        title: 'Simple Broadcast',
        message: 'No link attached',
        targetType: 'all',
      },
    });

    expect(screen.getByText('Simple Broadcast')).toBeInTheDocument();
    expect(screen.getByText('No link attached')).toBeInTheDocument();
    expect(screen.queryByText('/profile')).not.toBeInTheDocument();
  });

  it('handles onClose and onConfirm callbacks', () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    renderDialog({
      isOpen: true,
      onClose: handleClose,
      onConfirm: handleConfirm,
      isPending: false,
      values: defaultValues,
    });

    fireEvent.click(screen.getByRole('button', { name: /Back to Edit/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Confirm & Send/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('displays loading state and disables actions when isPending is true', () => {
    renderDialog({
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: true,
      values: defaultValues,
    });

    expect(screen.getByText('Broadcasting...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Back to Edit/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Broadcasting.../i })).toBeDisabled();
  });
});
