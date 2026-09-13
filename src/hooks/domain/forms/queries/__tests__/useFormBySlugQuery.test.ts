import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useFormBySlugQuery } from '@/hooks/domain/forms/queries/useFormBySlugQuery';

const { mockCaller, mockCreateEdgeFunctionCaller } = vi.hoisted(() => {
  const caller = vi.fn();
  return {
    mockCaller: caller,
    mockCreateEdgeFunctionCaller: vi.fn(() => caller),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    createEdgeFunctionCaller: mockCreateEdgeFunctionCaller,
  };
});

describe('useFormBySlugQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get-public-form edge function and returns form', async () => {
    const mockForm = {
      id: 'form-1',
      slug: 'sample-slug',
      title: 'Sample Form',
      status: 'published',
    };

    mockCaller.mockResolvedValueOnce({
      success: true,
      form: mockForm,
    });

    const { result } = renderHookWithClient(() => useFormBySlugQuery('sample-slug'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockForm);
    expect(mockCaller).toHaveBeenCalledWith({ slug: 'sample-slug' });
  });

  it('does not run query when slug is empty or undefined', () => {
    const { result } = renderHookWithClient(() => useFormBySlugQuery(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockCaller).not.toHaveBeenCalled();
  });
});
