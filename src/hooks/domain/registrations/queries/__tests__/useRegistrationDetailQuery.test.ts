import { faker } from '@faker-js/faker';
import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderHookWithClient } from '@/__tests__/unit-test-utils';
import { useRegistrationDetailQuery } from '@/hooks/domain/registrations/queries/useRegistrationDetailQuery';

const { mockRegistrationsBuilder, mockUsersBuilder, mockAnswersBuilder, mockFrom } = vi.hoisted(
  () => {
    const registrationsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    registrationsBuilder.select.mockReturnValue(registrationsBuilder);
    registrationsBuilder.eq.mockReturnValue(registrationsBuilder);

    const usersBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    };
    usersBuilder.select.mockReturnValue(usersBuilder);
    usersBuilder.eq.mockReturnValue(usersBuilder);

    const answersBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
    };
    answersBuilder.select.mockReturnValue(answersBuilder);
    answersBuilder.eq.mockReturnValue(answersBuilder);

    const from = vi.fn((table: string) => {
      if (table === 'registrations') return registrationsBuilder;
      if (table === 'users') return usersBuilder;
      if (table === 'registration_answers') return answersBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });

    return {
      mockRegistrationsBuilder: registrationsBuilder,
      mockUsersBuilder: usersBuilder,
      mockAnswersBuilder: answersBuilder,
      mockFrom: from,
    };
  },
);

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

