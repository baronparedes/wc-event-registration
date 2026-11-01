import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';

import {
  useAppendBlueprintFieldsMutation,
  useCreateEventWithBlueprintMutation,
  useCreateFormWithBlueprintMutation,
  useGenerateEntityBlueprintMutation,
} from '../index';

const {
  mockGenerateEntityBlueprint,
  mockCreateEventWithBlueprint,
  mockCreateFormWithBlueprint,
  mockAppendEventFieldsFromBlueprint,
  mockAppendFormFieldsFromBlueprint,
} = vi.hoisted(() => ({
  mockGenerateEntityBlueprint: vi.fn(),
  mockCreateEventWithBlueprint: vi.fn(),
  mockCreateFormWithBlueprint: vi.fn(),
  mockAppendEventFieldsFromBlueprint: vi.fn(),
  mockAppendFormFieldsFromBlueprint: vi.fn(),
}));

vi.mock('@/lib/domain/ai-generator', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/ai-generator')>(
    '@/lib/domain/ai-generator',
  );
  return {
    ...actual,
    generateEntityBlueprint: mockGenerateEntityBlueprint,
    createEventWithBlueprint: mockCreateEventWithBlueprint,
    createFormWithBlueprint: mockCreateFormWithBlueprint,
    appendEventFieldsFromBlueprint: mockAppendEventFieldsFromBlueprint,
    appendFormFieldsFromBlueprint: mockAppendFormFieldsFromBlueprint,
  };
});

describe('ai-generator domain hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useGenerateEntityBlueprintMutation', () => {
    it('calls generateEntityBlueprint and invokes onSuccess', async () => {
      const mockResult = {
        domain: 'event' as const,
        metadata: {
          title: 'Camp 2026',
          slug: 'camp-2026',
          description: 'Camp description',
          audience: 'members_and_public' as const,
          duplicate_policy: 'block' as const,
        },
        fields: [],
      };
      mockGenerateEntityBlueprint.mockResolvedValueOnce(mockResult);

      const onSuccess = vi.fn();
      const { result } = renderHookWithClient(() =>
        useGenerateEntityBlueprintMutation({ onSuccess }),
      );

      await act(async () => {
        await result.current.mutateAsync({
          domain: 'event',
          prompt: 'Summer Camp for Youth',
        });
      });

      expect(mockGenerateEntityBlueprint).toHaveBeenCalledWith({
        domain: 'event',
        prompt: 'Summer Camp for Youth',
      });
      expect(onSuccess).toHaveBeenCalled();
      expect(onSuccess.mock.calls[0][0]).toEqual(mockResult);
    });

    it('handles generation errors', async () => {
      const err = new Error('AI service error');
      mockGenerateEntityBlueprint.mockRejectedValueOnce(err);

      const onError = vi.fn();
      const { result } = renderHookWithClient(() =>
        useGenerateEntityBlueprintMutation({ onError }),
      );

      await act(async () => {
        try {
          await result.current.mutateAsync({
            domain: 'event',
            prompt: 'Invalid prompt',
          });
        } catch {
          // Expected
        }
      });

      expect(onError).toHaveBeenCalled();
      expect(onError.mock.calls[0][0]).toEqual(err);
    });
  });

  describe('useCreateEventWithBlueprintMutation', () => {
    it('creates event with blueprint and invalidates admin-events query cache', async () => {
      mockCreateEventWithBlueprint.mockResolvedValueOnce({
        id: 'new-evt-1',
        slug: 'camp-2026',
      });

      const { result, queryClient } = renderHookWithClient(() =>
        useCreateEventWithBlueprintMutation(),
      );
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync({
          metadata: {
            title: 'Camp 2026',
            slug: 'camp-2026',
            description: 'Camp desc',
            audience: 'members_and_public',
            duplicate_policy: 'block',
          },
          fields: [],
        });
      });

      expect(mockCreateEventWithBlueprint).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin-events'] });
    });
  });

  describe('useCreateFormWithBlueprintMutation', () => {
    it('creates form with blueprint and invalidates admin-forms query cache', async () => {
      mockCreateFormWithBlueprint.mockResolvedValueOnce({
        id: 'new-form-1',
        slug: 'feedback-form',
      });

      const { result, queryClient } = renderHookWithClient(() =>
        useCreateFormWithBlueprintMutation(),
      );
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync({
          metadata: {
            title: 'Feedback Form',
            slug: 'feedback-form',
            description: 'Feedback desc',
            audience: 'public',
            duplicate_policy: 'allow_multiple',
          },
          fields: [],
        });
      });

      expect(mockCreateFormWithBlueprint).toHaveBeenCalled();
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin-forms'] });
    });
  });

  describe('useAppendBlueprintFieldsMutation', () => {
    it('appends event fields and invalidates admin-event-fields query cache', async () => {
      mockAppendEventFieldsFromBlueprint.mockResolvedValueOnce(undefined);

      const { result, queryClient } = renderHookWithClient(() =>
        useAppendBlueprintFieldsMutation(),
      );
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync({
          domain: 'event',
          entityId: 'evt-999',
          fields: [
            {
              field_key: 'tshirt_size',
              label: 'T-Shirt Size',
              field_type: 'select',
              is_required: true,
              options: [{ label: 'M', value: 'm' }],
              validation_rules: {},
            },
          ],
        });
      });

      expect(mockAppendEventFieldsFromBlueprint).toHaveBeenCalledWith('evt-999', expect.any(Array));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['admin-event-fields', 'evt-999'] });
    });

    it('appends form fields and invalidates form-fields query cache', async () => {
      mockAppendFormFieldsFromBlueprint.mockResolvedValueOnce(undefined);

      const { result, queryClient } = renderHookWithClient(() =>
        useAppendBlueprintFieldsMutation(),
      );
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        await result.current.mutateAsync({
          domain: 'form',
          entityId: 'frm-888',
          fields: [
            {
              field_key: 'feedback',
              label: 'Comments',
              field_type: 'textarea',
              is_required: false,
              options: [],
              validation_rules: {},
            },
          ],
        });
      });

      expect(mockAppendFormFieldsFromBlueprint).toHaveBeenCalledWith('frm-888', expect.any(Array));
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['form-fields', 'frm-888'] });
    });
  });
});
