import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useChatStreamQuery } from '../useChatStreamQuery';

const { mockCallChatStream } = vi.hoisted(() => ({
  mockCallChatStream: vi.fn(),
}));

vi.mock('@/lib/infrastructure', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/infrastructure')>('@/lib/infrastructure');
  return {
    ...actual,
    createEdgeFunctionStreamCaller: () => mockCallChatStream,
  };
});

describe('useChatStreamQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully triggers streamRequest and updates loading state', async () => {
    mockCallChatStream.mockImplementation(
      async (_payload: unknown, onChunk: (text: string) => void) => {
        onChunk('Hello');
      },
    );

    const { result } = renderHook(() => useChatStreamQuery());
    const onChunk = vi.fn();

    await act(async () => {
      await result.current.streamRequest({ messages: [{ role: 'user', content: 'Hi' }] }, onChunk);
    });

    expect(mockCallChatStream).toHaveBeenCalledTimes(1);
    expect(mockCallChatStream).toHaveBeenCalledWith(
      { messages: [{ role: 'user', content: 'Hi' }] },
      onChunk,
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
    expect(onChunk).toHaveBeenCalledWith('Hello');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('catches and stores errors thrown by the stream caller', async () => {
    mockCallChatStream.mockRejectedValueOnce(new Error('Stream failed'));

    const { result } = renderHook(() => useChatStreamQuery());

    await act(async () => {
      await expect(
        result.current.streamRequest({ messages: [{ role: 'user', content: 'Hi' }] }, vi.fn()),
      ).rejects.toThrow('Stream failed');
    });

    expect(result.current.error?.message).toBe('Stream failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('handles non-Error thrown values gracefully', async () => {
    mockCallChatStream.mockRejectedValueOnce('string error');

    const { result } = renderHook(() => useChatStreamQuery());

    await act(async () => {
      await expect(
        result.current.streamRequest({ messages: [{ role: 'user', content: 'Hi' }] }, vi.fn()),
      ).rejects.toThrow('An unknown error occurred');
    });

    expect(result.current.error?.message).toBe('An unknown error occurred');
    expect(result.current.isLoading).toBe(false);
  });
});
