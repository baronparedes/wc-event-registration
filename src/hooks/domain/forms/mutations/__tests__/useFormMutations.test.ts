import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import {
  useDeleteFormFieldMutation,
  useReorderFormFieldsMutation,
  useSaveFormFieldMutation,
  useSaveFormMutation,
  useSubmitFormMutation,
} from '@/hooks/domain/forms/mutations/useFormMutations';
import { adminFormQueryKey } from '@/hooks/domain/forms/queries/useAdminFormQuery';
import { ADMIN_FORMS_QUERY_KEY } from '@/hooks/domain/forms/queries/useAdminFormsQuery';
import { formFieldsQueryKey } from '@/hooks/domain/forms/queries/useFormFieldsQuery';

const { mockFrom, mockInvoke, mockSingle, mockRpc } = vi.hoisted(() => {
  const single = vi.fn();

  return {
    mockSingle: single,
    mockInvoke: vi.fn(),
    mockFrom: vi.fn(),
    mockRpc: vi.fn(),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    supabase: {
      from: mockFrom,
      rpc: mockRpc,
      functions: {
        invoke: mockInvoke,
      },
    },
  };
});

describe('useFormMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useSaveFormMutation', () => {
    it('updates an existing form when id is provided', async () => {
      const mockForm = { id: 'form-123', title: 'Updated Form' };
      mockSingle.mockResolvedValueOnce({ data: mockForm, error: null });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });

      mockFrom.mockReturnValue({ update });

      const { result, queryClient } = renderHookWithClient(() => useSaveFormMutation());
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      let savedForm;
      await act(async () => {
        savedForm = await result.current.mutateAsync({
          id: 'form-123',
          data: {
            title: 'Updated Form',
            slug: 'updated-form',
            audience: 'public',
            duplicate_policy: 'allow_multiple',
            status: 'draft',
            description: null,
            metadata: {},
          },
        });
      });

      expect(savedForm).toEqual(mockForm);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ title: 'Updated Form' }));
      expect(eq).toHaveBeenCalledWith('id', 'form-123');
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ADMIN_FORMS_QUERY_KEY });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: adminFormQueryKey('form-123'),
      });
    });

    it('inserts a new form when id is omitted', async () => {
      const mockForm = { id: 'form-456', title: 'New Form' };
      mockSingle.mockResolvedValueOnce({ data: mockForm, error: null });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const insert = vi.fn().mockReturnValue({ select });

      mockFrom.mockReturnValue({ insert });

      const { result, queryClient } = renderHookWithClient(() => useSaveFormMutation());
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      let savedForm;
      await act(async () => {
        savedForm = await result.current.mutateAsync({
          data: {
            title: 'New Form',
            slug: 'new-form',
            audience: 'members',
            duplicate_policy: 'block',
            status: 'draft',
            description: null,
            metadata: {},
          },
        });
      });

      expect(savedForm).toEqual(mockForm);
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'New Form' }));
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ADMIN_FORMS_QUERY_KEY });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: adminFormQueryKey('form-456'),
      });
    });

    it('handles form without id on success without breaking', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: null });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const insert = vi.fn().mockReturnValue({ select });
      mockFrom.mockReturnValue({ insert });

      const { result, queryClient } = renderHookWithClient(() => useSaveFormMutation());
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync({
          data: {
            title: 'No Id Form',
            slug: 'no-id',
            audience: 'public',
            duplicate_policy: 'allow_multiple',
            status: 'draft',
            description: null,
            metadata: {},
          },
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ADMIN_FORMS_QUERY_KEY });
      expect(invalidateQueriesSpy).not.toHaveBeenCalledWith(
        expect.objectContaining({ queryKey: ['admin-forms', 'detail', expect.anything()] }),
      );
    });

    it('throws error when update fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Update failed') });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ update });

      const { result } = renderHookWithClient(() => useSaveFormMutation());

      await expect(
        result.current.mutateAsync({
          id: 'form-123',
          data: {
            title: 'Fail Form',
            slug: 'fail',
            audience: 'public',
            duplicate_policy: 'allow_multiple',
            status: 'draft',
            description: null,
            metadata: {},
          },
        }),
      ).rejects.toThrow('Update failed');
    });

    it('throws error when insert fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Insert failed') });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const insert = vi.fn().mockReturnValue({ select });
      mockFrom.mockReturnValue({ insert });

      const { result } = renderHookWithClient(() => useSaveFormMutation());

      await expect(
        result.current.mutateAsync({
          data: {
            title: 'Fail Form',
            slug: 'fail',
            audience: 'public',
            duplicate_policy: 'allow_multiple',
            status: 'draft',
            description: null,
            metadata: {},
          },
        }),
      ).rejects.toThrow('Insert failed');
    });
  });

  describe('useSaveFormFieldMutation', () => {
    it('updates an existing form field when id is provided', async () => {
      const mockField = { id: 'field-1', label: 'Updated Label' };
      mockSingle.mockResolvedValueOnce({ data: mockField, error: null });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ update });

      const { result, queryClient } = renderHookWithClient(() =>
        useSaveFormFieldMutation('form-123'),
      );
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      let savedField;
      await act(async () => {
        savedField = await result.current.mutateAsync({
          id: 'field-1',
          data: {
            field_key: 'custom_field',
            label: 'Updated Label',
            field_type: 'text',
            is_required: true,
            is_active: true,
            placeholder: null,
            help_text: null,
            options: [],
            validation_rules: {},
            field_applicability: 'all',
            display_order: 1,
          },
        });
      });

      expect(savedField).toEqual(mockField);
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: formFieldsQueryKey('form-123', true),
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: formFieldsQueryKey('form-123', false),
      });
    });

    it('inserts a new form field with form_id attached', async () => {
      const mockField = { id: 'field-2', label: 'New Field' };
      mockSingle.mockResolvedValueOnce({ data: mockField, error: null });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const insert = vi.fn().mockReturnValue({ select });
      mockFrom.mockReturnValue({ insert });

      const { result, queryClient } = renderHookWithClient(() =>
        useSaveFormFieldMutation('form-123'),
      );
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      let savedField;
      await act(async () => {
        savedField = await result.current.mutateAsync({
          data: {
            field_key: 'new_field',
            label: 'New Field',
            field_type: 'number',
            is_required: false,
            is_active: true,
            placeholder: null,
            help_text: null,
            options: [],
            validation_rules: {},
            field_applicability: 'all',
            display_order: 2,
          },
        });
      });

      expect(savedField).toEqual(mockField);
      expect(insert).toHaveBeenCalledWith(
        expect.objectContaining({ form_id: 'form-123', field_key: 'new_field' }),
      );
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: formFieldsQueryKey('form-123', true),
      });
    });

    it('throws error when saving field fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Save field failed') });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const eq = vi.fn().mockReturnValue({ select });
      const update = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ update });

      const { result } = renderHookWithClient(() => useSaveFormFieldMutation('form-123'));

      await expect(
        result.current.mutateAsync({
          id: 'field-1',
          data: {
            field_key: 'failing',
            label: 'Fail',
            field_type: 'text',
            is_required: false,
            is_active: true,
            placeholder: null,
            help_text: null,
            options: [],
            validation_rules: {},
            field_applicability: 'all',
            display_order: 1,
          },
        }),
      ).rejects.toThrow('Save field failed');
    });

    it('throws error when inserting field fails', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: new Error('Insert field failed') });

      const select = vi.fn().mockReturnValue({ single: mockSingle });
      const insert = vi.fn().mockReturnValue({ select });
      mockFrom.mockReturnValue({ insert });

      const { result } = renderHookWithClient(() => useSaveFormFieldMutation('form-123'));

      await expect(
        result.current.mutateAsync({
          data: {
            field_key: 'failing_insert',
            label: 'Fail',
            field_type: 'text',
            is_required: false,
            is_active: true,
            placeholder: null,
            help_text: null,
            options: [],
            validation_rules: {},
            field_applicability: 'all',
            display_order: 1,
          },
        }),
      ).rejects.toThrow('Insert field failed');
    });
  });

  describe('useDeleteFormFieldMutation', () => {
    it('deletes form field and invalidates queries', async () => {
      const eq = vi.fn().mockResolvedValueOnce({ error: null });
      const deleteMock = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ delete: deleteMock });

      const { result, queryClient } = renderHookWithClient(() =>
        useDeleteFormFieldMutation('form-123'),
      );
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync('field-to-delete');
      });

      expect(mockFrom).toHaveBeenCalledWith('form_fields');
      expect(deleteMock).toHaveBeenCalled();
      expect(eq).toHaveBeenCalledWith('id', 'field-to-delete');
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: formFieldsQueryKey('form-123', true),
      });
    });

    it('throws error when delete fails', async () => {
      const eq = vi.fn().mockResolvedValueOnce({ error: new Error('Delete failed') });
      const deleteMock = vi.fn().mockReturnValue({ eq });
      mockFrom.mockReturnValue({ delete: deleteMock });

      const { result } = renderHookWithClient(() => useDeleteFormFieldMutation('form-123'));

      await expect(result.current.mutateAsync('field-fail')).rejects.toThrow('Delete failed');
    });
  });

  describe('useReorderFormFieldsMutation', () => {
    it('reorders fields and updates display_order for each item', async () => {
      mockRpc.mockResolvedValueOnce({ error: null });

      const { result, queryClient } = renderHookWithClient(() =>
        useReorderFormFieldsMutation('form-123'),
      );
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync(['field-a', 'field-b', 'field-c']);
      });

      expect(mockRpc).toHaveBeenCalledWith('reorder_form_fields', {
        p_form_id: 'form-123',
        p_field_ids: ['field-a', 'field-b', 'field-c'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: formFieldsQueryKey('form-123', true),
      });
    });

    it('throws error when one of the updates fails', async () => {
      mockRpc.mockResolvedValueOnce({ error: new Error('Reorder failed') });

      const { result } = renderHookWithClient(() => useReorderFormFieldsMutation('form-123'));

      await expect(result.current.mutateAsync(['field-a', 'field-b'])).rejects.toThrow(
        'Reorder failed',
      );
    });
  });

  describe('useSubmitFormMutation', () => {
    it('submits form response successfully and invalidates submissions query', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: true, submission_id: 'sub-new-123' },
        error: null,
      });

      const { result, queryClient } = renderHookWithClient(() => useSubmitFormMutation());
      const invalidateQueriesSpy = vi.spyOn(queryClient, 'invalidateQueries');

      let response;
      await act(async () => {
        response = await result.current.mutateAsync({
          form_slug: 'volunteer-signup',
          responses: { question_1: 'Yes' },
          idempotency_key: 'idem-123',
        });
      });

      expect(mockInvoke).toHaveBeenCalledWith('submit-form-submission', {
        body: expect.objectContaining({
          form_slug: 'volunteer-signup',
          idempotency_key: 'idem-123',
        }),
      });
      expect(response).toEqual({ success: true, submission_id: 'sub-new-123' });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['form-submissions'] });
    });

    it('throws error when supabase function invoke encounters error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: null,
        error: new Error('Function invocation error'),
      });

      const { result } = renderHookWithClient(() => useSubmitFormMutation());

      await expect(
        result.current.mutateAsync({
          form_slug: 'volunteer-signup',
          responses: {},
          idempotency_key: 'idem-err',
        }),
      ).rejects.toThrow('Function invocation error');
    });

    it('throws custom error message when data.success is false', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: false, error: 'User already submitted' },
        error: null,
      });

      const { result } = renderHookWithClient(() => useSubmitFormMutation());

      await expect(
        result.current.mutateAsync({
          form_slug: 'volunteer-signup',
          responses: {},
          idempotency_key: 'idem-dup',
        }),
      ).rejects.toThrow('User already submitted');
    });

    it('throws default error message when data.success is false with empty error', async () => {
      mockInvoke.mockResolvedValueOnce({
        data: { success: false, error: '' },
        error: null,
      });

      const { result } = renderHookWithClient(() => useSubmitFormMutation());

      await expect(
        result.current.mutateAsync({
          form_slug: 'volunteer-signup',
          responses: {},
          idempotency_key: 'idem-def',
        }),
      ).rejects.toThrow('Failed to submit form response');
    });
  });
});
