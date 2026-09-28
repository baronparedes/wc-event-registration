import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';

import { MobileMemberHeader } from '../MobileMemberHeader';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
}));

const mockMember = makeAdminMember({
  id: 'user-1',
  member_id: 'WC-001',
  is_active: true,
  nickname: faker.person.firstName(),
  phone: '+1234567890',
  role: 'Leader',
  category: 'Regular',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  extra_metadata: {},
  date_of_birth: null,
  avatar_object_key: null,
  last_activity: undefined,
});

describe('MobileMemberHeader', () => {
  it('renders member header with avatar name, full name, nickname, role, and active status', () => {
    render(<MobileMemberHeader member={mockMember} />);

    expect(screen.getByTestId('avatar')).toHaveTextContent(
      `${mockMember.nickname} ${mockMember.last_name}`,
    );
    expect(screen.getByText(mockMember.full_name)).toBeInTheDocument();
    expect(screen.getByText(`(${mockMember.nickname})`)).toBeInTheDocument();
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

    expect(screen.getByTestId('avatar')).toHaveTextContent(mockMember.full_name);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
