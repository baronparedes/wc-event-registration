import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useFormSubmissionsQuery } from '@/hooks/domain/forms/queries/useFormSubmissionsQuery';
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

describe('useFormSubmissionsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries form_submissions directly when given a valid UUID', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockSubmissions = [{ id: 'sub-1', form_id: uuid }];

    const orderMock = vi.fn().mockResolvedValue({ data: mockSubmissions, error: null });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useFormSubmissionsQuery(uuid));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('form_submissions');
    expect(eqMock).toHaveBeenCalledWith('form_id', uuid);
    expect(result.current.data).toEqual(mockSubmissions);
  });

  it('resolves form UUID by slug first when given a non-UUID string', async () => {
    const slug = 'volunteer-form';
    const resolvedId = '550e8400-e29b-41d4-a716-446655440000';
    const mockSubmissions = [{ id: 'sub-2', form_id: resolvedId }];

    // Mock form lookup
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: resolvedId }, error: null });
    const formEqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const formSelectMock = vi.fn().mockReturnValue({ eq: formEqMock });

    // Mock submissions lookup
    const orderMock = vi.fn().mockResolvedValue({ data: mockSubmissions, error: null });
    const subEqMock = vi.fn().mockReturnValue({ order: orderMock });
    const subSelectMock = vi.fn().mockReturnValue({ eq: subEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'forms') {
        return { select: formSelectMock } as never;
      }
      return { select: subSelectMock } as never;
    });

    const { result } = renderHookWithClient(() => useFormSubmissionsQuery(slug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(formEqMock).toHaveBeenCalledWith('slug', slug);
    expect(subEqMock).toHaveBeenCalledWith('form_id', resolvedId);
    expect(result.current.data).toEqual(mockSubmissions);
  });

  it('returns empty array when slug lookup returns no form', async () => {
    const slug = 'non-existent-form';

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    const formEqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const formSelectMock = vi.fn().mockReturnValue({ eq: formEqMock });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'forms') {
        return { select: formSelectMock } as never;
      }
      return {} as never;
    });

    const { result } = renderHookWithClient(() => useFormSubmissionsQuery(slug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual([]);
  });

  it('throws error when form lookup by slug fails', async () => {
    const slug = 'error-form';

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: new Error('DB error') });
    const formEqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const formSelectMock = vi.fn().mockReturnValue({ eq: formEqMock });

    vi.mocked(supabase.from).mockReturnValue({ select: formSelectMock } as never);

    const { result } = renderHookWithClient(() => useFormSubmissionsQuery(slug));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('DB error');
  });

  it('throws error when submissions lookup fails', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';

    const orderMock = vi
      .fn()
      .mockResolvedValue({ data: null, error: new Error('Submission fetch error') });
    const eqMock = vi.fn().mockReturnValue({ order: orderMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useFormSubmissionsQuery(uuid));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error?.message).toBe('Submission fetch error');
  });

  it('does not run query when formId is undefined', () => {
    const { result } = renderHookWithClient(() => useFormSubmissionsQuery(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
