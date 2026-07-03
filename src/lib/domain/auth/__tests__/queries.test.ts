import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchAdminAuthState } from '@/lib/domain/auth/queries';

const { mockGetSession, mockAdminMaybeSingle, mockFrom } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const adminBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  adminBuilder.select.mockReturnValue(adminBuilder);
  adminBuilder.eq.mockReturnValue(adminBuilder);

  const from = vi.fn((table: string) => {
    if (table === 'admins') return adminBuilder;
    throw new Error(`Unexpected table ${table}`);
  });

  return {
    mockGetSession,
    mockAdminMaybeSingle: adminBuilder.maybeSingle,
    mockFrom: from,
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      auth: { getSession: mockGetSession },
      from: mockFrom,
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
    });
  });

  it('throws when admin lookup fails', async () => {
    const session = { user: { id: 'auth-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockAdminMaybeSingle.mockResolvedValue({ data: null, error: new Error('admin failed') });

    await expect(fetchAdminAuthState()).rejects.toThrow('admin failed');
  });

  it('returns unauthenticated state when session user is not an admin', async () => {
    const session = { user: { id: 'auth-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockAdminMaybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(fetchAdminAuthState()).resolves.toEqual({
      isAuthenticated: false,
      session,
      adminRole: null,
    });
  });

  it('returns authenticated state with admin role', async () => {
    const session = { user: { id: 'auth-1' } };
    mockGetSession.mockResolvedValue({ data: { session }, error: null });
    mockAdminMaybeSingle.mockResolvedValue({ data: { role: 'super_admin' }, error: null });

    await expect(fetchAdminAuthState()).resolves.toEqual({
      isAuthenticated: true,
      session,
      adminRole: 'super_admin',
    });
  });
});
