import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetSession, mockSupabaseClient } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSupabaseClient: {
    auth: {
      getSession: vi.fn(),
    },
  },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}))

vi.mock('@/config/env', () => ({
  env: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
  },
}))

import { createEdgeFunctionCaller, createEdgeFunctionTextCaller } from '../supabase'

describe('supabase edge function callers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient.auth.getSession = mockGetSession
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sends the auth token when available and parses JSON responses', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    })

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, value: 'ok' }),
    } as Response)

    const callFunction = createEdgeFunctionCaller<
      { value: string },
      { success: boolean; value: string }
    >('sample-function')

    await expect(callFunction({ value: 'hello' })).resolves.toEqual({ success: true, value: 'ok' })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/sample-function',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer token-123',
        },
        body: JSON.stringify({ value: 'hello' }),
      }),
    )
  })

  it('warns when no auth token is present and throws parsed text errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as Response)

    const callFunction = createEdgeFunctionCaller<
      { value: string },
      { success: boolean; value: string }
    >('sample-function')

    await expect(callFunction({ value: 'hello' })).rejects.toThrow('boom')
    expect(warnSpy).toHaveBeenCalledWith(
      '[sample-function] No auth token available for Edge Function call',
    )
    expect(errorSpy).toHaveBeenCalledWith('[Edge Function sample-function] 500:', 'boom')
  })

  it('parses text responses and filenames for CSV downloads', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    })

    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-disposition': 'attachment; filename="export.csv"' }),
      text: async () => 'col1,col2\n1,2',
    } as Response)

    const callFunction = createEdgeFunctionTextCaller<{ eventId: string }>('export-csv')

    await expect(callFunction({ eventId: 'event-1' })).resolves.toEqual({
      text: 'col1,col2\n1,2',
      filename: 'export.csv',
    })
  })

  it('uses the JSON error payload when text downloads fail', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'bad request' }),
    } as Response)

    const callFunction = createEdgeFunctionTextCaller<{ eventId: string }>('export-csv')

    await expect(callFunction({ eventId: 'event-1' })).rejects.toThrow('bad request')
    expect(errorSpy).toHaveBeenCalledWith('[Edge Function export-csv] 400:', {
      error: 'bad request',
    })
  })
})
