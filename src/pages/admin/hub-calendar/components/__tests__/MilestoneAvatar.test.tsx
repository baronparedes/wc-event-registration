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
});
