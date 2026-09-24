import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminMember } from '@/lib/domain/members';

import { MobileMemberHeader } from '../MobileMemberHeader';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

const mockMember: AdminMember = {
  id: 'user-1',
  member_id: 'WC-001',
  is_active: true,
  full_name: 'John Doe',
  nickname: 'Johnny',
  email: 'john@example.com',
  phone: '+1234567890',
  role: 'Leader',
  category: 'Regular',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  extra_metadata: {},
  date_of_birth: null,
  first_name: 'John',
  last_name: 'Doe',
  avatar_object_key: null,
  last_activity: undefined,
};

describe('MobileMemberHeader', () => {
  it('renders member header with avatar name, full name, nickname, role, and active status', () => {
    render(<MobileMemberHeader member={mockMember} />);

    expect(screen.getByTestId('avatar')).toHaveTextContent('Johnny Doe');
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('(Johnny)')).toBeInTheDocument();
    expect(screen.getByText('Leader • Regular')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders fallback avatar name and inactive status badge when inactive and without nickname', () => {
    render(
      <MobileMemberHeader
        member={{
          ...mockMember,
          nickname: null,
          last_name: null,
          is_active: false,
        }}
      />,
    );

    expect(screen.getByTestId('avatar')).toHaveTextContent('John Doe');
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
