import { type ReactNode, createElement } from 'react';

import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { getEventIdFromPath, useAppDrawerNavigation } from '../hooks/useAppDrawerNavigation';

const { mockUseAdminEventQuery, mockUseCurrentProfileQuery } = vi.hoisted(() => ({
  mockUseAdminEventQuery: vi.fn(),
  mockUseCurrentProfileQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/events', () => ({
  useAdminEventQuery: (...args: unknown[]) => mockUseAdminEventQuery(...args),
}));

vi.mock('@/hooks/domain/members', () => ({
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

describe('useAppDrawerNavigation', () => {
  it('returns basic main navigation for unauthenticated guest', () => {
    mockUseAdminEventQuery.mockReturnValue({ data: null });
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
});
