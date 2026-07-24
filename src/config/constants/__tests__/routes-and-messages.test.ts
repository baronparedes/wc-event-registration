import { describe, expect, it } from 'vitest';

import { TOAST_MESSAGES } from '@/config/constants/messages';
import {
  ROUTE_PATHS,
  ROUTE_PREFIXES,
  isMinimizedAppShellRoute,
  toAdminEventAttendanceUnregisteredMembers,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventRegistrations,
  toAdminMemberDetail,
  toAdminMembersImport,
  toAdminRegistrationDetail,
  toAdminRegistrationNames,
  toEventRegistration,
} from '@/config/constants/routes';

describe('route constants and builders', () => {
  it('exposes stable route constants', () => {
    expect(ROUTE_PATHS.home).toBe('/');
    expect(ROUTE_PATHS.adminEvents).toBe('/admin/events');
    expect(ROUTE_PATHS.adminMembersImport).toBe('/admin/members/import');
    expect(ROUTE_PATHS.adminRegistrationDetailPattern).toBe(
      '/admin/events/:id/registrations/:registration_id',
    );
    expect(ROUTE_PATHS.adminEventRegistrationsUnregisteredMembersPattern).toBe(
      '/admin/events/:id/registrations/unregistered-members',
    );
    expect(ROUTE_PATHS.adminRegistrationNamesPattern).toBe('/admin/events/:id/registrations/names');
    expect(ROUTE_PREFIXES.admin).toBe('/admin/');
  });

  it('builds route paths from identifiers', () => {
    expect(toEventRegistration('summer-2026')).toBe('/events/summer-2026/register');
    expect(toAdminMembersImport()).toBe('/admin/members/import');
    expect(toAdminMemberDetail('member-1')).toBe('/admin/members/member-1');
    expect(toAdminEventDetail('event-1')).toBe('/admin/events/event-1');
    expect(toAdminEventFields('event-1')).toBe('/admin/events/event-1/fields');
    expect(toAdminEventRegistrations('event-1')).toBe('/admin/events/event-1/registrations');
    expect(toAdminEventAttendanceUnregisteredMembers('event-1')).toBe(
      '/admin/events/event-1/registrations/unregistered-members',
    );
    expect(toAdminRegistrationDetail('event-1', 'reg-1')).toBe(
      '/admin/events/event-1/registrations/reg-1',
    );
  });

  it('detects only kiosk-minimized shell routes', () => {
    expect(isMinimizedAppShellRoute('/events/summer-2026/register')).toBe(true);
    expect(isMinimizedAppShellRoute('/events/summer-2026/register-public')).toBe(true);
    expect(isMinimizedAppShellRoute('/admin/events/event-1/attendance/check-in')).toBe(true);
    expect(isMinimizedAppShellRoute('/admin/events/event-1/attendance')).toBe(false);
    expect(isMinimizedAppShellRoute('/admin/events/event-1/registrations')).toBe(false);
    expect(isMinimizedAppShellRoute('/events/summer-2026')).toBe(false);
  });

  describe('toAdminRegistrationNames', () => {
    it('builds URL with only core fields', () => {
      const url = toAdminRegistrationNames('event-1', {
        fields: ['full_name', 'member_id'],
        answerFields: [],
      });
      expect(url).toBe('/admin/events/event-1/registrations/names?fields=full_name%2Cmember_id');
    });

    it('includes answerFields param when provided', () => {
      const url = toAdminRegistrationNames('event-1', {
        fields: ['full_name'],
        answerFields: ['field-uuid-1', 'field-uuid-2'],
      });
      expect(url).toContain('fields=full_name');
      expect(url).toContain('answerFields=field-uuid-1%2Cfield-uuid-2');
    });

    it('omits answerFields param when empty', () => {
      const url = toAdminRegistrationNames('event-1', {
        fields: ['full_name'],
        answerFields: [],
      });
      expect(url).not.toContain('answerFields');
    });
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
