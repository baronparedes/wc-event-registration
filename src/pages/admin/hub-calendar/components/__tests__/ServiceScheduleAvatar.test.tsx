import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ServiceScheduleAvatar } from '../ServiceScheduleAvatar';

vi.mock('@/hooks/domain/members', () => ({
  useMemberAvatarQuery: vi.fn(() => ({ data: null })),
}));

describe('ServiceScheduleAvatar', () => {
  it('renders standard avatar without excused badge when excused is false', () => {
    render(<ServiceScheduleAvatar name="Test Member" excused={false} size="sm" />);

    expect(screen.getByText('TM')).toBeInTheDocument();
    expect(screen.queryByTitle('Excused')).not.toBeInTheDocument();
  });

  it('renders excused badge when excused is true (sm size)', () => {
    render(<ServiceScheduleAvatar name="Sample Member" excused size="sm" />);

    expect(screen.getByText('SM')).toBeInTheDocument();
    expect(screen.getByTitle('Excused')).toBeInTheDocument();
  });

  it('renders excused badge with md and lg size classes', () => {
    const { rerender } = render(<ServiceScheduleAvatar name="Test Alpha" excused size="md" />);
    expect(screen.getByTitle('Excused')).toBeInTheDocument();

    rerender(<ServiceScheduleAvatar name="Test Alpha" excused size="lg" />);
    expect(screen.getByTitle('Excused')).toBeInTheDocument();
  });

  it('applies custom className correctly', () => {
    const { container } = render(
      <ServiceScheduleAvatar name="Test Bravo" excused className="custom-schedule-avatar" />,
    );

    expect(container.querySelector('.custom-schedule-avatar')).toBeInTheDocument();
  });

  describe('attendanceScore and ring indicators', () => {
    it('applies primary ring when attendance score >= 5', () => {
      render(<ServiceScheduleAvatar name="High Scorer" attendanceScore={8.5} size="sm" />);
      const avatarEl = screen.getByTitle('High Scorer');
      expect(avatarEl).toHaveClass('ring-primary');
    });

    it('applies accent ring when attendance score is between 0 and 4.5', () => {
      render(<ServiceScheduleAvatar name="Mid Scorer" attendanceScore={3.5} size="sm" />);
      const avatarEl = screen.getByTitle('Mid Scorer');
      expect(avatarEl).toHaveClass('ring-accent');
    });

    it('applies destructive ring when attendance score is negative (< 0)', () => {
      render(<ServiceScheduleAvatar name="Negative Scorer" attendanceScore={-1.5} size="sm" />);
      const avatarEl = screen.getByTitle('Negative Scorer');
      expect(avatarEl).toHaveClass('ring-red-600');
    });

    it('applies no ring when attendanceScore is undefined and border is none', () => {
      render(<ServiceScheduleAvatar name="No Score" size="sm" />);
      const avatarEl = screen.getByTitle('No Score');
      expect(avatarEl).not.toHaveClass('ring-2');
    });

    it('allows explicit border override', () => {
      render(
        <ServiceScheduleAvatar
          name="Explicit Border"
          attendanceScore={10}
          border="secondary"
          size="sm"
        />,
      );
      const avatarEl = screen.getByTitle('Explicit Border');
      expect(avatarEl).toHaveClass('ring-secondary');
    });
  });
});
