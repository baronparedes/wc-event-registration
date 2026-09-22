import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AuthUserItem } from '@/hooks/domain/auth';

import { MobileAuthUserCard } from '../MobileAuthUserCard';

describe('MobileAuthUserCard', () => {
  const mockUser: AuthUserItem = {
    id: 'auth-123',
    email: 'test@example.com',
    name: 'Test User',
    created_at: '2024-01-01T00:00:00Z',
    last_sign_in_at: '2024-01-02T00:00:00Z',
    has_member_profile: true,
    avatar_object_key: null,
  };

  const onSelect = vi.fn();

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

  it('renders correctly', () => {
    render(
      <MobileAuthUserCard
        user={mockUser}
        isAssigned={false}
        isSelected={false}
        onSelect={onSelect}
      />,
      { wrapper },
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('auth-123')).toBeInTheDocument();
  });

  it('shows assigned badge when isAssigned is true', () => {
    render(
      <MobileAuthUserCard
        user={mockUser}
        isAssigned={true}
        isSelected={false}
        onSelect={onSelect}
      />,
      { wrapper },
    );

    expect(screen.getByText('Assigned')).toBeInTheDocument();
  });

  it('triggers onSelect when clicked', () => {
    render(
      <MobileAuthUserCard
        user={mockUser}
        isAssigned={false}
        isSelected={false}
        onSelect={onSelect}
      />,
      { wrapper },
    );

    fireEvent.click(screen.getByRole('option'));
    expect(onSelect).toHaveBeenCalledWith(mockUser);
  });

  it('triggers onSelect when enter is pressed', () => {
    render(
      <MobileAuthUserCard
        user={mockUser}
        isAssigned={false}
        isSelected={false}
        onSelect={onSelect}
      />,
      { wrapper },
    );

    fireEvent.keyDown(screen.getByRole('option'), { key: 'Enter', code: 'Enter', charCode: 13 });
    expect(onSelect).toHaveBeenCalledWith(mockUser);
  });
});