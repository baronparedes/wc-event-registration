import { act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHookWithClient } from '@/__tests__/unit-test-utils'

const { mockTextCaller, mockCreateEdgeFunctionTextCaller } = vi.hoisted(() => {
  const textCaller = vi.fn()
  return {
    mockTextCaller: textCaller,
    mockCreateEdgeFunctionTextCaller: vi.fn(() => textCaller),
  }
})

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure')
  return {
    ...actual,
    createEdgeFunctionTextCaller: mockCreateEdgeFunctionTextCaller,
  }
})

import { useExportRegistrationsCSVMutation } from '@/hooks/domain/registrations/mutations/useExportRegistrationsCSVMutation'

describe('useExportRegistrationsCSVMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls export edge function with event id and returns text response', async () => {
    mockTextCaller.mockResolvedValueOnce({ text: 'id,name', filename: 'registrations.csv' })

    const { result } = renderHookWithClient(() => useExportRegistrationsCSVMutation('event-1'))

    const response = await act(async () => result.current.mutateAsync())

    expect(mockTextCaller).toHaveBeenCalledWith({ event_id: 'event-1' })
    expect(response).toEqual({ text: 'id,name', filename: 'registrations.csv' })
  })
})
