import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey)

const EDGE_FUNCTION_BASE_URL = `${env.supabaseUrl}/functions/v1`

/**
 * Factory for creating typed Edge Function callers.
 * Ensures consistent error handling and HTTP configuration across all Edge Functions.
 */
export function createEdgeFunctionCaller<TRequest, TResponse extends { success: boolean }>(
  functionName: string,
) {
  return async (payload: TRequest): Promise<TResponse> => {
    const response = await fetch(`${EDGE_FUNCTION_BASE_URL}/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorMessage = `Edge function failed: ${response.status}`
      try {
        const errorData = await response.text()
        console.error(`[Edge Function ${functionName}] ${response.status}:`, errorData)
        errorMessage = errorData || errorMessage
      } catch (e) {
        console.error(`[Edge Function ${functionName}] Failed to parse error response`, e)
      }
      throw new Error(errorMessage)
    }

    return response.json()
  }
}
