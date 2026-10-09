import { faker } from '@faker-js/faker';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { ADMIN_FORMS_QUERY_KEY } from '@/hooks/domain/forms/queries/useAdminFormsQuery';

import { useDuplicateFormMutation } from '../useDuplicateFormMutation';

const { mockDuplicateForm } = vi.hoisted(() => ({
  mockDuplicateForm: vi.fn(),
}));

vi.mock('@/lib/domain/forms', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/forms')>('@/lib/domain/forms');
  return {
    ...actual,
    duplicateForm: mockDuplicateForm,
  };
});

describe('useDuplicateFormMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls duplicateForm and invalidates cache on success', async () => {
    const originalFormId = faker.string.uuid();
    const newFormId = faker.string.uuid();
    const newTitle = 'Copy of Form';
    const newSlug = 'copy-of-form';

    mockDuplicateForm.mockResolvedValueOnce(newFormId);

    const { result, queryClient } = renderHookWithClient(() => useDuplicateFormMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    await act(async () => {
      const returnedId = await result.current.mutateAsync({
        source_form_id: originalFormId,
        new_title: newTitle,
        new_slug: newSlug,
      });
      expect(returnedId).toBe(newFormId);
    });

    expect(mockDuplicateForm).toHaveBeenCalledWith({
      source_form_id: originalFormId,
      new_title: newTitle,
      new_slug: newSlug,
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ADMIN_FORMS_QUERY_KEY });
    });
  });

  it('throws when duplicateForm fails', async () => {
    const error = new Error('Duplicate failed');
    mockDuplicateForm.mockRejectedValueOnce(error);

    const { result } = renderHookWithClient(() => useDuplicateFormMutation());

    await expect(
      result.current.mutateAsync({
        source_form_id: faker.string.uuid(),
        new_title: 'Test',
        new_slug: 'test',
      }),
    ).rejects.toThrow('Duplicate failed');
  });
});
