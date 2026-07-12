import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createEdgeFunctionCaller, createEdgeFunctionTextCaller } from '../supabase';

const { mockGetSession, mockSupabaseClient } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockSupabaseClient: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabaseClient,
}));

vi.mock('@/config/env', () => ({
  env: {
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
  },
}));

describe('supabase edge function callers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseClient.auth.getSession = mockGetSession;
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends the auth token when available and parses JSON responses', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, value: 'ok' }),
    } as Response);

    const callFunction = createEdgeFunctionCaller<
      { value: string },
      { success: boolean; value: string }
    >('sample-function');

    await expect(callFunction({ value: 'hello' })).resolves.toEqual({ success: true, value: 'ok' });
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
    );
  });

  it('warns when no auth token is present and throws parsed text errors', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    } as Response);

    const callFunction = createEdgeFunctionCaller<
      { value: string },
      { success: boolean; value: string }
    >('sample-function');

    await expect(callFunction({ value: 'hello' })).rejects.toThrow('boom');
    expect(warnSpy).toHaveBeenCalledWith(
      '[sample-function] No auth token available for Edge Function call',
    );
    expect(errorSpy).toHaveBeenCalledWith('[Edge Function sample-function] 500:', 'boom');
  });

  it('parses text responses and filenames for CSV downloads', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-disposition': 'attachment; filename="export.csv"' }),
      text: async () => 'col1,col2\n1,2',
    } as Response);

    const callFunction = createEdgeFunctionTextCaller<{ eventId: string }>('export-csv');

    await expect(callFunction({ eventId: 'event-1' })).resolves.toEqual({
      text: 'col1,col2\n1,2',
      filename: 'export.csv',
    });
  });

  it('uses the JSON error payload when text downloads fail', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'bad request' }),
    } as Response);

    const callFunction = createEdgeFunctionTextCaller<{ eventId: string }>('export-csv');

    await expect(callFunction({ eventId: 'event-1' })).rejects.toThrow('bad request');
    expect(errorSpy).toHaveBeenCalledWith('[Edge Function export-csv] 400:', {
      error: 'bad request',
    });
  });

  it('falls back to status-based message when JSON error parsing fails for text caller', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error('bad json');
      },
    } as unknown as Response);

    const callFunction = createEdgeFunctionTextCaller<{ eventId: string }>('export-csv');

    await expect(callFunction({ eventId: 'event-1' })).rejects.toThrow('Edge function failed: 503');
    expect(errorSpy).toHaveBeenCalledWith(
      '[Edge Function export-csv] Failed to parse error response',
      expect.any(Error),
    );
  });

  it('falls back to status-based message when text error body is empty', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'token-123',
        },
      },
    });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => '',
    } as Response);

    const callFunction = createEdgeFunctionCaller<{ value: string }, { success: boolean }>(
      'sample-function',
    );

    await expect(callFunction({ value: 'hello' })).rejects.toThrow('Edge function failed: 502');
  });

  it('returns plain text without filename when content-disposition is missing', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      headers: new Headers(),
      text: async () => 'csv,data',
    } as Response);

    const callFunction = createEdgeFunctionTextCaller<{ eventId: string }>('export-csv');

    await expect(callFunction({ eventId: 'event-1' })).resolves.toEqual({
      text: 'csv,data',
      filename: undefined,
    });
    expect(warnSpy).toHaveBeenCalledWith(
      '[export-csv] No auth token available for Edge Function call',
    );
  });

  it('retries transient network failures with bounded backoff', async () => {
    vi.useFakeTimers();
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, value: 'ok' }),
      } as Response);

    const callFunction = createEdgeFunctionCaller<
      { value: string },
      { success: boolean; value: string }
    >('sample-function');

    const promise = callFunction({ value: 'hello' });
    await vi.advanceTimersByTimeAsync(1_000);

    await expect(promise).resolves.toEqual({ success: true, value: 'ok' });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('throws timeout error after 12s for stalled requests', async () => {
    vi.useFakeTimers();
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_, reject) => {
          const signal = options?.signal as AbortSignal | undefined;
          signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        }),
    );

    const callFunction = createEdgeFunctionCaller<{ value: string }, { success: boolean }>(
      'sample-function',
    );

    const promise = callFunction({ value: 'hello' });
    const expectation = expect(promise).rejects.toThrow('Network timeout. Please try again.');
    await vi.advanceTimersByTimeAsync(12_000);

    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
