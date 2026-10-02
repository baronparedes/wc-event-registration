import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBroadcastAudienceStatsQuery } from '@/hooks/domain/notifications';

import { BroadcastAudienceStatsCard } from '../BroadcastAudienceStatsCard';

vi.mock('@/hooks/domain/notifications', () => ({
  useBroadcastAudienceStatsQuery: vi.fn(),
}));

describe('BroadcastAudienceStatsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders audience breakdown stats for event targeting', () => {
    vi.mocked(useBroadcastAudienceStatsQuery).mockReturnValue({
      data: {
        total_recipients: 50,
        email_recipients_count: 45,
        push_recipients_count: 28,
        registered_members_count: 35,
        public_registrants_count: 15,
      },
      isLoading: false,
      isError: false,
    } as never);

    render(
      <BroadcastAudienceStatsCard
        channels={['push', 'email']}
        targetType="event"
        targetEventId="event-123"
      />,
    );

    expect(screen.getByText('Audience Delivery Analysis')).toBeInTheDocument();
    expect(screen.getByText('Total Event Attendees')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('35 members')).toBeInTheDocument();
    expect(screen.getByText('15 guests')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument();
  });

  it('renders nothing when targeting requirements are not satisfied (e.g. event target without eventId)', () => {
    const { container } = render(
      <BroadcastAudienceStatsCard
        channels={['push', 'email']}
        targetType="event"
        targetEventId=""
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
