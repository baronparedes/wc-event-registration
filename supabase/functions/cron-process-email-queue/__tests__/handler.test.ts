import { assertEquals } from '@std/assert';

import { handleCronProcessEmailQueue } from '../handler.ts';

type QueueMessage = {
  msg_id: number;
  read_ct: number;
  message: {
    event_type: string;
    category?: string;
    recipient: string;
    template_slug?: string;
    subject?: string;
    text?: string;
    metadata?: Record<string, unknown>;
  };
};

const SERVICE_ROLE_KEY = 'test-service-role-key';
const TEST_ORIGIN = 'https://app.example.com';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map<string, string | undefined>(
    [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CRON_ROLE_KEY',
      'ALLOWED_ORIGINS',
      'RESEND_API_KEY',
      'RESEND_FROM_EMAIL',
      'OUTLOOK_DISPATCH_EMAIL',
    ].map((name) => [name, Deno.env.get(name)]),
  );

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
  Deno.env.set('CRON_ROLE_KEY', 'test-cron-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);
  Deno.env.set('RESEND_API_KEY', 'test-resend-key');
  Deno.env.set('RESEND_FROM_EMAIL', 'events@example.com');

  try {
    await run();
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(authorized = true) {
  const headers = new Headers({
    'content-type': 'application/json',
    origin: TEST_ORIGIN,
  });
  if (authorized) headers.set('authorization', `Bearer ${SERVICE_ROLE_KEY}`);
  return new Request('https://example.functions/cron-process-email-queue', {
    method: 'POST',
    headers,
    body: '{}',
  });
}

function mockFetch(options: {
  messages?: QueueMessage[];
  batches?: QueueMessage[][];
  resendStatus?: number;
  resendDelayMs?: number;
}) {
  const originalFetch = globalThis.fetch;
  const archivedIds: number[] = [];
  const sentEmails: Array<Record<string, unknown>> = [];
  let popCallCount = 0;
  let activeResendCalls = 0;
  let maxActiveResendCalls = 0;

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());

    if (requestUrl.pathname === '/rest/v1/rpc/pop_email_notifications') {
      const messages =
        options.batches?.[popCallCount] ?? (popCallCount === 0 ? (options.messages ?? []) : []);
      popCallCount++;
      return Promise.resolve(Response.json(messages));
    }
    if (requestUrl.pathname === '/rest/v1/rpc/archive_email_notification') {
      const body = JSON.parse(String(init?.body)) as { message_id: number };
      archivedIds.push(body.message_id);
      return Promise.resolve(Response.json(true));
    }
    if (requestUrl.pathname === '/rest/v1/rpc/update_email_reminder_delivery_stats') {
      return Promise.resolve(Response.json(null));
    }
    if (requestUrl.pathname === '/rest/v1/email_templates') {
      const slug = requestUrl.searchParams.get('slug')?.replace(/^eq\./, '');
      return Promise.resolve(
        Response.json({
          resend_template_id: `tmpl_${slug || 'default'}`,
        }),
      );
    }
    if (requestUrl.hostname === 'api.resend.com') {
      if (requestUrl.pathname.startsWith('/templates/')) {
        return Promise.resolve(
          Response.json({
            id: requestUrl.pathname.split('/').pop(),
            subject: 'Schedule for {{date}}',
            html: '<p>Hi {{name}}, your schedule on {{date}} is confirmed.</p>',
          }),
        );
      }
      sentEmails.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      activeResendCalls++;
      maxActiveResendCalls = Math.max(maxActiveResendCalls, activeResendCalls);
      return new Promise<Response>((resolve) => {
        setTimeout(() => {
          activeResendCalls--;
          resolve(new Response(null, { status: options.resendStatus ?? 200 }));
        }, options.resendDelayMs ?? 1);
      });
    }

    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    archivedIds,
    sentEmails,
    get popCalls() {
      return popCallCount;
    },
    get maxActiveResendCalls() {
      return maxActiveResendCalls;
    },
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('cron-process-email-queue rejects requests without a service or cron key', async () => {
  await withFunctionEnv(async () => {
    const response = await handleCronProcessEmailQueue(buildRequest(false));
    assertEquals(response.status, 401);
  });
});

Deno.test(
  'cron-process-email-queue accepts an authenticated cron request without an origin',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ messages: [] });
      const response = await handleCronProcessEmailQueue(
        new Request('https://example.functions/cron-process-email-queue', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cron-key': 'test-cron-role-key',
          },
          body: '{}',
        }),
      );

      try {
        assertEquals(response.status, 200);
        assertEquals(await response.json(), { success: true, processed: 0 });
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('cron-process-email-queue returns zero when the queue is empty', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ messages: [] });
    try {
      const response = await handleCronProcessEmailQueue(buildRequest());
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, processed: 0 });
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('cron-process-email-queue sends and archives valid plain-text emails', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      messages: [
        {
          msg_id: 41,
          read_ct: 1,
          message: {
            event_type: 'email_notification',
            recipient: 'member@example.com',
            subject: 'Event update',
            text: 'The event starts at 9 AM.',
          },
        },
      ],
    });
    try {
      const response = await handleCronProcessEmailQueue(buildRequest());
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, processed: 1 });
      assertEquals(fetchMock.sentEmails, [
        {
          from: 'events@example.com',
          to: 'member@example.com',
          subject: 'Event update',
          text: 'The event starts at 9 AM.',
        },
      ]);
      assertEquals(fetchMock.archivedIds, [41]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('cron-process-email-queue drains multiple batches with bounded concurrency', async () => {
  await withFunctionEnv(async () => {
    const firstBatch = Array.from({ length: 7 }, (_, index) => ({
      msg_id: 100 + index,
      read_ct: 1,
      message: {
        event_type: 'email_notification',
        recipient: `member-${index}@example.com`,
        text: 'Reminder message.',
      },
    }));
    const secondBatch = Array.from({ length: 2 }, (_, index) => ({
      msg_id: 107 + index,
      read_ct: 1,
      message: {
        event_type: 'email_notification',
        recipient: `member-${index + 7}@example.com`,
        text: 'Reminder message.',
      },
    }));
    const fetchMock = mockFetch({ batches: [firstBatch, secondBatch, []] });

    try {
      const response = await handleCronProcessEmailQueue(buildRequest());
      assertEquals(await response.json(), { success: true, processed: 9 });
      assertEquals(fetchMock.sentEmails.length, 9);
      assertEquals(fetchMock.archivedIds.length, 9);
      assertEquals(fetchMock.popCalls, 3);
      assertEquals(fetchMock.maxActiveResendCalls, 5);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'cron-process-email-queue archives unknown event types without sending email',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        messages: [
          {
            msg_id: 42,
            read_ct: 1,
            message: { event_type: 'unknown', recipient: 'member@example.com' },
          },
        ],
      });
      try {
        const response = await handleCronProcessEmailQueue(buildRequest());
        assertEquals(await response.json(), { success: true, processed: 0 });
        assertEquals(fetchMock.archivedIds, [42]);
        assertEquals(fetchMock.sentEmails, []);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-process-email-queue leaves messages queued when Resend rejects delivery',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        resendStatus: 503,
        messages: [
          {
            msg_id: 43,
            read_ct: 1,
            message: {
              event_type: 'email_notification',
              recipient: 'member@example.com',
              text: 'Retry this email.',
            },
          },
        ],
      });
      try {
        const response = await handleCronProcessEmailQueue(buildRequest());
        assertEquals(await response.json(), { success: true, processed: 0 });
        assertEquals(fetchMock.sentEmails.length, 1);
        assertEquals(fetchMock.archivedIds, []);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('cron-process-email-queue archives delivery failures after five attempts', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      resendStatus: 503,
      messages: [
        {
          msg_id: 44,
          read_ct: 5,
          message: {
            event_type: 'email_notification',
            recipient: 'member@example.com',
            text: 'Archive after five failures.',
          },
        },
      ],
    });
    try {
      const response = await handleCronProcessEmailQueue(buildRequest());
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, processed: 0 });
      assertEquals(fetchMock.archivedIds, [44]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'cron-process-email-queue bundles queued messages into a single OUTLOOK_DISPATCH_EMAIL batch with JSON attachment',
  async () => {
    await withFunctionEnv(async () => {
      Deno.env.set('OUTLOOK_DISPATCH_EMAIL', 'broadcasts@welcome.org.ph');
      const messages: QueueMessage[] = [
        {
          msg_id: 201,
          read_ct: 1,
          message: {
            event_type: 'email_notification',
            recipient: 'alice@example.com',
            subject: 'Announcement',
            text: 'Hello Alice',
          },
        },
        {
          msg_id: 202,
          read_ct: 1,
          message: {
            event_type: 'email_notification',
            recipient: 'bob@example.com',
            subject: 'Announcement',
            text: 'Hello Bob',
          },
        },
      ];

      const fetchMock = mockFetch({ messages });

      try {
        const response = await handleCronProcessEmailQueue(buildRequest());
        assertEquals(await response.json(), { success: true, processed: 2 });

        // Exactly 1 email sent to OUTLOOK_DISPATCH_EMAIL
        assertEquals(fetchMock.sentEmails.length, 1);
        const sent = fetchMock.sentEmails[0];
        assertEquals(sent.to, 'broadcasts@welcome.org.ph');
        assertEquals(typeof sent.subject, 'string');
        assertEquals(String(sent.subject).includes('[WC-BROADCAST-DISPATCH]'), true);
        assertEquals(String(sent.subject).includes('[BROADCAST]'), true);
        assertEquals(String(sent.subject).includes('(2 emails)'), true);

        // Contains batch-emails.json attachment
        const attachments = sent.attachments as Array<{ filename: string; content: string }>;
        assertEquals(Array.isArray(attachments), true);
        assertEquals(attachments.length, 1);
        assertEquals(attachments[0].filename, 'batch-emails.json');

        // Decode base64 JSON payload
        const decodedJson = atob(attachments[0].content);
        const batchPayload = JSON.parse(decodedJson);
        assertEquals(batchPayload.count, 2);
        assertEquals(batchPayload.items.length, 2);
        assertEquals(batchPayload.items[0].to, 'alice@example.com');
        assertEquals(batchPayload.items[0].body_html.includes('Hello Alice'), true);
        assertEquals(batchPayload.items[1].to, 'bob@example.com');
        assertEquals(batchPayload.items[1].body_html.includes('Hello Bob'), true);

        // Both messages archived
        assertEquals(fetchMock.archivedIds, [201, 202]);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-process-email-queue tokenizes Resend template variables when dispatching to OUTLOOK_DISPATCH_EMAIL',
  async () => {
    await withFunctionEnv(async () => {
      Deno.env.set('OUTLOOK_DISPATCH_EMAIL', 'broadcasts@welcome.org.ph');
      const messages: QueueMessage[] = [
        {
          msg_id: 301,
          read_ct: 1,
          message: {
            event_type: 'email_notification',
            recipient: 'paul@example.com',
            template_slug: 'volunteer-schedule',
            metadata: {
              name: 'Brother Paul',
              date: '2026-10-18',
              sunday_date: '2026-10-18',
            },
          },
        },
      ];

      const fetchMock = mockFetch({ messages });

      try {
        const response = await handleCronProcessEmailQueue(buildRequest());
        assertEquals(await response.json(), { success: true, processed: 1 });

        assertEquals(fetchMock.sentEmails.length, 1);
        const sent = fetchMock.sentEmails[0];
        assertEquals(String(sent.subject).includes('[WC-BROADCAST-DISPATCH]'), true);
        assertEquals(String(sent.subject).includes('[SUNDAY-REMINDER]'), true);
        const attachments = sent.attachments as Array<{ filename: string; content: string }>;
        const batchPayload = JSON.parse(atob(attachments[0].content));

        assertEquals(batchPayload.count, 1);
        assertEquals(batchPayload.batch_type, 'sunday_reminder');
        assertEquals(batchPayload.items[0].to, 'paul@example.com');
        assertEquals(batchPayload.items[0].subject, 'Schedule for 2026-10-18');
        assertEquals(
          batchPayload.items[0].body_html,
          '<p>Hi Brother Paul, your schedule on 2026-10-18 is confirmed.</p>',
        );
        assertEquals(fetchMock.archivedIds, [301]);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-process-email-queue partitions mixed queue messages into separate Sunday reminder and broadcast batches',
  async () => {
    await withFunctionEnv(async () => {
      Deno.env.set('OUTLOOK_DISPATCH_EMAIL', 'broadcasts@welcome.org.ph');
      const messages: QueueMessage[] = [
        {
          msg_id: 501,
          read_ct: 1,
          message: {
            event_type: 'email_notification',
            recipient: 'volunteer@example.com',
            template_slug: 'volunteer-schedule',
            metadata: {
              name: 'Sister Mary',
              date: '2026-10-25',
              sunday_date: '2026-10-25',
            },
          },
        },
        {
          msg_id: 502,
          read_ct: 1,
          message: {
            event_type: 'email_notification',
            category: 'broadcast',
            recipient: 'all@example.com',
            subject: 'Church Picnic',
            text: 'Join us for the picnic!',
          },
        },
      ];

      const fetchMock = mockFetch({ messages });

      try {
        const response = await handleCronProcessEmailQueue(buildRequest());
        assertEquals(await response.json(), { success: true, processed: 2 });

        // Exactly 2 separate emails dispatched to Outlook
        assertEquals(fetchMock.sentEmails.length, 2);

        // Check Sunday Reminder batch
        const sundaySent = fetchMock.sentEmails.find((e) =>
          String(e.subject).includes('[SUNDAY-REMINDER]'),
        );
        assertEquals(!!sundaySent, true);
        const sundayAtt = (
          sundaySent?.attachments as Array<{ filename: string; content: string }>
        )[0];
        const sundayPayload = JSON.parse(atob(sundayAtt.content));
        assertEquals(sundayPayload.batch_type, 'sunday_reminder');
        assertEquals(sundayPayload.count, 1);
        assertEquals(sundayPayload.items[0].to, 'volunteer@example.com');

        // Check Broadcast batch
        const broadcastSent = fetchMock.sentEmails.find((e) =>
          String(e.subject).includes('[BROADCAST]'),
        );
        assertEquals(!!broadcastSent, true);
        const broadcastAtt = (
          broadcastSent?.attachments as Array<{ filename: string; content: string }>
        )[0];
        const broadcastPayload = JSON.parse(atob(broadcastAtt.content));
        assertEquals(broadcastPayload.batch_type, 'broadcast');
        assertEquals(broadcastPayload.count, 1);
        assertEquals(broadcastPayload.items[0].to, 'all@example.com');

        // Both messages archived
        assertEquals(fetchMock.archivedIds, [501, 502]);
      } finally {
        fetchMock.restore();
      }
    });
  },
);
