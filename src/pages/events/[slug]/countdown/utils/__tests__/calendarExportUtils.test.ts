import { describe, expect, it } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import {
  getGoogleCalendarUrl,
  getOutlookCalendarUrl,
  getYahooCalendarUrl,
} from '../calendarExportUtils';

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
  title: 'Test Event Title',
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

const mockEventNoEnd = {
  ...mockEvent,
  ends_at: null,
};

describe('calendarExportUtils', () => {
  describe('getGoogleCalendarUrl', () => {
    it('generates correct URL with start and end dates', () => {
      const url = getGoogleCalendarUrl(mockEvent);
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('text=Test%20Event%20Title');
      expect(url).toContain('dates=20261015T100000Z/20261015T120000Z');
      expect(url).toContain('details=Test%20Description');
      expect(url).toContain('location=Test%20Location');
    });

    it('generates correct URL with default 1 hour end date if ends_at is missing', () => {
      const url = getGoogleCalendarUrl(mockEventNoEnd);
      expect(url).toContain('dates=20261015T100000Z/20261015T110000Z');
    });
  });

  describe('getOutlookCalendarUrl', () => {
    it('generates correct URL with start and end dates', () => {
      const url = getOutlookCalendarUrl(mockEvent);
      expect(url).toContain('rru=addevent');
      expect(url).toContain('subject=Test%20Event%20Title');
      expect(url).toContain('startdt=2026-10-15T10%3A00%3A00.000Z');
      expect(url).toContain('enddt=2026-10-15T12%3A00%3A00.000Z');
      expect(url).toContain('body=Test%20Description');
      expect(url).toContain('location=Test%20Location');
    });

    it('generates correct URL with default 1 hour end date if ends_at is missing', () => {
      const url = getOutlookCalendarUrl(mockEventNoEnd);
      expect(url).toContain('startdt=2026-10-15T10%3A00%3A00.000Z');
      expect(url).toContain('enddt=2026-10-15T11%3A00%3A00.000Z');
    });
  });

  describe('getYahooCalendarUrl', () => {
    it('generates correct URL with start and end dates', () => {
      const url = getYahooCalendarUrl(mockEvent);
      expect(url).toContain('v=60');
      expect(url).toContain('TITLE=Test%20Event%20Title');
      expect(url).toContain('ST=20261015T100000Z');
      expect(url).toContain('ET=20261015T120000Z');
      expect(url).toContain('DESC=Test%20Description');
      expect(url).toContain('in_loc=Test%20Location');
    });

    it('generates correct URL with default 1 hour end date if ends_at is missing', () => {
      const url = getYahooCalendarUrl(mockEventNoEnd);
      expect(url).toContain('ST=20261015T100000Z');
      expect(url).toContain('ET=20261015T110000Z');
    });
  });
});
