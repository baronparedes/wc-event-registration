import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';

import { MemberOverviewCard } from '../MemberOverviewCard';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: () => ({ data: null }),
}));

const member = makeAdminMember({
  full_name: 'Aaron Atienza',
  nickname: 'Aaron',
  last_name: 'Atienza',
  member_id: '1627343318',
  role: 'OIC',
  category: 'Men',
  email: 'aaron@example.com',
  date_of_birth: '2026-04-28',
});

describe('MemberOverviewCard', () => {
  it('renders member profile details correctly', () => {
    render(<MemberOverviewCard member={member} />);

    expect(screen.getByText('Aaron Atienza')).toBeInTheDocument();
    expect(screen.getByText('1627343318')).toBeInTheDocument();
    expect(screen.getByText('OIC')).toBeInTheDocument();
    expect(screen.getByText('Men')).toBeInTheDocument();
    expect(screen.getByText('aaron@example.com')).toBeInTheDocument();
    expect(screen.getByText('Apr 28, 2026')).toBeInTheDocument();
  });
});
