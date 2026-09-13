import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePublicFormFieldsQuery } from '@/hooks/domain/forms/queries/usePublicFormFieldsQuery';

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

describe('usePublicFormFieldsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls get-public-form-fields edge function and returns fields', async () => {
    const mockFields = [
      {
        id: 'f-1',
        form_id: 'form-1',
        field_key: 'experience',
        label: 'Experience',
        field_type: 'text',
        is_required: true,
      },
    ];

    mockCaller.mockResolvedValueOnce({
      success: true,
      fields: mockFields,
    });

    const { result } = renderHookWithClient(() => usePublicFormFieldsQuery('form-1', 'members'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual(mockFields);
    expect(mockCaller).toHaveBeenCalledWith({
      form_id: 'form-1',
      audience: 'members',
    });
  });

  it('returns empty array when formId is not provided', () => {
    const { result } = renderHookWithClient(() => usePublicFormFieldsQuery(undefined));

    expect(result.current.fetchStatus).toBe('idle');
    expect(mockCaller).not.toHaveBeenCalled();
  });
});
