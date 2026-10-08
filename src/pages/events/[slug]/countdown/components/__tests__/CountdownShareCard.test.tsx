import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LEGAL_CONFIG } from '@/config/constants';

import { CountdownShareCard } from '../CountdownShareCard';

describe('CountdownShareCard', () => {
  const mockEvent = {
    title: 'Global Dev Summit 2026',
    description: 'Join us for the premier tech conference',
    starts_at: '2026-11-20T10:00:00.000Z',
    location: 'Main Convention Hall A',
    slug: 'global-dev-summit-2026',
  };

  const mockTimeLeft = {
    days: 42,
    hours: 8,
    minutes: 15,
    seconds: 30,
  };

  it('renders event details, branding, and countdown values', () => {
    render(<CountdownShareCard event={mockEvent} timeLeft={mockTimeLeft} />);

    expect(screen.getByText('Global Dev Summit 2026')).toBeInTheDocument();
    expect(screen.getByText('Join us for the premier tech conference')).toBeInTheDocument();
    expect(screen.getByText('Main Convention Hall A')).toBeInTheDocument();
    expect(screen.getByText('Event Countdown')).toBeInTheDocument();
    expect(screen.getByText('Upcoming Event')).toBeInTheDocument();
    expect(screen.getByText(`Generated via ${LEGAL_CONFIG.appName}`)).toBeInTheDocument();
    expect(screen.getByText('/events/global-dev-summit-2026')).toBeInTheDocument();

    // Check countdown digits
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('08')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Days')).toBeInTheDocument();
    expect(screen.getByText('Hours')).toBeInTheDocument();
    expect(screen.getByText('Mins')).toBeInTheDocument();
    expect(screen.getByText('Secs')).toBeInTheDocument();
  });

  it('renders cover image when coverUrl is provided', () => {
    render(
      <CountdownShareCard
        event={mockEvent}
        coverUrl="https://example.com/cover.jpg"
        timeLeft={mockTimeLeft}
      />,
    );

    const img = screen.getByAltText('Global Dev Summit 2026');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    expect(img).toHaveAttribute('crossOrigin', 'anonymous');
  });

  it('handles missing location and date gracefully', () => {
    const eventWithoutDetails = {
      title: 'Secret Event',
      description: null,
      starts_at: null,
      location: null,
      slug: 'secret-event',
    };

    render(<CountdownShareCard event={eventWithoutDetails} timeLeft={mockTimeLeft} />);

    expect(screen.getByText('Secret Event')).toBeInTheDocument();
    expect(screen.getByText('Date TBA')).toBeInTheDocument();
    expect(screen.queryByText('Main Convention Hall A')).not.toBeInTheDocument();
  });
});
