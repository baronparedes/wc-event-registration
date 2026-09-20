import { type ReactNode, createElement } from 'react';

import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import {
  getEventIdFromPath,
  getFormIdFromPath,
  getMemberIdFromPath,
  useAppDrawerNavigation,
} from '../hooks/useAppDrawerNavigation';

const {
  mockUseAdminEventQuery,
  mockUseAdminFormQuery,
  mockUseAdminMemberQuery,
  mockUseCurrentProfileQuery,
} = vi.hoisted(() => ({
  mockUseAdminEventQuery: vi.fn(),
  mockUseAdminFormQuery: vi.fn(),
  mockUseAdminMemberQuery: vi.fn(),
  mockUseCurrentProfileQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/events', () => ({
  useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
}));

vi.mock('@/hooks/domain/forms', () => ({
  useAdminFormQuery: (...args: unknown[]) => mockUseAdminFormQuery(...args),
}));

vi.mock('@/hooks/domain/members', () => ({
  useAdminMemberQuery: (...args: unknown[]) => mockUseAdminMemberQuery(...args),
  useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
}));

function createWrapper(initialPath: string = ROUTE_PATHS.home) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(MemoryRouter, { initialEntries: [initialPath] }, children);
  };
}

describe('getEventIdFromPath', () => {
  it('extracts event ID from admin event routes', () => {
    expect(getEventIdFromPath('/admin/events/event-123')).toBe('event-123');
    expect(getEventIdFromPath('/admin/events/event-123/attendance')).toBe('event-123');
    expect(getEventIdFromPath('/admin/events/event-123/fields')).toBe('event-123');
  });

  it('returns null for new event creation routes or non-event routes', () => {
    expect(getEventIdFromPath(ROUTE_PATHS.adminEventNew)).toBeNull();
    expect(getEventIdFromPath(`${ROUTE_PATHS.adminEventNew}/sub`)).toBeNull();
    expect(getEventIdFromPath(ROUTE_PATHS.home)).toBeNull();
    expect(getEventIdFromPath(ROUTE_PATHS.adminMembers)).toBeNull();
  });
});

describe('getFormIdFromPath', () => {
  it('extracts form ID from admin form routes', () => {
    expect(getFormIdFromPath('/admin/forms/form-123')).toBe('form-123');
    expect(getFormIdFromPath('/admin/forms/form-123/submissions')).toBe('form-123');
    expect(getFormIdFromPath('/admin/forms/form-123/fields')).toBe('form-123');
  });

  it('returns null for new form creation routes or non-form routes', () => {
    expect(getFormIdFromPath(ROUTE_PATHS.adminFormNew)).toBeNull();
    expect(getFormIdFromPath(`${ROUTE_PATHS.adminFormNew}/sub`)).toBeNull();
    expect(getFormIdFromPath(ROUTE_PATHS.home)).toBeNull();
    expect(getFormIdFromPath(ROUTE_PATHS.adminEvents)).toBeNull();
  });
});

describe('getMemberIdFromPath', () => {
  it('extracts member ID from admin member routes', () => {
    expect(getMemberIdFromPath('/admin/members/member-123')).toBe('member-123');
    expect(getMemberIdFromPath('/admin/members/member-123/service-attendance')).toBe('member-123');
    expect(getMemberIdFromPath('/admin/members/member-123/event-history')).toBe('member-123');
  });

  it('returns null for import routes or non-member routes', () => {
    expect(getMemberIdFromPath(ROUTE_PATHS.adminMembersImport)).toBeNull();
    expect(getMemberIdFromPath(`${ROUTE_PATHS.adminMembersImport}/sub`)).toBeNull();
    expect(getMemberIdFromPath(ROUTE_PATHS.home)).toBeNull();
    expect(getMemberIdFromPath(ROUTE_PATHS.adminEvents)).toBeNull();
  });
});

