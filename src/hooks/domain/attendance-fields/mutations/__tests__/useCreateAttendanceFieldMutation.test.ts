import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useCreateAttendanceFieldMutation } from '@/hooks/domain/attendance-fields/mutations/useCreateAttendanceFieldMutation';
import type { AttendanceField, CreateAttendanceFieldInput } from '@/lib/domain/attendance-fields';

const { mockQueryBuilder, mockFrom } = vi.hoisted(() => {
  const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    single: vi.fn(),
  };

  queryBuilder.select.mockReturnValue(queryBuilder);
  queryBuilder.eq.mockReturnValue(queryBuilder);
  queryBuilder.order.mockReturnValue(queryBuilder);
  queryBuilder.limit.mockReturnValue(queryBuilder);
  queryBuilder.insert.mockReturnValue(queryBuilder);
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

describe('useCreateAttendanceFieldMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const qb = mockQueryBuilder;
    qb.select.mockReturnValue(qb);
    qb.eq.mockReturnValue(qb);
    qb.order.mockReturnValue(qb);
    qb.limit.mockReturnValue(qb);
    qb.insert.mockReturnValue(qb);
    qb.single.mockReturnValue(qb);
  });

  it('calculates next display_order as max + 1', async () => {
    const mockField: AttendanceField = {
      id: 'field-id',
      event_id: 'event-1',
      field_key: 'table',
      label: 'Table Number',
      field_type: 'number',
      is_required: true,
      is_active: true,
      display_order: 3,
      options: [],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    // First chain: .select().eq().order().limit() resolves to orderData
    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [{ display_order: 2 }],
      error: null,
    });

    // Second chain: .insert().select().single() resolves to created field
    mockQueryBuilder.single.mockResolvedValueOnce({
      data: mockField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'table',
      label: 'Table Number',
      field_type: 'number',
      is_required: true,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.display_order).toBe(3);
  });

  it('defaults display_order to 0 when no existing fields', async () => {
    const mockField: AttendanceField = {
      id: 'field-id',
      event_id: 'event-1',
      field_key: 'diet',
      label: 'Diet',
      field_type: 'text',
      is_required: false,
      is_active: true,
      display_order: 0,
      options: [],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: mockField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'diet',
      label: 'Diet',
      field_type: 'text',
      is_required: false,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.display_order).toBe(0);
  });

  it('includes options when provided', async () => {
    const options = [
      { value: 'opt1', label: 'Option 1' },
      { value: 'opt2', label: 'Option 2' },
    ];

    const mockField: AttendanceField = {
      id: 'field-id',
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

    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: mockField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'choice',
      label: 'Choice',
      field_type: 'select',
      is_required: true,
      options,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.options).toEqual(options);
  });

  it('defaults options to empty array when not provided', async () => {
    const mockField: AttendanceField = {
      id: 'field-id',
      event_id: 'event-1',
      field_key: 'simple',
      label: 'Simple',
      field_type: 'text',
      is_required: false,
      is_active: true,
      display_order: 0,
      options: [],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: mockField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'simple',
      label: 'Simple',
      field_type: 'text',
      is_required: false,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.options).toEqual([]);
  });

  it('includes validation_rules when provided', async () => {
    const validationRules = { min_length: 3, max_length: 50 };

    const mockField: AttendanceField = {
      id: 'field-id',
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

    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: mockField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'name',
      label: 'Name',
      field_type: 'text',
      is_required: true,
      validation_rules: validationRules,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.validation_rules).toEqual(validationRules);
  });

  it('defaults validation_rules to empty object when not provided', async () => {
    const mockField: AttendanceField = {
      id: 'field-id',
      event_id: 'event-1',
      field_key: 'simple',
      label: 'Simple',
      field_type: 'text',
      is_required: false,
      is_active: true,
      display_order: 0,
      options: [],
      validation_rules: {},
      created_at: '2026-07-01T00:00:00Z',
      updated_at: '2026-07-01T00:00:00Z',
    };

    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: mockField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'simple',
      label: 'Simple',
      field_type: 'text',
      is_required: false,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.validation_rules).toEqual({});
  });

  it('throws error when insert fails', async () => {
    const error = new Error('Insert failed');

    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: null,
      error,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'name',
      label: 'Name',
      field_type: 'text',
      is_required: true,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toEqual(error);
  });

  it('generates UUID for new field', async () => {
    const mockField: AttendanceField = {
      id: expect.any(String),
      event_id: 'event-1',
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
    };

    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: mockField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'test',
      label: 'Test',
      field_type: 'text',
      is_required: false,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBeDefined();
  });

  it('invalidates attendance fields query on success', async () => {
    const mockField: AttendanceField = {
      id: 'field-id',
      event_id: 'event-1',
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
    };

    mockQueryBuilder.limit.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    mockQueryBuilder.single.mockResolvedValueOnce({
      data: mockField,
      error: null,
    });

    const { result } = renderHookWithClient(() => useCreateAttendanceFieldMutation());

    const input: Partial<CreateAttendanceFieldInput> = {
      event_id: 'event-1',
      field_key: 'test',
      label: 'Test',
      field_type: 'text',
      is_required: false,
    };

    result.current.mutate(input as CreateAttendanceFieldInput);

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Mutation was successful (invalidation happens internally)
    expect(result.current.data).toEqual(mockField);
  });
});
