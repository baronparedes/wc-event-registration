import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

export type NotificationCategory = 'sunday_reminder' | 'broadcast';

export type EmailQueuePayload = {
  event_type: string;
  category?: NotificationCategory | string;
  recipient: string;
  template_slug?: string;
  subject?: string;
  text?: string;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
};

export type EnqueueEmailInput = {
  recipient: string;
  category?: NotificationCategory | string;
  event_type?: string;
  subject?: string;
  text?: string;
  template_slug?: string;
  metadata?: Record<string, unknown>;
  idempotency_key?: string;
};

type RpcResponse = {
  data: unknown;
  error: { message: string } | PostgrestError | null;
};

export type SupabaseRpcClient =
  | Pick<SupabaseClient, 'rpc'>
  | {
      rpc: (functionName: string, args?: Record<string, unknown>) => PromiseLike<RpcResponse>;
    };

/**
 * Enqueues a single email notification message into the pgmq email_notifications queue.
 */
export async function enqueueEmailNotification(
  client: SupabaseRpcClient,
  input: EnqueueEmailInput,
): Promise<{ messageId: number | null; error: { message: string } | null }> {
  const payload: EmailQueuePayload = {
    event_type: input.event_type ?? 'email_notification',
    category: input.category,
    recipient: input.recipient,
    template_slug: input.template_slug,
    subject: input.subject,
    text: input.text,
    metadata: input.metadata,
    idempotency_key: input.idempotency_key,
  };

  const { data, error } = await (
    client as {
      rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResponse>;
    }
  ).rpc('enqueue_email_notification', { payload });

  if (error) {
    return { messageId: null, error };
  }
  return { messageId: typeof data === 'number' ? data : null, error: null };
}

/**
 * Enqueues multiple email notifications with controlled concurrency.
 */
export async function enqueueEmailNotificationsBatch(
  client: SupabaseRpcClient,
  inputs: EnqueueEmailInput[],
  options: { concurrency?: number } = {},
): Promise<{ successfulCount: number; failedCount: number }> {
  const concurrency = options.concurrency ?? 10;
  let successfulCount = 0;
  let failedCount = 0;

  for (let i = 0; i < inputs.length; i += concurrency) {
    const batch = inputs.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (item) => {
        const res = await enqueueEmailNotification(client, item);
        if (res.error) {
          console.error(`[emailQueue] Enqueue error for ${item.recipient}:`, res.error);
          throw res.error;
        }
        return res;
      }),
    );

    for (const res of results) {
      if (res.status === 'fulfilled') {
        successfulCount++;
      } else {
        failedCount++;
      }
    }
  }

  return { successfulCount, failedCount };
}

/**
 * Triggers the email processor worker.
 * 1. Calls the database RPC trigger_email_processor (via pg_net).
 * 2. If direct Edge invocation is enabled (default: true) and environment keys exist,
 *    invokes cron-process-email-queue directly via HTTP for instant queue draining.
 */
export async function triggerEmailProcessor(
  client?: SupabaseRpcClient,
  options: { directEdgeInvoke?: boolean } = {},
): Promise<void> {
  if (client) {
    const { error: triggerError } = await (
      client as {
        rpc: (name: string, args?: Record<string, unknown>) => PromiseLike<RpcResponse>;
      }
    ).rpc('trigger_email_processor');

    if (triggerError) {
      console.warn('[emailQueue] Error triggering email processor RPC:', triggerError);
    }
  }

  const directEdgeInvoke = options.directEdgeInvoke ?? true;
  if (!directEdgeInvoke) return;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const cronRoleKey = Deno.env.get('CRON_ROLE_KEY');

    if (supabaseUrl && (serviceRoleKey || cronRoleKey)) {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (cronRoleKey) {
        headers['X-Cron-Key'] = cronRoleKey;
      } else if (serviceRoleKey) {
        headers['Authorization'] = `Bearer ${serviceRoleKey}`;
      }

      const triggerUrl = `${supabaseUrl}/functions/v1/cron-process-email-queue`;
      await fetch(triggerUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      }).catch((err) => {
        console.warn('[emailQueue] Direct email processor trigger failed:', err);
      });
    }
  } catch (err) {
    console.warn('[emailQueue] Failed to invoke cron-process-email-queue:', err);
  }
}
