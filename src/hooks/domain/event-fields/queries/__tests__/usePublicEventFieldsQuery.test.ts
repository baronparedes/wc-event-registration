import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockQueryBuilder, mockFrom, mockLogger, mockValidatePublicEventFieldConfig } = vi.hoisted(
  () => {
    const queryBuilder: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      returns: vi.fn(),
    }

    queryBuilder.select.mockReturnValue(queryBuilder)
    queryBuilder.eq.mockReturnValue(queryBuilder)
    queryBuilder.order.mockReturnValue(queryBuilder)

    return {
      mockQueryBuilder: queryBuilder,
      mockFrom: vi.fn(() => queryBuilder),
      mockLogger: { debug: vi.fn() },
      mockValidatePublicEventFieldConfig: vi.fn(),
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
    logger: mockLogger,
  }
})

vi.mock('@/lib/domain/event-fields', async () => {
  const actual = await vi.importActual<typeof import('@/lib/domain/event-fields')>(
    '@/lib/domain/event-fields',
  )

  return {
    ...actual,
    validatePublicEventFieldConfig: mockValidatePublicEventFieldConfig,
  }
})

import { usePublicEventFieldsQuery } from '@/hooks/domain/event-fields/queries/usePublicEventFieldsQuery'

describe('usePublicEventFieldsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns validated public field config', async () => {
    mockQueryBuilder.returns.mockResolvedValueOnce({
      data: [{ id: 'field-1', event_id: 'event-1', field_key: 'team_name' }],
      error: null,
    })
    mockValidatePublicEventFieldConfig.mockReturnValueOnce({
      validFields: [{ id: 'field-1' }],
      issues: [],
    })

    const { result } = renderHookWithClient(() => usePublicEventFieldsQuery('event-1'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockValidatePublicEventFieldConfig).toHaveBeenCalledWith([
      { id: 'field-1', event_id: 'event-1', field_key: 'team_name' },
    ])
    expect(result.current.data).toEqual({ validFields: [{ id: 'field-1' }], issues: [] })
  })

  it('returns query error state when field fetch fails', async () => {
    mockQueryBuilder.returns.mockResolvedValueOnce({
      data: null,
      error: new Error('public fields failed'),
    })

    const { result } = renderHookWithClient(() => usePublicEventFieldsQuery('event-1'))

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toBeInstanceOf(Error)
  })
})
