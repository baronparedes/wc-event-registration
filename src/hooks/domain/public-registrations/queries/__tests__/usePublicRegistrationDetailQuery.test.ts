import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { usePublicRegistrationDetailQuery } from '@/hooks/domain/public-registrations/queries/usePublicRegistrationDetailQuery';

const { mockRegistrationBuilder, mockAnswersBuilder, mockFrom } = vi.hoisted(() => {
  const registrationBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  registrationBuilder.select.mockReturnValue(registrationBuilder);
  registrationBuilder.eq.mockReturnValue(registrationBuilder);

  const answersBuilder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
  };
  answersBuilder.select.mockReturnValue(answersBuilder);

  const from = vi.fn((table: string) => {
    if (table === 'public_registrations') return registrationBuilder;
    if (table === 'public_registration_answers') return answersBuilder;
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    mockRegistrationBuilder: registrationBuilder,
    mockAnswersBuilder: answersBuilder,
    mockFrom: from,
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

describe('usePublicRegistrationDetailQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns transformed public registration details with parsed answer types', async () => {
    const registrationId = faker.string.uuid();
    const eventId = faker.string.uuid();

    mockRegistrationBuilder.single.mockResolvedValueOnce({
      data: {
        id: registrationId,
        event_id: eventId,
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: null,
        email: 'jane@example.com',
        phone: null,
        status: 'submitted',
        submitted_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
      },
      error: null,
    });

    mockAnswersBuilder.eq.mockResolvedValueOnce({
      data: [
        {
          id: faker.string.uuid(),
          event_field_id: 'f1',
          answer_text: '["A","B"]',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f1',
            field_key: 'choices',
            label: 'Choices',
            field_type: 'multi_select',
            display_order: 2,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f2',
          answer_text: '9',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f2',
            field_key: 'score',
            label: 'Score',
            field_type: 'number',
            display_order: 3,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f3',
          answer_text: 'not-json',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f3',
            field_key: 'raw',
            label: 'Raw',
            field_type: 'select',
            display_order: 4,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f4',
          answer_text: 'true',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f4',
            field_key: 'agree',
            label: 'Agree',
            field_type: 'boolean',
            display_order: 5,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f5',
          answer_text: '',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f5',
            field_key: 'empty',
            label: 'Empty',
            field_type: 'text',
            display_order: 1,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f6',
          answer_text: 'abc',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f6',
            field_key: 'score_raw',
            label: 'Score Raw',
            field_type: 'number',
            display_order: 6,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f7',
          answer_text: 'false',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f7',
            field_key: 'agree2',
            label: 'Agree2',
            field_type: 'boolean',
            display_order: 7,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f8',
          answer_text: 'fallback',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: null,
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f9',
          answer_text: null,
          answer_number: 42,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f9',
            field_key: 'score_typed',
            label: 'Score Typed',
            field_type: 'number',
            display_order: 8,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f10',
          answer_text: null,
          answer_number: null,
          answer_boolean: false,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f10',
            field_key: 'agree_typed',
            label: 'Agree Typed',
            field_type: 'boolean',
            display_order: 9,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f11',
          answer_text: null,
          answer_number: null,
          answer_boolean: null,
          answer_date: '2026-07-22',
          answer_json: null,
          event_fields: {
            id: 'f11',
            field_key: 'service_date',
            label: 'Service Date',
            field_type: 'date',
            display_order: 10,
          },
        },
        {
          id: faker.string.uuid(),
          event_field_id: 'f12',
          answer_text: null,
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: ['Alpha', 'Beta'],
          event_fields: {
            id: 'f12',
            field_key: 'choices_typed',
            label: 'Choices Typed',
            field_type: 'multi_select',
            display_order: 11,
          },
        },
      ],
      error: null,
    });

    const { result } = renderHookWithClient(() => usePublicRegistrationDetailQuery(registrationId));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.registration).toMatchObject({
      id: registrationId,
      event_id: eventId,
    });
    expect(result.current.data?.fieldResponses).toMatchObject([
      { field_id: 'f8', field_name: '', field_label: '', field_type: 'text', answer: 'fallback' },
      { field_id: 'f5', answer: null },
      { field_id: 'f1', answer: ['A', 'B'] },
      { field_id: 'f2', answer: 9 },
      { field_id: 'f3', answer: 'not-json' },
      { field_id: 'f4', answer: true },
      { field_id: 'f6', answer: 'abc' },
      { field_id: 'f7', answer: false },
      { field_id: 'f9', answer: 42 },
      { field_id: 'f10', answer: false },
      { field_id: 'f11', answer: '2026-07-22' },
      { field_id: 'f12', answer: ['Alpha', 'Beta'] },
    ]);
  });

  it('returns query error state when registration is not found', async () => {
    mockRegistrationBuilder.single.mockResolvedValueOnce({ data: null, error: null });

    const { result } = renderHookWithClient(() =>
      usePublicRegistrationDetailQuery(faker.string.uuid()),
    );

    const refetchResult = await result.current.refetch();
    expect(refetchResult.isError).toBe(true);
  });

  it('returns query error state when registration lookup fails', async () => {
    mockRegistrationBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('registration query failed'),
    });

    const { result } = renderHookWithClient(() =>
      usePublicRegistrationDetailQuery(faker.string.uuid()),
    );

    const refetchResult = await result.current.refetch();
    expect(refetchResult.isError).toBe(true);
  });

  it('returns query error state when answers lookup fails', async () => {
    mockRegistrationBuilder.single.mockResolvedValueOnce({
      data: {
        id: faker.string.uuid(),
        event_id: faker.string.uuid(),
        first_name: 'Jane',
        last_name: 'Doe',
        nickname: null,
        email: 'jane@example.com',
        phone: null,
        status: 'submitted',
        submitted_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
      },
      error: null,
    });

    mockAnswersBuilder.eq.mockResolvedValueOnce({
      data: null,
      error: new Error('answer lookup failed'),
    });

    const { result } = renderHookWithClient(() =>
      usePublicRegistrationDetailQuery(faker.string.uuid()),
    );

    const refetchResult = await result.current.refetch();
    expect(refetchResult.isError).toBe(true);
  });
});
