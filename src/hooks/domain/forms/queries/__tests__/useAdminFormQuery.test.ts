import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useAdminFormQuery } from '@/hooks/domain/forms/queries/useAdminFormQuery';
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

describe('useAdminFormQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries by id when given a valid UUID', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    const mockForm = {
      id: uuid,
      slug: 'sample-form',
      title: 'Sample Form',
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockForm, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useAdminFormQuery(uuid));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('forms');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqMock).toHaveBeenCalledWith('id', uuid);
    expect(result.current.data).toEqual(mockForm);
  });

  it('queries by slug when given a non-UUID string', async () => {
    const slug = 'volunteer-signup';
    const mockForm = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      slug,
      title: 'Volunteer Signup',
    };

    const maybeSingleMock = vi.fn().mockResolvedValue({ data: mockForm, error: null });
    const eqMock = vi.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
    vi.mocked(supabase.from).mockReturnValue({ select: selectMock } as never);

    const { result } = renderHookWithClient(() => useAdminFormQuery(slug));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(supabase.from).toHaveBeenCalledWith('forms');
    expect(selectMock).toHaveBeenCalledWith('*');
    expect(eqMock).toHaveBeenCalledWith('slug', slug);
    expect(result.current.data).toEqual(mockForm);
  });

  it('does not run query when formId is undefined', () => {
    const { result } = renderHookWithClient(() => useAdminFormQuery(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
