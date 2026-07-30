import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MemberIdentityPanel } from '../MemberIdentityPanel';

vi.mock('@/components/ui/Avatar', () => ({
  Avatar: ({ name }: { name: string }) => <div aria-label={name} />,
}));

const baseProfile = {
  member_id: 'WC-001',
  role: 'usher',
  first_name: 'Jane',
  last_initial: 'D',
};

describe('MemberIdentityPanel', () => {
  it('renders only confirmation identity fields', () => {
    render(<MemberIdentityPanel matchedMember={baseProfile} />);

    expect(screen.getByText('First name')).toBeInTheDocument();
    expect(screen.getByText('Last initial')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();

    expect(screen.getByText('Jane')).toBeInTheDocument();
    expect(screen.getByText('D')).toBeInTheDocument();
    expect(screen.getByText('usher')).toBeInTheDocument();
  });

  it('falls back to Not set for missing name parts', () => {
    render(
      <MemberIdentityPanel
        matchedMember={{
          ...baseProfile,
          first_name: null,
          last_initial: null,
        }}
      />,
    );

    expect(screen.getAllByText('Not set')).toHaveLength(2);
  });
});
