import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AdminEvent } from '@/lib/domain/events';

import {
  downloadIcsFile,
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
  description: 'Test Description\nSecond Line',
  status: 'published' as const,
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  created_by_admin_id: 'admin-id',
};

const mockEventNoEnd: AdminEvent = {
  ...mockEvent,
  ends_at: null,
};

const mockEventMinimal: AdminEvent = {
  ...mockEvent,
  slug: '',
  starts_at: null,
  ends_at: null,
  location: null,
  description: null,
};

describe('calendarExportUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('downloadIcsFile', () => {
    it('creates blob, triggers download with sanitized filename, and revokes url', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-ics-url');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.fn();
      const appendChildSpy = vi.spyOn(document.body, 'appendChild');
      const removeChildSpy = vi.spyOn(document.body, 'removeChild');

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = clickMock;
        }
        return element;
      });

      downloadIcsFile(mockEvent);

      expect(createObjectURLMock).toHaveBeenCalledTimes(1);
      expect(clickMock).toHaveBeenCalledTimes(1);
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-ics-url');
    });

    it('handles event without ends_at and without slug', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-ics-url');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      downloadIcsFile(mockEventNoEnd);
      downloadIcsFile(mockEventMinimal);

      expect(createObjectURLMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('getGoogleCalendarUrl', () => {
    it('generates correct URL with start and end dates', () => {
      const url = getGoogleCalendarUrl(mockEvent);
      expect(url).toContain('action=TEMPLATE');
      expect(url).toContain('text=Test%20Event%20Title');
      expect(url).toContain('dates=20261015T100000Z/20261015T120000Z');
      expect(url).toContain('details=Test%20Description%0ASecond%20Line');
      expect(url).toContain('location=Test%20Location');
    });

    it('generates correct URL with default 1 hour end date if ends_at is missing', () => {
      const url = getGoogleCalendarUrl(mockEventNoEnd);
      expect(url).toContain('dates=20261015T100000Z/20261015T110000Z');
    });

    it('generates URL without date or location parameters when missing', () => {
      const url = getGoogleCalendarUrl(mockEventMinimal);
      expect(url).toContain('text=Test%20Event%20Title');
      expect(url).not.toContain('&dates=');
      expect(url).not.toContain('&location=');
      expect(url).not.toContain('&details=');
    });

    it('generates URL with start date only if starts_at is set but end is not derivable', () => {
      const eventStartOnly: AdminEvent = {
        ...mockEvent,
        ends_at: null,
      };
      const url = getGoogleCalendarUrl(eventStartOnly);
      expect(url).toContain('dates=');
    });
  });

  describe('getOutlookCalendarUrl', () => {
    it('generates correct URL with start and end dates', () => {
      const url = getOutlookCalendarUrl(mockEvent);
      expect(url).toContain('rru=addevent');
      expect(url).toContain('subject=Test%20Event%20Title');
      expect(url).toContain('startdt=2026-10-15T10%3A00%3A00.000Z');
      expect(url).toContain('enddt=2026-10-15T12%3A00%3A00.000Z');
      expect(url).toContain('body=Test%20Description%0ASecond%20Line');
      expect(url).toContain('location=Test%20Location');
    });

    it('generates correct URL with default 1 hour end date if ends_at is missing', () => {
      const url = getOutlookCalendarUrl(mockEventNoEnd);
      expect(url).toContain('startdt=2026-10-15T10%3A00%3A00.000Z');
      expect(url).toContain('enddt=2026-10-15T11%3A00%3A00.000Z');
    });

    it('generates URL without startdt, enddt, body, or location when omitted', () => {
      const url = getOutlookCalendarUrl(mockEventMinimal);
      expect(url).toContain('subject=Test%20Event%20Title');
      expect(url).not.toContain('&startdt=');
      expect(url).not.toContain('&enddt=');
      expect(url).not.toContain('&body=');
      expect(url).not.toContain('&location=');
    });
  });

  describe('getYahooCalendarUrl', () => {
    it('generates correct URL with start and end dates', () => {
      const url = getYahooCalendarUrl(mockEvent);
      expect(url).toContain('v=60');
      expect(url).toContain('TITLE=Test%20Event%20Title');
      expect(url).toContain('ST=20261015T100000Z');
      expect(url).toContain('ET=20261015T120000Z');
      expect(url).toContain('DESC=Test%20Description%0ASecond%20Line');
      expect(url).toContain('in_loc=Test%20Location');
    });

    it('generates correct URL with default 1 hour end date if ends_at is missing', () => {
      const url = getYahooCalendarUrl(mockEventNoEnd);
      expect(url).toContain('ST=20261015T100000Z');
      expect(url).toContain('ET=20261015T110000Z');
    });

    it('generates URL without ST, ET, DESC, or in_loc when omitted', () => {
      const url = getYahooCalendarUrl(mockEventMinimal);
      expect(url).toContain('TITLE=Test%20Event%20Title');
      expect(url).not.toContain('&ST=');
      expect(url).not.toContain('&ET=');
      expect(url).not.toContain('&DESC=');
      expect(url).not.toContain('&in_loc=');
    });
  });
});
