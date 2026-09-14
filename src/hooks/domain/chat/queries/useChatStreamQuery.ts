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

  const streamRequest = useCallback(
    async (payload: ChatStreamRequest, onChunk: (text: string) => void) => {
      setIsLoading(true);
      setError(null);
      try {
        await callChatStream(payload, onChunk);
      } catch (err) {
        const e = err instanceof Error ? err : new Error('An unknown error occurred');
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { streamRequest, isLoading, error };
}

export { useChatStreamQuery as useChatStream };
