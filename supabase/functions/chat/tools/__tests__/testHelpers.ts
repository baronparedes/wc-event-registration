import { createClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

export function createMockClient() {
  return createClient<Database>('https://example.supabase.co', 'service-key');
}

export async function withMockFetch(
  mock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> | Response,
  run: () => Promise<void> | void,
) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    return await mock(input, init);
  };
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

export const MOCK_TOOL_OPTIONS = {
  toolCallId: 'test-call-id',
  messages: [],
  context: {},
};
