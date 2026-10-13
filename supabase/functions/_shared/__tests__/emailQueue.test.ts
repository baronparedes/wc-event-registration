import { assertEquals } from '@std/assert';

import {
  type SupabaseRpcClient,
  enqueueEmailNotification,
  enqueueEmailNotificationsBatch,
  triggerEmailProcessor,
} from '../emailQueue.ts';

Deno.test(
  'enqueueEmailNotification calls enqueue_email_notification with formatted payload',
  async () => {
    const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
    const client: SupabaseRpcClient = {
      rpc: (name, args) => {
        calls.push({ name, args });
        return Promise.resolve({ data: 123, error: null });
      },
    };

    const result = await enqueueEmailNotification(client, {
      recipient: 'test@example.com',
      category: 'broadcast',
      subject: 'Welcome',
      text: 'Hello there',
      metadata: { test: true },
    });

    assertEquals(result.messageId, 123);
    assertEquals(result.error, null);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].name, 'enqueue_email_notification');
    assertEquals(calls[0].args, {
      payload: {
        event_type: 'email_notification',
        category: 'broadcast',
        recipient: 'test@example.com',
        template_slug: undefined,
        subject: 'Welcome',
        text: 'Hello there',
        metadata: { test: true },
        idempotency_key: undefined,
      },
    });
  },
);

Deno.test('enqueueEmailNotification surfaces RPC errors', async () => {
  const client: SupabaseRpcClient = {
    rpc: () => Promise.resolve({ data: null, error: { message: 'DB down' } }),
  };

  const result = await enqueueEmailNotification(client, {
    recipient: 'test@example.com',
  });

  assertEquals(result.messageId, null);
  assertEquals(result.error?.message, 'DB down');
});

Deno.test('enqueueEmailNotificationsBatch processes items concurrently', async () => {
  const enqueued: string[] = [];
  const client: SupabaseRpcClient = {
    rpc: (_name, args) => {
      const payload = args?.payload as { recipient: string };
      if (payload.recipient === 'fail@example.com') {
        return Promise.resolve({ data: null, error: { message: 'fail' } });
      }
      enqueued.push(payload.recipient);
      return Promise.resolve({ data: 1, error: null });
    },
  };

  const result = await enqueueEmailNotificationsBatch(
    client,
    [
      { recipient: 'a@example.com' },
      { recipient: 'fail@example.com' },
      { recipient: 'b@example.com' },
    ],
    { concurrency: 2 },
  );

  assertEquals(result.successfulCount, 2);
  assertEquals(result.failedCount, 1);
  assertEquals(enqueued, ['a@example.com', 'b@example.com']);
});

Deno.test('triggerEmailProcessor calls DB RPC and direct fetch when configured', async () => {
  const originalFetch = globalThis.fetch;
  let fetchedUrl = '';
  let fetchedHeaders: Record<string, string> | undefined;

  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    fetchedUrl = input.toString();
    fetchedHeaders = init?.headers as Record<string, string>;
    return Promise.resolve(new Response(JSON.stringify({ success: true })));
  };

  const prevUrl = Deno.env.get('SUPABASE_URL');
  const prevKey = Deno.env.get('CRON_ROLE_KEY');
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('CRON_ROLE_KEY', 'test-key');

  const rpcCalls: string[] = [];
  const client: SupabaseRpcClient = {
    rpc: (name) => {
      rpcCalls.push(name);
      return Promise.resolve({ data: null, error: null });
    },
  };

  try {
    await triggerEmailProcessor(client);
    assertEquals(rpcCalls, ['trigger_email_processor']);
    assertEquals(fetchedUrl, 'https://example.supabase.co/functions/v1/cron-process-email-queue');
    assertEquals(fetchedHeaders?.['X-Cron-Key'], 'test-key');
  } finally {
    globalThis.fetch = originalFetch;
    if (prevUrl) Deno.env.set('SUPABASE_URL', prevUrl);
    else Deno.env.delete('SUPABASE_URL');
    if (prevKey) Deno.env.set('CRON_ROLE_KEY', prevKey);
    else Deno.env.delete('CRON_ROLE_KEY');
  }
});