describe('useRegistrationDetailQuery', () => {
  let testRegId: string;
  let testEventId: string;
  let testUserId: string;
  let testFieldId: string;
  let testAnswerId: string;

  beforeEach(() => {
    // Generate stable IDs once per test to ensure queryKey doesn't change
    testRegId = faker.string.uuid();
    testEventId = faker.string.uuid();
    testUserId = faker.string.uuid();
    testFieldId = faker.string.uuid();
    testAnswerId = faker.string.uuid();
    // Clear mock call history
    mockRegistrationsBuilder.single.mockClear();
    mockUsersBuilder.single.mockClear();
    mockAnswersBuilder.eq.mockClear();
    mockFrom.mockClear();
  });

  it('returns registration detail with transformed field responses', async () => {
    const submittedAt = faker.date.recent().toISOString();
    const updatedAt = faker.date.recent().toISOString();

    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: {
        id: testRegId,
        event_id: testEventId,
        user_id: testUserId,
        status: 'submitted',
        submitted_at: submittedAt,
        updated_at: updatedAt,
      },
      error: null,
    });

    const userEmail = faker.internet.email();
    const userName = faker.person.fullName();
    const userNickname = faker.person.firstName();
    mockUsersBuilder.single.mockResolvedValueOnce({
      data: {
        id: testUserId,
        member_id: faker.helpers.slugify(faker.lorem.words(2)).toUpperCase(),
        full_name: userName,
        email: userEmail,
        phone: null,
        nickname: userNickname,
        role: 'player',
        category: 'adult',
      },
      error: null,
    });

    const teamName = faker.company.name();
    mockAnswersBuilder.eq.mockResolvedValueOnce({
      data: [
        {
          id: testAnswerId,
          event_field_id: testFieldId,
          answer_text: teamName,
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: testFieldId,
            field_key: 'team_name',
            label: 'Team Name',
            field_type: 'text',
            display_order: 0,
          },
        },
      ],
      error: null,
    });

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery(testRegId));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      registration: {
        id: testRegId,
        event_id: testEventId,
        user_id: testUserId,
        status: 'submitted',
      },
      fieldResponses: [
        {
          field_id: testFieldId,
          field_name: 'team_name',
          field_label: 'Team Name',
          field_type: 'text',
          answer: teamName,
        },
      ],
    });
  });

  it('returns query error state when registration is not found', async () => {
    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('not found'),
    });

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery(testRegId));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns query error state when registration row is missing without a supabase error', async () => {
    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery(testRegId));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('returns query error state when member lookup fails', async () => {
    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'reg-1',
        event_id: 'evt-1',
        user_id: 'user-1',
        status: 'submitted',
        submitted_at: '2026-06-26T10:00:00.000Z',
        updated_at: null,
      },
      error: null,
    });

    mockUsersBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('missing user'),
    });

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery('reg-1'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('returns query error state when answer lookup fails', async () => {
    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'reg-1',
        event_id: 'evt-1',
        user_id: 'user-1',
        status: 'submitted',
        submitted_at: '2026-06-26T10:00:00.000Z',
        updated_at: null,
      },
      error: null,
    });

    mockUsersBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        nickname: null,
        role: '',
        category: '',
      },
      error: null,
    });

    mockAnswersBuilder.eq.mockResolvedValueOnce({
      data: null,
      error: new Error('answer failure'),
    });

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery('reg-1'));

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('transforms mixed answer types and empty role/category fallback values', async () => {
    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'reg-2',
        event_id: 'evt-2',
        user_id: 'user-2',
        status: 'updated',
        submitted_at: '2026-06-26T10:00:00.000Z',
        updated_at: '2026-06-26T10:05:00.000Z',
      },
      error: null,
    });

    mockUsersBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'user-2',
        member_id: 'WC-002',
        full_name: 'John Doe',
        email: 'john@example.com',
        phone: '123',
        nickname: null,
        role: 7,
        category: false,
      },
      error: null,
    });

    mockAnswersBuilder.eq.mockResolvedValueOnce({
      data: [
        {
          id: 'a1',
          event_field_id: 'f-order-2',
          answer_text: '9',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f-order-2',
            field_key: 'score',
            label: 'Score',
            field_type: 'number',
            display_order: 2,
          },
        },
        {
          id: 'a2',
          event_field_id: 'f-order-1',
          answer_text: '["A","B"]',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f-order-1',
            field_key: 'choices',
            label: 'Choices',
            field_type: 'multi_select',
            display_order: 1,
          },
        },
        {
          id: 'a3',
          event_field_id: 'f-order-3',
          answer_text: 'not-json',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f-order-3',
            field_key: 'raw',
            label: 'Raw',
            field_type: 'select',
            display_order: 3,
          },
        },
        {
          id: 'a4',
          event_field_id: 'f-order-4',
          answer_text: 'true',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f-order-4',
            field_key: 'agree',
            label: 'Agree',
            field_type: 'boolean',
            display_order: 4,
          },
        },
        {
          id: 'a5',
          event_field_id: 'f-order-5',
          answer_text: '2026-06-28',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'f-order-5',
            field_key: 'start',
            label: 'Start',
            field_type: 'date',
            display_order: 5,
          },
        },
      ],
      error: null,
    });

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery('reg-2'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.member.role).toBe('');
    expect(result.current.data?.member.category).toBe('');
    expect(result.current.data?.fieldResponses.map((item) => item.field_id)).toEqual([
      'f-order-1',
      'f-order-2',
      'f-order-3',
      'f-order-4',
      'f-order-5',
    ]);
    expect(result.current.data?.fieldResponses[0]?.answer).toEqual(['A', 'B']);
    expect(result.current.data?.fieldResponses[1]?.answer).toBe(9);
    expect(result.current.data?.fieldResponses[2]?.answer).toBe('not-json');
    expect(result.current.data?.fieldResponses[3]?.answer).toBe(true);
    expect(result.current.data?.fieldResponses[4]?.answer).toBe('2026-06-28');
  });

  it('handles null answers and unknown field metadata defaults', async () => {
    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'reg-3',
        event_id: 'evt-3',
        user_id: 'user-3',
        status: 'submitted',
        submitted_at: '2026-06-26T10:00:00.000Z',
        updated_at: null,
      },
      error: null,
    });

    mockUsersBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'user-3',
        member_id: 'WC-003',
        full_name: 'Sam Doe',
        email: 'sam@example.com',
        phone: null,
        nickname: null,
        metadata: {},
      },
      error: null,
    });

    mockAnswersBuilder.eq.mockResolvedValueOnce({
      data: [
        {
          id: 'a1',
          event_field_id: 'unknown-1',
          answer_text: null,
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: null,
        },
      ],
      error: null,
    });

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery('reg-3'));

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.fieldResponses[0]).toEqual({
      field_id: 'unknown-1',
      field_name: '',
      field_label: '',
      field_type: 'text',
      answer: null,
    });
  });
});
