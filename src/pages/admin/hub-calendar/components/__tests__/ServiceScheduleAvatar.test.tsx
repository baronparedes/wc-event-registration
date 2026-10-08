import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CONFIDENCE_THRESHOLDS } from '@/lib/domain/hub-calendar';

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

  describe('turnupRate and confidence ring indicators', () => {
    it(`applies emerald success ring when turnup rate >= ${CONFIDENCE_THRESHOLDS.SOLID} (Solid)`, () => {
      render(
        <ServiceScheduleAvatar
          name="Solid Volunteer"
          turnupRate={CONFIDENCE_THRESHOLDS.SOLID + 0.02}
          size="sm"
        />,
      );
      const avatarEl = screen.getByTitle('Solid Volunteer');
      expect(avatarEl).toHaveClass('ring-emerald-500');
    });

    it(`applies accent amber ring when turnup rate is between ${CONFIDENCE_THRESHOLDS.MODERATE} and ${CONFIDENCE_THRESHOLDS.SOLID - 0.01} (Moderate)`, () => {
      render(
        <ServiceScheduleAvatar
          name="Moderate Volunteer"
          turnupRate={CONFIDENCE_THRESHOLDS.MODERATE + 0.06}
          size="sm"
        />,
      );
      const avatarEl = screen.getByTitle('Moderate Volunteer');
      expect(avatarEl).toHaveClass('ring-accent');
    });

    it(`applies destructive red ring when turnup rate is < ${CONFIDENCE_THRESHOLDS.MODERATE} (At Risk)`, () => {
      render(
        <ServiceScheduleAvatar
          name="At Risk Volunteer"
          turnupRate={CONFIDENCE_THRESHOLDS.MODERATE - 0.05}
          size="sm"
        />,
      );
      const avatarEl = screen.getByTitle('At Risk Volunteer');
      expect(avatarEl).toHaveClass('ring-red-600');
    });

    it('applies no ring when turnupRate is undefined and border is none', () => {
      render(<ServiceScheduleAvatar name="No Score" size="sm" />);
      const avatarEl = screen.getByTitle('No Score');
      expect(avatarEl).not.toHaveClass('ring-2');
    });

    it('allows explicit border override', () => {
      render(
        <ServiceScheduleAvatar
          name="Explicit Border"
          turnupRate={0.9}
          border="secondary"
          size="sm"
        />,
      );
      const avatarEl = screen.getByTitle('Explicit Border');
      expect(avatarEl).toHaveClass('ring-secondary');
    });

    it('renders custom tooltip on avatar wrapper', () => {
      render(
        <ServiceScheduleAvatar
          name="Tooltip Member"
          turnupRate={0.5}
          tooltip="Moderate (50% turnup): Attended 4 of 8 scheduled commitments"
          size="sm"
        />,
      );
      expect(
        screen.getByTitle('Moderate (50% turnup): Attended 4 of 8 scheduled commitments'),
      ).toBeInTheDocument();
    });
  });
});
