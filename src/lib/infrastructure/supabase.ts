import { createClient } from '@supabase/supabase-js';

import { env } from '@/config/env';

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

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
