import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import {
  formFieldsQueryKey,
  useFormFieldsQuery,
} from '@/hooks/domain/forms/queries/useFormFieldsQuery';
import { supabase } from '@/lib/infrastructure';

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      from: vi.fn(),
    },
  };
});

describe('useFormFieldsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not run query when formId is undefined', () => {
    const { result } = renderHookWithClient(() => useFormFieldsQuery(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('queries active fields by default for given formId', async () => {
    const mockFields = [
      { id: 'f-1', form_id: 'form-123', is_active: true, display_order: 1 },
      { id: 'f-2', form_id: 'form-123', is_active: true, display_order: 2 },
    ];

    const orderMock = vi.fn().mockResolvedValue({ data: mockFields, error: null });
    const eqActiveMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqFormIdMock = vi.fn().mockReturnValue({ eq: eqActiveMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqFormIdMock });

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useFormFieldsQuery('form-123'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('form_fields');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqFormIdMock).toHaveBeenCalledWith('form_id', 'form-123');
    expect(eqActiveMock).toHaveBeenCalledWith('is_active', true);
    expect(orderMock).toHaveBeenCalledWith('display_order', { ascending: true });
    expect(result.current.data).toEqual(mockFields);
  });

  it('includes inactive fields when includeInactive is true', async () => {
    const mockFields = [{ id: 'f-1', form_id: 'form-123', is_active: false, display_order: 1 }];

    const orderMock = vi.fn().mockResolvedValue({ data: mockFields, error: null });
    const eqFormIdMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqFormIdMock });

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useFormFieldsQuery('form-123', true));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(eqFormIdMock).toHaveBeenCalledWith('form_id', 'form-123');
    expect(orderMock).toHaveBeenCalledWith('display_order', { ascending: true });
    expect(result.current.data).toEqual(mockFields);
  });

  it('throws error when query fails', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Failed to load fields'),
    });
    const eqActiveMock = vi.fn().mockReturnValue({ order: orderMock });
    const eqFormIdMock = vi.fn().mockReturnValue({ eq: eqActiveMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqFormIdMock });

    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useFormFieldsQuery('form-123'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Failed to load fields');
  });

  it('constructs correct query key', () => {
    expect(formFieldsQueryKey('form-123', false)).toEqual(['form-fields', 'form-123', false]);
    expect(formFieldsQueryKey('form-123', true)).toEqual(['form-fields', 'form-123', true]);
  });
});