describe('useAppDrawerNavigation', () => {
  it('returns basic main navigation for unauthenticated guest', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseAdminFormQuery.mockReturnValue({ data: null });
    mockUseAdminMemberQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });

    const { result } = renderHook(
      () =>
        useAppDrawerNavigation({
          isAuthenticated: false,
          hasSession: false,
          adminRole: null,
        }),
      { wrapper: createWrapper() },
    );

    expect(result.current.mainNavItems.map((i) => i.label)).toEqual(['Hub', 'Sign In']);
    expect(result.current.adminNavItems).toEqual([]);
    expect(result.current.eventWorkspaceNavItems).toEqual([]);
    expect(result.current.attendanceNavItems).toEqual([]);
    expect(result.current.hasProfileAccess).toBe(false);
  });

  it('builds full navigation sections for admin on an event route', () => {
    mockUseAdminEventQuery.mockReturnValue({
      data: { title: 'Sunday Worship' },
    });
    mockUseCurrentProfileQuery.mockReturnValue({
      data: { full_name: 'John Doe', avatar_object_key: 'avatar-1' },
    });

    const { result } = renderHook(
      () =>
        useAppDrawerNavigation({
          isAuthenticated: true,
          hasSession: true,
          adminRole: 'admin',
        }),
      {
        wrapper: createWrapper('/admin/events/event-456/attendance'),
      },
    );

    expect(result.current.mainNavItems.map((i) => i.label)).toEqual(['Hub', 'My Profile']);
    expect(result.current.adminNavItems.map((i) => i.label)).toEqual([
      'Hub Calendar',
      'Manage Events',
      'Manage Forms',
      'Manage Members',
      'Manage Services',
      'AI Assistant',
    ]);
    expect(result.current.eventWorkspaceNavItems.map((i) => i.label)).toEqual([
      'Manage Event',
      'Manage Registration Fields',
      'Manage Registrations',
      'Manage Public Registrations',
      'Manage Attendance',
    ]);
    expect(result.current.attendanceNavItems.map((i) => i.label)).toEqual([
      'Check-In',
      'Attendance Fields',
      'Attendee Details',
      'Attendance Dashboard',
      'Unregistered Members',
    ]);
    expect(result.current.eventId).toBe('event-456');
    expect(result.current.displayName).toBe('John Doe');
    expect(result.current.hasProfileAccess).toBe(true);
  });

  it('filters permissions strictly for kiosk role', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
    mockUseAdminFormQuery.mockReturnValue({ data: null });
    mockUseAdminMemberQuery.mockReturnValue({ data: null });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });

    const { result } = renderHook(
      () =>
        useAppDrawerNavigation({
          isAuthenticated: true,
          hasSession: true,
          adminRole: 'kiosk',
        }),
      {
        wrapper: createWrapper('/admin/events/event-789/attendance'),
      },
    );

    expect(result.current.adminNavItems.map((i) => i.label)).toEqual(['Manage Events']);
    expect(result.current.eventWorkspaceNavItems).toEqual([]);
    expect(result.current.attendanceNavItems.map((i) => i.label)).toEqual(['Check-In']);
  });

  it('builds form workspace navigation for admin on a form route', () => {
    mockUseAdminFormQuery.mockReturnValue({
      data: { title: 'Registration Form' },
    });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });

    const { result } = renderHook(
      () =>
        useAppDrawerNavigation({
          isAuthenticated: true,
          hasSession: true,
          adminRole: 'admin',
        }),
      {
        wrapper: createWrapper('/admin/forms/form-123'),
      },
    );

    expect(result.current.formWorkspaceNavItems.map((i) => i.label)).toEqual([
      'Manage Form',
      'Manage Form Fields',
      'Manage Submissions',
    ]);
    expect(result.current.formId).toBe('form-123');
  });

  it('builds member workspace navigation for admin on a member route', () => {
    mockUseAdminMemberQuery.mockReturnValue({
      data: { full_name: 'John Doe' },
    });
    mockUseCurrentProfileQuery.mockReturnValue({ data: null });

    const { result } = renderHook(
      () =>
        useAppDrawerNavigation({
          isAuthenticated: true,
          hasSession: true,
          adminRole: 'admin',
        }),
      {
        wrapper: createWrapper('/admin/members/member-123'),
      },
    );

    expect(result.current.memberWorkspaceNavItems.map((i) => i.label)).toEqual([
      'Edit Member',
      'Service Attendance',
      'Event History',
    ]);
    expect(result.current.memberId).toBe('member-123');
  });
});
