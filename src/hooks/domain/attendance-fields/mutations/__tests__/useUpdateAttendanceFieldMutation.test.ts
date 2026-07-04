import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { QUERY_KEYS } from '@/config/constants';
import { useUpdateAttendanceFieldMutation } from '@/hooks/domain/attendance-fields/mutations/useUpdateAttendanceFieldMutation';
import type { AttendanceField } from '@/lib/domain/attendance-fields';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
  };

  queryBuilder.update.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.single.mockReturnValue(queryBuilder);

  return {
    mockQueryBuilder: queryBuilder,
    mockFrom: vi.fn(() => queryBuilder),
  };
});

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');

  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
  };
});

describe('useUpdateAttendanceFieldMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const qb = mockQueryBuilder;
    qb.update.mockReturnValue(qb);
    qb.eq.mockReturnValue(qb);
    qb.select.mockReturnValue(qb);
    qb.single.mockReturnValue(qb);
  });

  it('updates field label', async () => {
    const updatedField: AttendanceField = {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'table',
      label: 'Updated Label',
      field_type: 'number',
      is_required: true,
      is_active: true,
      display_order: 0,
      options: [],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: updatedField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      label: 'Updated Label',
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response).toEqual(updatedField);
    expect(mockQueryBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Updated Label',
      }),
    );
  });

  it('updates field is_required', async () => {
    const updatedField: AttendanceField = {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'table',
      label: 'Table',
      field_type: 'number',
      is_required: false,
      is_active: true,
      display_order: 0,
      options: [],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: updatedField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      is_required: false,
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response.is_required).toBe(false);
  });

  it('updates field is_active status', async () => {
    const updatedField: AttendanceField = {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'table',
      label: 'Table',
      field_type: 'number',
      is_required: true,
      is_active: false,
      display_order: 0,
      options: [],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: updatedField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      is_active: false,
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response.is_active).toBe(false);
  });

  it('updates field options', async () => {
    const options = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
    ];
    const updatedField: AttendanceField = {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'choice',
      label: 'Choice',
      field_type: 'select',
      is_required: true,
      is_active: true,
      display_order: 0,
      options,
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: updatedField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      options,
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response.options).toEqual(options);
  });

  it('updates field validation_rules', async () => {
    const validationRules = { min_length: 5, max_length: 100 };
    const updatedField: AttendanceField = {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'name',
      label: 'Name',
      field_type: 'text',
      is_required: true,
      is_active: true,
      display_order: 0,
      options: [],
      validation_rules: validationRules,
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: updatedField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      validation_rules: validationRules,
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response.validation_rules).toEqual(validationRules);
  });

  it('filters out id and event_id from update payload', async () => {
    const updatedField: AttendanceField = {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'table',
      label: 'Updated',
      field_type: 'number',
      is_required: true,
      is_active: true,
      display_order: 0,
      options: [],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: updatedField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      label: 'Updated',
    };

    await act(async () => result.current.mutateAsync(input));

    const updateCall = mockQueryBuilder.update.mock.calls[0][0];
    expect(updateCall).not.toHaveProperty('id');
    expect(updateCall).not.toHaveProperty('event_id');
    expect(updateCall).toHaveProperty('label', 'Updated');
  });

  it('filters by both id and event_id', async () => {
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: { id: 'field-1', event_id: 'event-1' },
      error: null,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      label: 'Updated',
    };

    await act(async () => result.current.mutateAsync(input));

    const eqCalls = mockQueryBuilder.eq.mock.calls;
    expect(eqCalls).toContainEqual(['id', 'field-1']);
    expect(eqCalls).toContainEqual(['event_id', 'event-1']);
  });

  it('invalidates query with correct event_id', async () => {
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'field-1',
        event_id: 'event-xyz',
        field_key: 'test',
        label: 'Test',
        field_type: 'text',
        is_required: false,
        is_active: true,
        display_order: 0,
        options: [],
        validation_rules: {},
        created_at: '2026-07-01T00:00:00Z',
        updated_at: '2026-07-01T00:00:00Z',
      },
      error: null,
    });

    const { result, queryClient } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const input = {
      id: 'field-1',
      event_id: 'event-xyz',
      label: 'Updated',
    };

    await act(async () => result.current.mutateAsync(input));

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: QUERY_KEYS.adminAttendanceFields('event-xyz'),
      });
    });
  });

  it('throws error when update fails', async () => {
    const error = new Error('Update failed');
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      label: 'Updated',
    };

    await expect(act(async () => result.current.mutateAsync(input))).rejects.toThrow(
      'Update failed',
    );
  });

  it('updates multiple properties at once', async () => {
    const updatedField: AttendanceField = {
      id: 'field-1',
      event_id: 'event-1',
      field_key: 'table',
      label: 'Table Number (Updated)',
      field_type: 'number',
      is_required: false,
      is_active: false,
      display_order: 5,
      options: [],
      validation_rules: { min: 1, max: 100 },
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: updatedField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useUpdateAttendanceFieldMutation());

    const input = {
      id: 'field-1',
      event_id: 'event-1',
      label: 'Table Number (Updated)',
      is_required: false,
      is_active: false,
      display_order: 5,
      validation_rules: { min: 1, max: 100 },
    };

    const response = await act(async () => result.current.mutateAsync(input));

    expect(response.label).toBe('Table Number (Updated)');
    expect(response.is_required).toBe(false);
    expect(response.is_active).toBe(false);
  });
});
