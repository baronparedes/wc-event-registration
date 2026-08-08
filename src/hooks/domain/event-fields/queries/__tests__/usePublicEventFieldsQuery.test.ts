import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { makePublicEventField } from '@/__tests__/factories';
import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePublicEventFieldsQuery } from '@/hooks/domain/event-fields/queries/usePublicEventFieldsQuery';

const { mockCaller, mockCreateEdgeFunctionCaller, mockValidatePublicEventFieldConfig } = vi.hoisted(
  () => {
    const caller = vi.fn();
    return {
      mockCaller: caller,
      mockCreateEdgeFunctionCaller: vi.fn(() => caller),
      mockValidatePublicEventFieldConfig: vi.fn(),
    };
  },
);

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
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

    mockCaller.mockResolvedValueOnce({ success: true, fields: [rawRow] });
    mockValidatePublicEventFieldConfig.mockReturnValueOnce({
      validFields: [{ id: field.id }],
      issues: [],
    });

    const { result } = renderHookWithClient(() =>
      usePublicEventFieldsQuery(field.event_id, 'members'),
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockCaller).toHaveBeenCalledWith({ event_id: field.event_id, audience: 'members' });
    expect(mockValidatePublicEventFieldConfig).toHaveBeenCalledWith([rawRow]);
    expect(result.current.data).toEqual({ validFields: [{ id: field.id }], issues: [] });
  });

  it('returns query error state when field fetch fails', async () => {
    mockCaller.mockRejectedValueOnce(new Error('public fields failed'));

    const { result } = renderHookWithClient(() => usePublicEventFieldsQuery('event-1', 'guests'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns empty validated result when refetched without an event id', async () => {
    const { result } = renderHookWithClient(() => usePublicEventFieldsQuery(undefined, 'members'));

    const response = await result.current.refetch();

    expect(response.data).toEqual({ validFields: [], issues: [] });
    expect(mockCaller).not.toHaveBeenCalled();
    expect(mockValidatePublicEventFieldConfig).not.toHaveBeenCalled();
  });
});
