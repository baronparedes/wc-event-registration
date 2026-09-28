import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminRoleAssignment } from '@/hooks/domain/auth';

import { MobileRoleCard } from '../MobileRoleCard';

describe('MobileRoleCard', () => {
  const mockAssignment: AdminRoleAssignment = {
    id: '123',
    email: 'test@example.com',
    name: 'Test User',
    auth_user_id: 'auth-123',
    role: 'admin',
    created_at: '2024-01-01T00:00:00Z',
    has_member_profile: true,
    avatar_object_key: null,
  };

  const onEdit = vi.fn();
  const onRevoke = vi.fn();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders correctly for normal role', () => {
    render(<MobileRoleCard assignment={mockAssignment} onEdit={onEdit} onRevoke={onRevoke} />, {
      wrapper,
    });

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('auth-123')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revoke/i })).toBeInTheDocument();
  });

  it('triggers callbacks when buttons are clicked', () => {
    render(<MobileRoleCard assignment={mockAssignment} onEdit={onEdit} onRevoke={onRevoke} />, {
      wrapper,
    });

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
    expect(onEdit).toHaveBeenCalledWith(mockAssignment);

    fireEvent.click(screen.getByRole('button', { name: /Revoke/i }));
    expect(onRevoke).toHaveBeenCalledWith(mockAssignment);
  });

  it('renders correctly for super_admin role', () => {
    const superAdminAssignment = { ...mockAssignment, role: 'super_admin' as const };
    render(
      <MobileRoleCard assignment={superAdminAssignment} onEdit={onEdit} onRevoke={onRevoke} />,
      { wrapper },
    );

    expect(screen.getByText('Protected Role')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revoke/i })).not.toBeInTheDocument();
  });
});
