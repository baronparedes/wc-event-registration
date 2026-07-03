import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useCreateEventMutation } from '@/hooks/domain/events/mutations/useCreateEventMutation';
import { ADMIN_EVENTS_QUERY_KEY } from '@/hooks/domain/events/queries/useAdminEventsQuery';

const {
  mockGetSession,
  mockAdminsBuilder,
  mockEventsInsertBuilder,
  mockFrom,
  mockWriteAdminAuditLogSafely,
} = vi.hoisted(() => {
  const adminsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  adminsBuilder.select.mockReturnValue(adminsBuilder);
  adminsBuilder.eq.mockReturnValue(adminsBuilder);

  const eventsInsertBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };
  eventsInsertBuilder.insert.mockReturnValue(eventsInsertBuilder);
  eventsInsertBuilder.select.mockReturnValue(eventsInsertBuilder);

  return {
    mockGetSession: vi.fn(),
    mockAdminsBuilder: adminsBuilder,
    mockEventsInsertBuilder: eventsInsertBuilder,
    mockFrom: vi.fn((table: string) => {
      if (table === 'admins') return adminsBuilder;
      if (table === 'events') return eventsInsertBuilder;
      throw new Error(`Unexpected table: ${table}`);
    }),
    mockWriteAdminAuditLogSafely: vi.fn(),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      auth: {
        getSession: mockGetSession,
      },
      from: mockFrom,
    },
  };
});

vi.mock('@/lib/domain/admin-audit', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/admin-audit')>(
    '@/lib/domain/admin-audit',
  );

  return {
    ...actual,
    writeAdminAuditLogSafely: mockWriteAdminAuditLogSafely,
  };
});

describe('useCreateEventMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: faker.string.uuid() },
        },
      },
    });
  });

  it('creates an event, writes audit log, and invalidates events list', async () => {
    const adminId = faker.string.uuid();
    const eventId = faker.string.uuid();
    const slug = faker.helpers.slugify(faker.lorem.words(2)).toLowerCase();
    const title = faker.lorem.words(3);
    mockAdminsBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: adminId } });
    mockEventsInsertBuilder.single.mockResolvedValueOnce({
      data: { id: eventId },
      error: null,
    });

    const { result, queryClient } = renderHookWithClient(() => useCreateEventMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const createdId = await act(async () =>
      result.current.mutateAsync({
        title,
        slug,
        description: '',
        location: '',
        starts_at: '',
        ends_at: '',
        registration_opens_at: '',
        registration_closes_at: '',
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
      }),
    );

    expect(createdId).toBe(eventId);
    expect(mockEventsInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug,
        title,
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'open',
        require_id_lookup: true,
        created_by_admin_id: adminId,
        description: null,
        location: null,
      }),
    );
    expect(mockWriteAdminAuditLogSafely).toHaveBeenCalledWith({
      action: 'create_event',
      resourceType: 'event',
      resourceId: eventId,
      metadata: { slug, title, status: 'draft' },
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_EVENTS_QUERY_KEY });
    });
  });

  it('creates an event without admin lookup when no session exists', async () => {
    const eventId = faker.string.uuid();
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
    });
    mockEventsInsertBuilder.single.mockResolvedValueOnce({
      data: { id: eventId },
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateEventMutation());

    const createdId = await act(async () =>
      result.current.mutateAsync({
        title: 'League Finals',
        slug: 'league-finals',
        description: 'desc',
        location: 'Arena',
        starts_at: '2026-07-01T10:00',
        ends_at: '2026-07-01T12:00',
        registration_opens_at: '2026-06-20T10:00',
        registration_closes_at: '2026-06-30T10:00',
        status: 'published',
        duplicate_policy: 'allow_update',
        registration_mode: 'open',
      }),
    );

    expect(createdId).toBe(eventId);
    expect(mockAdminsBuilder.select).not.toHaveBeenCalled();
    expect(mockEventsInsertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by_admin_id: null,
        description: 'desc',
        location: 'Arena',
        starts_at: '2026-07-01T10:00+08:00',
        ends_at: '2026-07-01T12:00+08:00',
        registration_opens_at: '2026-06-20T10:00+08:00',
        registration_closes_at: '2026-06-30T10:00+08:00',
      }),
    );
  });

  it('throws when event insert returns an error', async () => {
    const adminId = faker.string.uuid();
    const eventId = faker.string.uuid();
    mockAdminsBuilder.maybeSingle.mockResolvedValueOnce({ data: { id: adminId } });
    mockEventsInsertBuilder.single.mockResolvedValueOnce({
      data: { id: eventId },
      error: new Error('insert failed'),
    });

    const { result, queryClient } = renderHookWithClient(() => useCreateEventMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await expect(
      result.current.mutateAsync({
        title: 'Broken Event',
        slug: 'broken-event',
        description: '',
        location: '',
        starts_at: '',
        ends_at: '',
        registration_opens_at: '',
        registration_closes_at: '',
        status: 'draft',
        duplicate_policy: 'block',
        registration_mode: 'closed',
      }),
    ).rejects.toThrow('insert failed');

    expect(mockWriteAdminAuditLogSafely).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
