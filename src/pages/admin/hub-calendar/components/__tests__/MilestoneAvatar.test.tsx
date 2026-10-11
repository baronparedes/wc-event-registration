import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MilestoneAvatar } from '../MilestoneAvatar';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: vi.fn(() => ({ data: null })),
}));

describe('MilestoneAvatar', () => {
  it('renders avatar with birthday cake badge', () => {
    render(<MilestoneAvatar name="Test Bravo" type="birthday" size="sm" />);

    expect(screen.getByText('TB')).toBeInTheDocument();
    expect(screen.getByTitle('Birthday')).toBeInTheDocument();
  });

  it('renders avatar with wedding anniversary heart badge in md size', () => {
    render(<MilestoneAvatar name="Sample Charlie" type="wedding_anniversary" size="md" />);

    expect(screen.getByText('SC')).toBeInTheDocument();
    expect(screen.getByTitle('Wedding Anniversary')).toBeInTheDocument();
  });

  it('supports custom className and lg size', () => {
    render(
      <MilestoneAvatar name="Test Alpha" type="birthday" size="lg" className="test-avatar-class" />,
    );

    expect(screen.getByText('TA')).toBeInTheDocument();
  });

  it('renders single excused badge at default lower-right position', () => {
    render(<MilestoneAvatar name="Excused Only" excused size="md" />);

    const excusedBadge = screen.getByTitle('Excused');
    expect(excusedBadge).toBeInTheDocument();
    expect(excusedBadge).toHaveClass('bottom-0', 'right-0');
  });

  it('renders two badges at lower-right and bottom positions when milestone and excused are present', () => {
    render(<MilestoneAvatar name="Birthday Excused" type="birthday" excused size="md" />);

    const birthdayBadge = screen.getByTitle('Birthday');
    const excusedBadge = screen.getByTitle('Excused');

    expect(birthdayBadge).toBeInTheDocument();
    expect(excusedBadge).toBeInTheDocument();

    // 1st badge at lower-right
    expect(birthdayBadge).toHaveClass('bottom-0', 'right-0');
    // 2nd badge at bottom center
    expect(excusedBadge).toHaveClass('bottom-0', 'left-1/2', '-translate-x-1/2');
  });

  it('renders two milestone badges at lower-right and bottom positions', () => {
    render(
      <MilestoneAvatar
        name="Double Milestone"
        types={['birthday', 'wedding_anniversary']}
        size="md"
      />,
    );

    const birthdayBadge = screen.getByTitle('Birthday');
    const anniversaryBadge = screen.getByTitle('Wedding Anniversary');

    expect(birthdayBadge).toBeInTheDocument();
    expect(anniversaryBadge).toBeInTheDocument();

    expect(birthdayBadge).toHaveClass('bottom-0', 'right-0');
    expect(anniversaryBadge).toHaveClass('bottom-0', 'left-1/2', '-translate-x-1/2');
  });

  it('renders all three badges at lower-right, bottom, and lower-left positions', () => {
    render(
      <MilestoneAvatar
        name="Triple Badge"
        types={['birthday', 'wedding_anniversary']}
        excused
        size="md"
      />,
    );

    const birthdayBadge = screen.getByTitle('Birthday');
    const anniversaryBadge = screen.getByTitle('Wedding Anniversary');
    const excusedBadge = screen.getByTitle('Excused');

    expect(birthdayBadge).toBeInTheDocument();
    expect(anniversaryBadge).toBeInTheDocument();
    expect(excusedBadge).toBeInTheDocument();

    // 1st badge: lower-right
    expect(birthdayBadge).toHaveClass('bottom-0', 'right-0');
    // 2nd badge: bottom
    expect(anniversaryBadge).toHaveClass('bottom-0', 'left-1/2', '-translate-x-1/2');
    // 3rd badge: lower-left
    expect(excusedBadge).toHaveClass('bottom-0', 'left-0');
  });
});
