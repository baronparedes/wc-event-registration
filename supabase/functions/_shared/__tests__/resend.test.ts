import { assertEquals } from '@std/assert';

import { sendResendEmail } from '../resend.ts';

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  return async () => {
    const original: Record<string, string | undefined> = {};
    for (const k of Object.keys(vars)) {
      original[k] = Deno.env.get(k);
      const val = vars[k];
      if (val === undefined) {
        Deno.env.delete(k);
      } else {
        Deno.env.set(k, val);
      }
    }
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries(original)) {
        if (v === undefined) {
          Deno.env.delete(k);
        } else {
          Deno.env.set(k, v);
        }
      }
    }
  };
}

Deno.test(
  'sendResendEmail - simulates email in local broadcast environment',
  withEnv(
    {
      LOCAL_BROADCAST: 'true',
      SUPABASE_URL: 'http://localhost:54321',
      NODE_ENV: 'development',
    },
    async () => {
      const result = await sendResendEmail({
        to: 'volunteer@example.com',
        subject: 'Local schedule test',
        text: 'Hello volunteer',
      });

      assertEquals(result.ok, true);
      assertEquals(result.status, 200);
      if (result.ok) {
        assertEquals(result.id?.startsWith('local-sim-'), true);
      }
    },
  ),
);

Deno.test(
  'sendResendEmail - sends via Resend API when in production environment',
  withEnv(
    {
      LOCAL_BROADCAST: 'false',
      RESEND_API_KEY: 'test_resend_key',
      RESEND_FROM_EMAIL: 'noreply@welcomechurch.ph',
      NODE_ENV: 'production',
      ENVIRONMENT: 'production',
      SUPABASE_URL: 'https://live.supabase.co',
    },
    async () => {
      const originalFetch = globalThis.fetch;
      let capturedPayload: unknown = null;

      globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === 'https://api.resend.com/emails') {
          capturedPayload = JSON.parse((init?.body as string) || '{}');
          return Promise.resolve(
            new Response(JSON.stringify({ id: 'resend_msg_123' }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }),
          );
        }
        return originalFetch(input, init);
      };

      try {
        const result = await sendResendEmail({
          to: ['recipient1@example.com'],
          subject: 'Production reminder',
          text: 'Reminder text',
        });

        assertEquals(result.ok, true);
        assertEquals(result.status, 200);
        if (result.ok) {
          assertEquals(result.id, 'resend_msg_123');
        }
        assertEquals((capturedPayload as { subject: string }).subject, 'Production reminder');
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  ),
);

Deno.test(
  'sendResendEmail - handles Resend API errors gracefully',
  withEnv(
    {
      LOCAL_BROADCAST: 'false',
      RESEND_API_KEY: 'test_resend_key',
      NODE_ENV: 'production',
      ENVIRONMENT: 'production',
      SUPABASE_URL: 'https://live.supabase.co',
    },
    async () => {
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url === 'https://api.resend.com/emails') {
          return Promise.resolve(
            new Response('Domain unverified', {
              status: 403,
            }),
          );
        }
        return originalFetch(input, init);
      };

      try {
        const result = await sendResendEmail({
          to: 'unverified@example.com',
          subject: 'Error test',
          text: 'Error text',
        });

        assertEquals(result.ok, false);
        assertEquals(result.status, 403);
        if (!result.ok) {
          assertEquals(result.error, 'Domain unverified');
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
    },
  ),
);
