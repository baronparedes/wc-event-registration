import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/env';

export const supabase = createClient(env.supabaseUrl, env.supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

const EDGE_FUNCTION_BASE_URL = `${env.supabaseUrl}/functions/v1`;

export interface EdgeFunctionTextResponse {
  text: string;
  filename?: string;
}

/**
 * Factory for creating typed Edge Function callers.
 * Ensures consistent error handling and HTTP configuration across all Edge Functions.
 * Automatically includes the current session's auth token in the Authorization header.
 */
export function createEdgeFunctionCaller<TRequest, TResponse extends { success: boolean }>(
  functionName: string,
) {
  return async (payload: TRequest): Promise<TResponse> => {
    // Get current session to include auth token
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn(`[${functionName}] No auth token available for Edge Function call`);
    }

    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Edge function failed: ${response.status}`;
      try {
        const errorData = await response.text();
        console.error(`[Edge Function ${functionName}] ${response.status}:`, errorData);
        errorMessage = errorData || errorMessage;
      } catch (e) {
        console.error(`[Edge Function ${functionName}] Failed to parse error response`, e);
      }
      throw new Error(errorMessage);
    }

    return response.json();
  };
}

/**
 * Factory for Edge Function callers that return plain text (e.g. CSV).
 * Errors are still parsed as JSON. Auth token is included automatically.
 */
export function createEdgeFunctionTextCaller<TRequest>(functionName: string) {
  return async (payload: TRequest): Promise<EdgeFunctionTextResponse> => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn(`[${functionName}] No auth token available for Edge Function call`);
    }

    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorMessage = `Edge function failed: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error(`[Edge Function ${functionName}] ${response.status}:`, errorData);
        errorMessage = errorData?.error ?? errorMessage;
      } catch (e) {
        console.error(`[Edge Function ${functionName}] Failed to parse error response`, e);
      }
      throw new Error(errorMessage);
    }

    const contentDisposition = response.headers.get('content-disposition');
    const filenameMatch = contentDisposition?.match(/filename="?([^";]+)"?/i);
    const filename = filenameMatch?.[1];
    const text = await response.text();

    return { text, filename };
  };
}

/**
 * Factory for Edge Function callers that stream responses.
 * Automatically includes the current session's auth token in the Authorization header.
 */
export interface StreamCallerOptions {
  signal?: AbortSignal;
}

/**
 * Factory for Edge Function callers that stream responses.
 * Automatically includes the current session's auth token in the Authorization header.
 */
export function createEdgeFunctionStreamCaller<TRequest>(functionName: string) {
  return async (
    payload: TRequest,
    onChunk: (text: string) => void,
    options?: StreamCallerOptions,
  ): Promise<void> => {
    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn(`[${functionName}] No auth token available for Edge Function call`);
    }

    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: options?.signal,
    });

    if (!response.ok) {
      let errorMessage = `Edge function failed: ${response.status}`;
      try {
        const errorData = await response.text();
        console.error(`[Edge Function ${functionName}] ${response.status}:`, errorData);
        if (errorData) {
          try {
            const parsed = JSON.parse(errorData) as { error?: string; message?: string };
            errorMessage = parsed.error || parsed.message || errorData;
          } catch {
            errorMessage = errorData;
          }
        }
      } catch (e) {
        console.error(`[Edge Function ${functionName}] Failed to parse error response`, e);
      }
      throw new Error(errorMessage);
    }

    if (!response.body) {
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let textBuffer = '';
    let isProtocolStream = false;
    let pendingLine = '';

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        if (!isProtocolStream && /^[0-9a-f]:["{[]/m.test(chunk)) {
          isProtocolStream = true;
        }

        if (isProtocolStream) {
          const fullText = pendingLine + chunk;
          const lines = fullText.split('\n');
          pendingLine = done ? '' : (lines.pop() ?? '');

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const content = JSON.parse(line.slice(2));
                textBuffer += content;
                onChunk(textBuffer);
              } catch {
                // ignore parse errors for partial chunks if any
              }
            } else if (line.startsWith('2:') || line.startsWith('3:')) {
              let errorMsg: string;
              try {
                const parsed = JSON.parse(line.slice(2));
                errorMsg =
                  typeof parsed === 'string'
                    ? parsed
                    : parsed.error || parsed.message || JSON.stringify(parsed);
              } catch {
                errorMsg = line.slice(2);
              }
              if (/429|quota|resource_exhausted|rate\s*limit/i.test(errorMsg)) {
                errorMsg = "I'm on a coffee break, you can come back later.";
              }
              throw new Error(errorMsg);
            }
          }
        } else {
          textBuffer += chunk;
          if (/429|quota|resource_exhausted|rate\s*limit/i.test(textBuffer)) {
            textBuffer = "I'm on a coffee break, you can come back later.";
          }
          onChunk(textBuffer);
        }
      }
    }

    if (!textBuffer.trim()) {
      throw new Error("I'm on a coffee break, you can come back later.");
    }
  };
}
