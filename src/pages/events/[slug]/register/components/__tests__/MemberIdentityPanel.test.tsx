import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MemberIdentityPanel } from '../MemberIdentityPanel';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div aria-label={name} />,
}));

const baseProfile = {
  user_id: 'user-1',
  member_id: 'WC-001',
  role: 'usher',
  category: 'regular',
  full_name: 'Jane Doe',
  nickname: 'Janie',
  first_name: 'Jane',
  last_name: 'Doe',
};

describe('MemberIdentityPanel', () => {
  it('renders all member fields in the panel', () => {
    render(<MemberIdentityPanel matchedMember={baseProfile} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Member ID')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Nickname')).toBeInTheDocument();
    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getByText('Last name')).toBeInTheDocument();

    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('WC-001')).toBeInTheDocument();
    expect(screen.getByText('usher')).toBeInTheDocument();
    expect(screen.getByText('regular')).toBeInTheDocument();
    expect(screen.getByText('Janie')).toBeInTheDocument();
    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('Doe')).toBeInTheDocument();
  });

  it('falls back to Not set for missing optional values', () => {
    render(
      <MemberIdentityPanel
        matchedMember={{
          ...baseProfile,
          nickname: null,
          first_name: null,
          last_name: null,
        }}
      />,
    );

    expect(screen.getAllByText('Not set')).toHaveLength(3);
  });
});
