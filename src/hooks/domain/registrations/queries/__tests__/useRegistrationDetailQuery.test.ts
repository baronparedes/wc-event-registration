import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockRegistrationsBuilder, mockUsersBuilder, mockAnswersBuilder, mockFrom } = vi.hoisted(
  () => {
    const registrationsBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    }
    registrationsBuilder.select.mockReturnValue(registrationsBuilder)
    registrationsBuilder.eq.mockReturnValue(registrationsBuilder)

    const usersBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    }
    usersBuilder.select.mockReturnValue(usersBuilder)
    usersBuilder.eq.mockReturnValue(usersBuilder)

    const answersBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
    }
    answersBuilder.select.mockReturnValue(answersBuilder)

    const from = vi.fn((table: string) => {
      if (table === 'registrations') return registrationsBuilder
      if (table === 'users') return usersBuilder
      if (table === 'registration_answers') return answersBuilder
      throw new Error(`Unexpected table: ${table}`)
    })

    return {
      mockRegistrationsBuilder: registrationsBuilder,
      mockUsersBuilder: usersBuilder,
      mockAnswersBuilder: answersBuilder,
      mockFrom: from,
    }
  },
)

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')

  return {
    ...actual,
    supabase: {
      from: mockFrom,
    },
  }
})

import { useRegistrationDetailQuery } from '@/hooks/domain/registrations/queries/useRegistrationDetailQuery'

describe('useRegistrationDetailQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns registration detail with transformed field responses', async () => {
    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'reg-1',
        event_id: 'evt-1',
        user_id: 'user-1',
        status: 'submitted',
        submitted_at: '2026-06-26T10:00:00.000Z',
        updated_at: '2026-06-26T10:00:00.000Z',
      },
      error: null,
    })

    mockUsersBuilder.single.mockResolvedValueOnce({
      data: {
        id: 'user-1',
        member_id: 'WC-001',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        nickname: 'J',
        metadata: { role: 'player', category: 'adult' },
      },
      error: null,
    })

    mockAnswersBuilder.eq.mockResolvedValueOnce({
      data: [
        {
          id: 'ans-1',
          event_field_id: 'field-1',
          answer_text: 'A-Team',
          answer_number: null,
          answer_boolean: null,
          answer_date: null,
          answer_json: null,
          event_fields: {
            id: 'field-1',
            field_key: 'team_name',
            label: 'Team Name',
            field_type: 'text',
            display_order: 0,
          },
        },
      ],
      error: null,
    })

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery('reg-1'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      registration: {
        id: 'reg-1',
        event_id: 'evt-1',
        user_id: 'user-1',
        status: 'submitted',
        submitted_at: '2026-06-26T10:00:00.000Z',
        updated_at: '2026-06-26T10:00:00.000Z',
      },
      member: {
        user_id: 'user-1',
        member_id: 'WC-001',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        nickname: 'J',
        role: 'player',
        category: 'adult',
      },
      fieldResponses: [
        {
          field_id: 'field-1',
          field_name: 'team_name',
          field_label: 'Team Name',
          field_type: 'text',
          answer: 'A-Team',
        },
      ],
    })
  })

  it('returns query error state when registration is not found', async () => {
    mockRegistrationsBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error('not found'),
    })

    const { result } = renderHookWithClient(() => useRegistrationDetailQuery('missing-reg'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
