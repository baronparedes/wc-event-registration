import { beforeEach, describe, expect, it, vi } from 'vitest';

import { canAdminPerform } from '@/lib/domain/auth/permissions';
import { fetchAdminAuthState } from '@/lib/domain/auth/queries';

const { mockGetSession, mockRpc } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockRpc = vi.fn();

  return {
    mockGetSession,
    mockRpc,
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      auth: { getSession: mockGetSession },
      rpc: mockRpc,
    },
  };
});

describe('fetchAdminAuthState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws when session retrieval fails', async () => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: new Error('session failed'),
    });

    await expect(fetchAdminAuthState()).rejects.toThrow('session failed');
  });

  it('returns unauthenticated state when there is no session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(fetchAdminAuthState()).resolves.toEqual({
      isAuthenticated: false,
      session: null,
      adminRole: null,
      permissions: [],
    });
  });

  it('throws when admin auth context RPC fails', async () => {
    const session = { user: { id: 'auth-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockRpc.mockResolvedValue({ data: null, error: new Error('admin failed') });

    await expect(fetchAdminAuthState()).rejects.toThrow('admin failed');
  });

  it('returns unauthenticated state when session user is not an admin', async () => {
    const session = { user: { id: 'auth-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockRpc.mockResolvedValue({ data: [], error: null });

    await expect(fetchAdminAuthState()).resolves.toEqual({
      isAuthenticated: false,
      session,
      adminRole: null,
      permissions: [],
    });
    expect(mockRpc).toHaveBeenCalledWith('get_my_admin_auth_context');
  });

  it('returns authenticated state with super_admin role and backend permissions', async () => {
    const session = { user: { id: 'auth-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockRpc.mockResolvedValue({
      data: [
        {
          role: 'super_admin',
          permissions: ['canManageAdminRoles', 'canReadAdminData', 'canWriteAdminData'],
        },
      ],
      error: null,
    });

    const result = await fetchAdminAuthState();
    expect(result).toEqual({
      isAuthenticated: true,
      session,
      adminRole: 'super_admin',
      permissions: ['canManageAdminRoles', 'canReadAdminData', 'canWriteAdminData'],
    });
    expect(canAdminPerform(result, 'canManageAdminRoles')).toBe(true);
  });

  it('returns authenticated state with slod role and backend permissions', async () => {
    const session = { user: { id: 'auth-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockRpc.mockResolvedValue({
      data: [
        {
          role: 'slod',
          permissions: ['canReadAdminData', 'canManageServices'],
        },
      ],
      error: null,
    });

    const result = await fetchAdminAuthState();
    expect(result).toEqual({
      isAuthenticated: true,
      session,
      adminRole: 'slod',
      permissions: ['canReadAdminData', 'canManageServices'],
    });
    expect(canAdminPerform(result, 'canReadAdminData')).toBe(true);
    expect(canAdminPerform(result, 'canExportAdminReports')).toBe(false);
  });

  it('returns authenticated state with kiosk role', async () => {
    const session = { user: { id: 'auth-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockRpc.mockResolvedValue({
      data: [
        {
          role: 'kiosk',
          permissions: ['canAccessAttendanceCheckIn'],
        },
      ],
      error: null,
    });

    await expect(fetchAdminAuthState()).resolves.toEqual({
      isAuthenticated: true,
      session,
      adminRole: 'kiosk',
      permissions: ['canAccessAttendanceCheckIn'],
    });
  });
});
