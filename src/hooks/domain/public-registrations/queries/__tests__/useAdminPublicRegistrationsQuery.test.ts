import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminPublicRegistrationsQuery } from '@/hooks/domain/public-registrations/queries/useAdminPublicRegistrationsQuery';

const { mockFrom, mockDecodeOffsetCursor, mockGetTotalPages, mockBuilder, mockSetQueryResult } =
  vi.hoisted(() => {
    let queryResult: { data: unknown[] | null; error: Error | null; count: number | null } = {
      data: [],
      error: null,
      count: 0,
    };

    type MockQueryBuilder = {
      select: ReturnType<typeof vi.fn>;
      eq: ReturnType<typeof vi.fn>;
      order: ReturnType<typeof vi.fn>;
      range: ReturnType<typeof vi.fn>;
      or: ReturnType<typeof vi.fn>;
      then: (resolve: (value: typeof queryResult) => unknown) => Promise<unknown>;
    };

    const builder: MockQueryBuilder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
      or: vi.fn(),
      then: (resolve) => Promise.resolve(resolve(queryResult)),
    };

    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.range.mockReturnValue(builder);
    builder.or.mockReturnValue(builder);

    const from = vi.fn(() => builder);

    return {
      mockFrom: from,
      mockDecodeOffsetCursor: vi.fn(),
      mockGetTotalPages: vi.fn(),
      mockBuilder: builder,
      mockSetQueryResult: (nextResult: typeof queryResult) => {
        queryResult = nextResult;
      },
    };
  });

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    decodeOffsetCursor: (...args: unknown[]) => mockDecodeOffsetCursor(...args),
    getTotalPages: (...args: unknown[]) => mockGetTotalPages(...args),
    supabase: {
      from: mockFrom,
    },
  };
});

describe('useAdminPublicRegistrationsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecodeOffsetCursor.mockReturnValue(0);
    mockGetTotalPages.mockReturnValue(1);
    mockSetQueryResult({ data: [], error: null, count: 0 });
  });

  it('returns paged registrations and does not apply search filter when search is blank', async () => {
    const eventId = faker.string.uuid();
    const attendeeEmail = faker.internet.email();

    mockSetQueryResult({
      data: [
        {
          id: faker.string.uuid(),
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          nickname: null,
          email: attendeeEmail,
          phone: null,
          status: 'submitted',
          submitted_at: faker.date.recent().toISOString(),
        },
      ],
      error: null,
      count: 1,
    });

    const { result } = renderHookWithClient(() =>
      useAdminPublicRegistrationsQuery(eventId, {
        pageSize: 10,
        cursor: null,
        searchTerm: '   ',
      }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      items: [{ email: attendeeEmail }],
      hasMore: false,
      nextCursor: null,
      totalCount: 1,
      totalPages: 1,
    });
    expect(mockBuilder.or).not.toHaveBeenCalled();
  });

  it('applies escaped search filter and computes next cursor when more results exist', async () => {
    const eventId = faker.string.uuid();
    const pageSize = 10;

    mockDecodeOffsetCursor.mockReturnValue(10);
    mockGetTotalPages.mockReturnValue(3);
    mockSetQueryResult({
      data: Array.from({ length: 10 }, () => ({
        id: faker.string.uuid(),
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        nickname: null,
        email: faker.internet.email(),
        phone: null,
        status: 'submitted',
        submitted_at: faker.date.recent().toISOString(),
      })),
      error: null,
      count: 30,
    });

    const { result } = renderHookWithClient(() =>
      useAdminPublicRegistrationsQuery(eventId, {
        pageSize,
        cursor: '10',
        searchTerm: 'john%_smith,',
      }),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.hasMore).toBe(true);
    expect(result.current.data?.nextCursor).toBe('20');
    expect(mockBuilder.or).toHaveBeenCalledWith(
      'first_name.ilike.%john\\%\\_smith\\,%,last_name.ilike.%john\\%\\_smith\\,%,nickname.ilike.%john\\%\\_smith\\,%,email.ilike.%john\\%\\_smith\\,%',
    );
  });

  it('returns query error state when supabase query fails', async () => {
    const eventId = faker.string.uuid();
    mockSetQueryResult({ data: null, error: new Error('query failed'), count: null });

    const { result } = renderHookWithClient(() => useAdminPublicRegistrationsQuery(eventId));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('does not run when event id is empty', () => {
    const { result } = renderHookWithClient(() => useAdminPublicRegistrationsQuery(''));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
