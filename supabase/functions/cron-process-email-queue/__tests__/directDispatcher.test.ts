import { assertEquals, assertStringIncludes } from '@std/assert';

import { processDirectMessage } from '../directDispatcher.ts';
import { EmailDeliveryTracker } from '../tracker.ts';
import type { EmailQueueClient, EmailQueueMessage, EmailTemplate, RpcResult } from '../types.ts';

class TestEmailQueueClient implements EmailQueueClient {
  readonly archivedIds: number[] = [];
  templateId: string | null = null;

  rpc(
    functionName: 'pop_email_notifications',
    args: { batch_size: number },
  ): Promise<RpcResult<EmailQueueMessage[]>>;
  rpc(
    functionName: 'archive_email_notification',
    args: { message_id: number },
  ): Promise<RpcResult<boolean>>;
  rpc(
    functionName: 'update_email_reminder_delivery_stats',
    args: { p_sunday_date: string; p_succeeded_count: number; p_failed_count: number },
  ): Promise<RpcResult<void>>;
  rpc(
    functionName:
      | 'pop_email_notifications'
      | 'archive_email_notification'
      | 'update_email_reminder_delivery_stats',
    args:
      | { batch_size: number }
      | { message_id: number }
      | { p_sunday_date: string; p_succeeded_count: number; p_failed_count: number },
  ): Promise<RpcResult<EmailQueueMessage[] | boolean | void>> {
    if (functionName === 'archive_email_notification' && 'message_id' in args) {
      this.archivedIds.push(args.message_id);
      return Promise.resolve({ data: true, error: null });
    }
    if (functionName === 'pop_email_notifications') {
      return Promise.resolve({ data: [], error: null });
    }
    return Promise.resolve({ data: undefined, error: null });
  }

  from() {
    return {
      select: () => ({
        eq: () => ({
          single: (): Promise<RpcResult<EmailTemplate>> =>
            Promise.resolve({
              data: this.templateId === null ? null : { resend_template_id: this.templateId },
              error: null,
            }),
        }),
      }),
    };
  }
}

function createMessage(
  message: Partial<EmailQueueMessage['message']>,
  readCount = 1,
): EmailQueueMessage {
  return {
    msg_id: 17,
    read_ct: readCount,
    message: {
      event_type: 'email_notification',
      recipient: 'member@example.com',
      ...message,
    },
  };
}

async function withResendFetch(
  run: (sentPayloads: Array<Record<string, unknown>>) => Promise<void>,
  status = 200,
): Promise<void> {
  const previousFetch = globalThis.fetch;
  const previousEnv = new Map(
    ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'NODE_ENV'].map((name) => [name, Deno.env.get(name)]),
  );
  const sentPayloads: Array<Record<string, unknown>> = [];

  Deno.env.set('RESEND_API_KEY', 'test-resend-key');
  Deno.env.set('RESEND_FROM_EMAIL', 'events@example.com');
  Deno.env.set('NODE_ENV', 'test');
  globalThis.fetch = (_input, init) => {
    sentPayloads.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    return Promise.resolve(
      new Response(status === 200 ? JSON.stringify({ id: 'email-17' }) : 'provider error', {
        status,
      }),
    );
  };

  try {
    await run(sentPayloads);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [name, value] of previousEnv) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

Deno.test('direct dispatcher uses a configured template and preserves explicit HTML', async () => {
  await withResendFetch(async (sentPayloads) => {
    const client = new TestEmailQueueClient();
    client.templateId = 'resend-template-17';
    const tracker = new EmailDeliveryTracker();

    await processDirectMessage(
      client,
      createMessage({
        template_slug: 'welcome',
        subject: 'Welcome',
        text: 'Welcome to the event.',
        html: '<p>Welcome!</p>',
        metadata: { url: 'https://example.com/event' },
      }),
      tracker,
    );

    assertEquals(sentPayloads.length, 1);
    assertEquals(sentPayloads[0].template_id, 'resend-template-17');
    assertEquals(sentPayloads[0].html, '<p>Welcome!</p>');
    assertEquals(client.archivedIds, [17]);
    assertEquals(tracker.processedCount, 1);
  });
});

Deno.test(
  'direct dispatcher falls back from an unconfigured template to linked plain text',
  async () => {
    await withResendFetch(async (sentPayloads) => {
      const client = new TestEmailQueueClient();
      client.templateId = 'welcome_placeholder';
      const tracker = new EmailDeliveryTracker();

      await processDirectMessage(
        client,
        createMessage({
          template_slug: 'welcome',
          text: 'Original plain text',
          metadata: {
            action_url: 'https://example.com/action',
            broadcast_message: '  Read this announcement.  ',
            target_type: 'event',
          },
        }),
        tracker,
      );

      assertEquals(sentPayloads.length, 1);
      assertEquals(sentPayloads[0].subject, 'Notification');
      assertEquals(sentPayloads[0].text, 'Original plain text');
      assertStringIncludes(String(sentPayloads[0].html), 'Read this announcement.');
      assertStringIncludes(String(sentPayloads[0].html), 'https://example.com/action');
      assertEquals(client.archivedIds, [17]);
    });
  },
);

Deno.test(
  'direct dispatcher archives a template message that has no configured template or text',
  async () => {
    await withResendFetch(async (sentPayloads) => {
      const client = new TestEmailQueueClient();
      const tracker = new EmailDeliveryTracker();

      await processDirectMessage(
        client,
        createMessage({ template_slug: 'missing', metadata: { sunday_date: '2026-11-08' } }, 5),
        tracker,
      );

      assertEquals(sentPayloads.length, 0);
      assertEquals(client.archivedIds, [17]);
    });
  },
);

Deno.test(
  'direct dispatcher archives a message with no body without contacting Resend',
  async () => {
    await withResendFetch(async (sentPayloads) => {
      const client = new TestEmailQueueClient();
      const tracker = new EmailDeliveryTracker();

      await processDirectMessage(
        client,
        createMessage({ metadata: { sunday_date: '2026-11-08' } }),
        tracker,
      );

      assertEquals(sentPayloads.length, 0);
      assertEquals(client.archivedIds, [17]);
    });
  },
);

Deno.test('direct dispatcher archives a Resend delivery failure at the retry limit', async () => {
  await withResendFetch(async (sentPayloads) => {
    const client = new TestEmailQueueClient();
    const tracker = new EmailDeliveryTracker();

    await processDirectMessage(
      client,
      createMessage(
        { text: 'Please review the schedule.', metadata: { sunday_date: '2026-11-08' } },
        5,
      ),
      tracker,
    );

    assertEquals(sentPayloads.length, 1);
    assertEquals(client.archivedIds, [17]);
    assertEquals(tracker.processedCount, 0);
  }, 503);
});
