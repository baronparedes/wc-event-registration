import { beforeEach, describe, expect, it, vi } from 'vitest';

import { writeAdminAuditLog, writeAdminAuditLogSafely } from '@/lib/domain/admin-audit/mutations';

const { mockGetSession, mockAdminsMaybeSingle, mockAuditInsert, mockFrom } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const adminsBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  adminsBuilder.select.mockReturnValue(adminsBuilder);
  adminsBuilder.eq.mockReturnValue(adminsBuilder);

  const auditBuilder = {
    insert: vi.fn(),
  };

  const from = vi.fn((table: string) => {
    if (table === 'admins') return adminsBuilder;
    if (table === 'admin_audit_logs') return auditBuilder;
    throw new Error(`Unexpected table ${table}`);
  });

  return {
    mockGetSession,
    mockAdminsMaybeSingle: adminsBuilder.maybeSingle,
    mockAuditInsert: auditBuilder.insert,
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

describe('admin-audit mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when no auth session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    await writeAdminAuditLog({ action: 'update_event', resourceType: 'event' });

    expect(mockFrom).not.toHaveBeenCalledWith('admins');
    expect(mockAuditInsert).not.toHaveBeenCalled();
  });

  it('throws when admin lookup fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'auth-1' } } } });
    mockAdminsMaybeSingle.mockResolvedValue({ data: null, error: new Error('lookup failed') });

    await expect(
      writeAdminAuditLog({ action: 'update_event', resourceType: 'event' }),
    ).rejects.toThrow('lookup failed');
  });

  it('returns early when session user is not an admin', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'auth-1' } } } });
    mockAdminsMaybeSingle.mockResolvedValue({ data: null, error: null });

    await writeAdminAuditLog({ action: 'update_event', resourceType: 'event' });

    expect(mockAuditInsert).not.toHaveBeenCalled();
  });

  it('inserts an audit log with defaults when admin exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'auth-1' } } } });
    mockAdminsMaybeSingle.mockResolvedValue({ data: { id: 'admin-1' }, error: null });
    mockAuditInsert.mockResolvedValue({ error: null });

    await writeAdminAuditLog({ action: 'update_event', resourceType: 'event' });

    expect(mockAuditInsert).toHaveBeenCalledWith({
      admin_id: 'admin-1',
      action: 'update_event',
      resource_type: 'event',
      resource_id: null,
      metadata: {},
    });
  });

  it('throws when log insertion fails', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'auth-1' } } } });
    mockAdminsMaybeSingle.mockResolvedValue({ data: { id: 'admin-1' }, error: null });
    mockAuditInsert.mockResolvedValue({ error: new Error('insert failed') });

    await expect(
      writeAdminAuditLog({ action: 'update_event', resourceType: 'event', resourceId: 'evt-1' }),
    ).rejects.toThrow('insert failed');
  });

  it('suppresses errors in safe writer', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'auth-1' } } } });
    mockAdminsMaybeSingle.mockResolvedValue({ data: { id: 'admin-1' }, error: null });
    mockAuditInsert.mockResolvedValue({ error: new Error('insert failed') });

    await writeAdminAuditLogSafely({ action: 'update_event', resourceType: 'event' });

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
