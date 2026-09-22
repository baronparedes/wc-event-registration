import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import type { AdminMember } from '@/lib/domain/members';

import { MobileMemberCard } from '../MobileMemberCard';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

vi.mock('../UpdateMemberIdDialog', () => ({
  UpdateMemberIdDialog: () => <button data-testid="update-member-id-dialog">Update ID</button>,
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

describe('MobileMemberCard', () => {
  it('renders member information correctly', () => {
    render(
      <MemoryRouter>
        <MobileMemberCard member={mockMember} canWrite={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('(Johnny)')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('WC-001')).toBeInTheDocument();
    expect(screen.getByText('Leader • Regular')).toBeInTheDocument();
    expect(screen.getByText('+1234567890')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows View action when canWrite is false', () => {
    render(
      <MemoryRouter>
        <MobileMemberCard member={mockMember} canWrite={false} />
      </MemoryRouter>,
    );

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('update-member-id-dialog')).not.toBeInTheDocument();
  });

  it('shows Edit and Update ID actions when canWrite is true and member is active', () => {
    render(
      <MemoryRouter>
        <MobileMemberCard member={mockMember} canWrite={true} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.getByTestId('update-member-id-dialog')).toBeInTheDocument();
  });

  it('shows View action and hides Update ID when canWrite is true but member is inactive', () => {
    render(
      <MemoryRouter>
        <MobileMemberCard member={{ ...mockMember, is_active: false }} canWrite={true} />
      </MemoryRouter>,
    );

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('update-member-id-dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
