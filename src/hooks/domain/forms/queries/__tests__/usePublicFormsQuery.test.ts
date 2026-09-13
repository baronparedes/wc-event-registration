import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePublicFormsQuery } from '@/hooks/domain/forms/queries/usePublicFormsQuery';

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

describe('usePublicFormsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get-public-forms edge function and returns published forms', async () => {
    const mockForms = [
      {
        id: 'form-1',
        slug: 'form-1-slug',
        title: 'Form 1',
        status: 'published',
      },
    ];

    mockCaller.mockResolvedValueOnce({
      success: true,
      forms: mockForms,
    });

    const { result } = renderHookWithClient(() => usePublicFormsQuery());

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockForms);
    expect(mockCaller).toHaveBeenCalledWith({});
  });
});
