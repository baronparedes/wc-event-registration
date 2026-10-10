import { useCallback, useState } from 'react';

import { createEdgeFunctionStreamCaller } from '@/lib/infrastructure';

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id?: string;
  role: ChatMessageRole;
  content: string;
}

export interface ChatStreamRequest {
  messages: ChatMessage[];
}

const callChatStream = createEdgeFunctionStreamCaller<ChatStreamRequest>('chat');

export function useChatStreamQuery() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const streamRequest = useCallback(
    async (payload: ChatStreamRequest, onChunk: (text: string) => void) => {
      setIsLoading(true);
      setError(null);

      const controller = new AbortController();
      setAbortController(controller);

      try {
        await callChatStream(payload, onChunk, { signal: controller.signal });
      } catch (err) {
        const e = err instanceof Error ? err : new Error('An unknown error occurred');
        setError(e);
        setIsLoading(false);
        setAbortController(null);
        throw e;
      }

      setIsLoading(false);
      setAbortController(null);
    },
    [],
  );

  const stopStream = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
    }
  }, [abortController]);

  return { streamRequest, stopStream, isLoading, error };
}

export { useChatStreamQuery as useChatStream };
