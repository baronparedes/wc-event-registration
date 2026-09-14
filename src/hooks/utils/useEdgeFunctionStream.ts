import { env } from '@/config/env';

import { useCallback, useState } from 'react';

import { supabase } from '@/lib/infrastructure';

export function useEdgeFunctionStream(functionName: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const streamRequest = useCallback(
    async (payload: unknown, onChunk: (text: string) => void) => {
      setIsLoading(true);
      setError(null);
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        const token = sessionData?.session?.access_token;

        const response = await fetch(
          `${env.supabaseUrl}/functions/v1/${functionName}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        if (!response.body) {
          setIsLoading(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let done = false;
        let textBuffer = '';

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('0:')) {
                try {
                  const content = JSON.parse(line.slice(2));
                  textBuffer += content;
                  onChunk(textBuffer);
                } catch {
                  // ignore parse errors for partial chunks if any
                }
              }
            }
          }
        }
      } catch (err) {
        const e = err instanceof Error ? err : new Error('An unknown error occurred');
        setError(e);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [functionName],
  );

  return { streamRequest, isLoading, error };
}
