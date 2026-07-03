import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makePublicEventField } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePublicEventFieldsQuery } from '@/hooks/domain/event-fields/queries/usePublicEventFieldsQuery';

const { mockQueryBuilder, mockFrom, mockLogger, mockValidatePublicEventFieldConfig } = vi.hoisted(
  () => {
    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      returns: vi.fn(),
    };

    queryBuilder.select.mockReturnValue(queryBuilder);
    queryBuilder.eq.mockReturnValue(queryBuilder);
    queryBuilder.order.mockReturnValue(queryBuilder);

    return {
      mockQueryBuilder: queryBuilder,
      mockFrom: vi.fn(() => queryBuilder),
      mockLogger: { debug: vi.fn() },
      mockValidatePublicEventFieldConfig: vi.fn(),
    };
  },
);

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
    logger: mockLogger,
  };
});

vi.mock('@/lib/domain/event-fields', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/event-fields')>(
    '@/lib/domain/event-fields',
  );

  return {
    ...actual,
    validatePublicEventFieldConfig: mockValidatePublicEventFieldConfig,
  };
});

describe('usePublicEventFieldsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns validated public field config', async () => {
    const field = makePublicEventField();
    const rawRow = { id: field.id, event_id: field.event_id, field_key: field.field_key };
    mockQueryBuilder.returns.mockResolvedValueOnce({
      data: [rawRow],
      error: null,
    });
    mockValidatePublicEventFieldConfig.mockReturnValueOnce({
      validFields: [{ id: field.id }],
      issues: [],
    });

    const { result } = renderHookWithClient(() => usePublicEventFieldsQuery(field.event_id));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockValidatePublicEventFieldConfig).toHaveBeenCalledWith([rawRow]);
    expect(result.current.data).toEqual({ validFields: [{ id: field.id }], issues: [] });
  });

  it('returns query error state when field fetch fails', async () => {
    mockQueryBuilder.returns.mockResolvedValueOnce({
      data: null,
      error: new Error('public fields failed'),
    });

    const { result } = renderHookWithClient(() => usePublicEventFieldsQuery('event-1'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty validated result when refetched without an event id', async () => {
    const { result } = renderHookWithClient(() => usePublicEventFieldsQuery(undefined));

    const response = await result.current.refetch();

    expect(response.data).toEqual({ validFields: [], issues: [] });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockLogger.debug).not.toHaveBeenCalled();
    expect(mockValidatePublicEventFieldConfig).not.toHaveBeenCalled();
  });
});
