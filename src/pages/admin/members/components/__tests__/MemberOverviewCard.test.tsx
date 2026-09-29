import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { makeAdminMember } from '@/__tests__/factories';

import { MemberOverviewCard } from '../MemberOverviewCard';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: () => ({ data: null }),
}));

const email = faker.internet.exampleEmail();
const member = makeAdminMember({
  nickname: faker.person.firstName(),
  email,
  role: 'OIC',
  category: 'Men',
  date_of_birth: '2026-04-28',
  last_activity: '2024-01-01T12:00:00Z',
  has_account: true,
});

describe('MemberOverviewCard', () => {
  it('renders member profile details correctly', () => {
    render(<MemberOverviewCard member={member} />);

    const avatar = screen.getByTitle(`${member.nickname} ${member.last_name}`);
    expect(avatar).toHaveClass('w-48', 'h-48', 'self-center', 'sm:self-start');
    expect(avatar.parentElement).toHaveClass('flex', 'flex-col', 'sm:flex-row');
    expect(screen.getByText('Full Name').closest('dl')).toHaveClass('grid-cols-2');
    expect(screen.getByText(member.full_name)).toBeInTheDocument();
    expect(screen.getByText(member.member_id)).toBeInTheDocument();
    expect(screen.getByText('OIC')).toBeInTheDocument();
    expect(screen.getByText('Men')).toBeInTheDocument();
    expect(screen.getByText(email)).toBeInTheDocument();
    expect(screen.getByText('Apr 28, 2026')).toBeInTheDocument();
    expect(screen.getByLabelText('Verified account')).toBeInTheDocument();
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
