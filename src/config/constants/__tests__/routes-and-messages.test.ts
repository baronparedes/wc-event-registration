import { describe, expect, it } from 'vitest';

import { TOAST_MESSAGES } from '@/config/constants/messages';
import {
  ROUTE_PATHS,
  ROUTE_PREFIXES,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventRegistrations,
  toAdminMemberDetail,
  toAdminRegistrationDetail,
  toEventRegistration,
} from '@/config/constants/routes';

describe('route constants and builders', () => {
  it('exposes stable route constants', () => {
    expect(ROUTE_PATHS.home).toBe('/');
    expect(ROUTE_PATHS.adminEvents).toBe('/admin/events');
    expect(ROUTE_PATHS.adminRegistrationDetailPattern).toBe(
      '/admin/events/:id/registrations/:registration_id',
    );
    expect(ROUTE_PREFIXES.admin).toBe('/admin/');
  });

  it('builds route paths from identifiers', () => {
    expect(toEventRegistration('summer-2026')).toBe('/events/summer-2026/register');
    expect(toAdminMemberDetail('member-1')).toBe('/admin/members/member-1');
    expect(toAdminEventDetail('event-1')).toBe('/admin/events/event-1');
    expect(toAdminEventFields('event-1')).toBe('/admin/events/event-1/fields');
    expect(toAdminEventRegistrations('event-1')).toBe('/admin/events/event-1/registrations');
    expect(toAdminRegistrationDetail('event-1', 'reg-1')).toBe(
      '/admin/events/event-1/registrations/reg-1',
    );
  });
});

describe('toast message formatters', () => {
  it('formats published and archived event messages', () => {
    expect(TOAST_MESSAGES.eventSaved.published('Demo Event')).toBe(
      '"Demo Event" has been published.',
    );
    expect(TOAST_MESSAGES.eventSaved.archived('Demo Event')).toBe(
      '"Demo Event" has been archived.',
    );
  });

  it('formats member id update message', () => {
    expect(TOAST_MESSAGES.member.memberIdUpdated('WC-100')).toBe('Member ID updated to "WC-100".');
  });
});
