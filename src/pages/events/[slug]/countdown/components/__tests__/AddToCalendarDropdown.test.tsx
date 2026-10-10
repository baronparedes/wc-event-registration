import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';
import { downloadIcsFile } from '@/pages/events/[slug]/countdown/utils/calendarExportUtils';

import { AddToCalendarDropdown } from '../AddToCalendarDropdown';

const mockEvent: AdminEvent = {
  registration_opens_at: null,
  registration_closes_at: null,
  duplicate_policy: 'block' as const,
  registration_mode: 'open' as const,
  allow_public_registrations: true,
  metadata: {},
  require_id_lookup: false,
  cover_image_key: null,
  id: '1',
  title: 'Test Event',
  slug: 'test-event',
  starts_at: '2026-10-15T18:00:00+08:00',
  ends_at: '2026-10-15T20:00:00+08:00',
  location: 'Test Location',
  description: 'Test Description',
  status: 'published' as const,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  created_by_admin_id: 'admin-id',
};

// Mock downloadIcsFile
vi.mock('@/pages/events/[slug]/countdown/utils/calendarExportUtils', async (importOriginal) => {
  const mod =
    await importOriginal<
      typeof import('@/pages/events/[slug]/countdown/utils/calendarExportUtils')
    >();
  return {
    ...mod,
    downloadIcsFile: vi.fn(),
  };
});

describe('AddToCalendarDropdown', () => {
  const originalOpen = window.open;
  beforeEach(() => {
    window.open = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('renders Add to Calendar button', () => {
    render(<AddToCalendarDropdown event={mockEvent} />);
    expect(screen.getByRole('button', { name: /Add to Calendar/i })).toBeInTheDocument();
  });

  it('opens dropdown and allows Google Calendar export', () => {
    render(<AddToCalendarDropdown event={mockEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /Add to Calendar/i }));

    const googleButton = screen.getByText('Google Calendar');
    expect(googleButton).toBeInTheDocument();
    fireEvent.click(googleButton);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('calendar.google.com'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens dropdown and allows Outlook export', () => {
    render(<AddToCalendarDropdown event={mockEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /Add to Calendar/i }));

    const outlookButton = screen.getByText('Outlook');
    expect(outlookButton).toBeInTheDocument();
    fireEvent.click(outlookButton);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('outlook.live.com'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens dropdown and allows Yahoo export', () => {
    render(<AddToCalendarDropdown event={mockEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /Add to Calendar/i }));

    const yahooButton = screen.getByText('Yahoo');
    expect(yahooButton).toBeInTheDocument();
    fireEvent.click(yahooButton);
    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('calendar.yahoo.com'),
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('opens dropdown and allows Apple Calendar (.ics) export', () => {
    render(<AddToCalendarDropdown event={mockEvent} />);
    fireEvent.click(screen.getByRole('button', { name: /Add to Calendar/i }));

    const appleButton = screen.getByText('Apple Calendar (.ics)');
    expect(appleButton).toBeInTheDocument();
    fireEvent.click(appleButton);
    expect(downloadIcsFile).toHaveBeenCalledWith(mockEvent);
  });
});
