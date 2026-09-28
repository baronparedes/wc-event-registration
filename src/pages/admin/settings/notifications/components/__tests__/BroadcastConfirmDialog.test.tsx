import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BroadcastConfirmDialog, type BroadcastPreviewValues } from '../BroadcastConfirmDialog';

describe('BroadcastConfirmDialog', () => {
  let queryClient: QueryClient;

  const defaultValues: BroadcastPreviewValues = {
    title: 'Sunday Service Update',
    message: 'Service starts at 10:00 AM.',
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

  it('renders mass broadcast warning when targetType is "all"', () => {
    renderDialog({
      isOpen: true,
      onClose: vi.fn(),
      onConfirm: vi.fn(),
      isPending: false,
      values: defaultValues,
    });

    expect(screen.getByText('Confirm Broadcast')).toBeInTheDocument();
    expect(screen.getByText('Mass Broadcast')).toBeInTheDocument();
    expect(screen.getByText('All Registered Users')).toBeInTheDocument();
    expect(screen.getByText('Sunday Service Update')).toBeInTheDocument();
    expect(screen.getByText('Service starts at 10:00 AM.')).toBeInTheDocument();
    expect(screen.getByText('/profile')).toBeInTheDocument();
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
        name: 'Cecile Vitalicio',
        email: 'cesvitalicio23@gmail.com',
        avatar_object_key: null,
        has_member_profile: true,
        created_at: '2026-01-01T00:00:00Z',
        last_sign_in_at: null,
      },
    });

    expect(screen.getByText('Cecile Vitalicio')).toBeInTheDocument();
    expect(screen.getByText('cesvitalicio23@gmail.com')).toBeInTheDocument();
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
