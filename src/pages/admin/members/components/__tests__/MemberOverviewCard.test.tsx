import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';

import { MemberOverviewCard } from '../MemberOverviewCard';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: () => ({ data: null }),
}));

const member = makeAdminMember({
  full_name: 'Aaron Carter',
  nickname: 'Aaron',
  last_name: 'Carter',
  member_id: '1627343318',
  role: 'OIC',
  category: 'Men',
  email: 'aaron@example.com',
  date_of_birth: '2026-04-28',
  last_activity: '2024-01-01T12:00:00Z',
});

describe('MemberOverviewCard', () => {
  it('renders member profile details correctly', () => {
    render(<MemberOverviewCard member={member} />);

    const avatar = screen.getByTitle('Aaron Carter');
    expect(avatar).toHaveClass('w-48', 'h-48', 'self-center', 'sm:self-start');
    expect(avatar.parentElement).toHaveClass('flex', 'flex-col', 'sm:flex-row');
    expect(screen.getByText('Full Name').closest('dl')).toHaveClass('grid-cols-2');
    expect(screen.getByText('Aaron Carter')).toBeInTheDocument();
    expect(screen.getByText('1627343318')).toBeInTheDocument();
    expect(screen.getByText('OIC')).toBeInTheDocument();
    expect(screen.getByText('Men')).toBeInTheDocument();
    expect(screen.getByText('aaron@example.com')).toBeInTheDocument();
    expect(screen.getByText('Apr 28, 2026')).toBeInTheDocument();
  });

  it('renders last activity badge when last_activity is present', () => {
    render(<MemberOverviewCard member={member} />);
    expect(screen.getByText(/Last Activity:/i)).toBeInTheDocument();
  });

  it('hides last activity badge when hideLastActivityBadge is true', () => {
    render(<MemberOverviewCard member={member} hideLastActivityBadge />);
    expect(screen.queryByText(/Last Activity:/i)).not.toBeInTheDocument();
  });
});
