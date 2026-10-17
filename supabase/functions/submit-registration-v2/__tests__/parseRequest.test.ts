import { assertEquals } from '@std/assert';

import { ENV_KEYS } from '@/shared/constants.ts';
import { createMemberLookupToken } from '@/shared/memberLookupToken.ts';

import { parseRequest } from '../handlers/parseRequest.ts';

async function withTokenSecret(run: () => Promise<void>) {
  const previousSecret = Deno.env.get(ENV_KEYS.edgeTokenEncryptionSecret);
  Deno.env.set(ENV_KEYS.edgeTokenEncryptionSecret, 'test-edge-token-encryption-secret');
  try {
    await run();
  } finally {
    if (previousSecret === undefined) {
      Deno.env.delete(ENV_KEYS.edgeTokenEncryptionSecret);
    } else {
      Deno.env.set(ENV_KEYS.edgeTokenEncryptionSecret, previousSecret);
    }
  }
}

Deno.test('parseRequest correctly parses valid body', async () => {
  await withTokenSecret(async () => {
    const token = await createMemberLookupToken('member-1', 'event-1');
    const req = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_slug: 'event-1',
        member_token: token,
        responses: { answer1: 'yes' },
        idempotency_key: 'idemp-key',
      }),
    });

    const result = await parseRequest(req);
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.data.event_slug, 'event-1');
      assertEquals(result.data.member_id, 'member-1');
      assertEquals(result.data.responses.answer1, 'yes');
      assertEquals(result.data.idempotency_key, 'idemp-key');
    }
  });
});

Deno.test('parseRequest fails when missing idempotency key', async () => {
  await withTokenSecret(async () => {
    const token = await createMemberLookupToken('member-1', 'event-1');
    const req = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_slug: 'event-1',
        member_token: token,
        responses: { answer1: 'yes' },
      }),
    });

    const result = await parseRequest(req);
    assertEquals(result.ok, false);
  });
});

Deno.test('parseRequest fails on invalid JSON', async () => {
  const req = new Request('https://example.com', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{ bad json',
  });

  const result = await parseRequest(req);
  assertEquals(result.ok, false);
});

Deno.test('parseRequest fails on missing required fields', async () => {
  await withTokenSecret(async () => {
    const token = await createMemberLookupToken('member-1', 'event-1');
    const req = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        member_token: token, // Missing event_slug
      }),
    });

    const result = await parseRequest(req);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.errorCode, 'INVALID_REQUEST');
    }
  });
});

Deno.test('parseRequest fails when member_token cannot be decoded', async () => {
  await withTokenSecret(async () => {
    const req = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_slug: 'event-1',
        member_token: 'mlt2.invalid.payload',
        responses: {},
        idempotency_key: 'idemp-1',
      }),
    });

    const result = await parseRequest(req);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.errorCode, 'INVALID_REQUEST');
      assertEquals(result.message, 'Invalid request payload');
    }
  });
});

Deno.test('parseRequest fails when member_token has mismatched eventSlug', async () => {
  await withTokenSecret(async () => {
    const token = await createMemberLookupToken('member-1', 'event-1');
    const req = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_slug: 'event-different',
        member_token: token,
        responses: {},
        idempotency_key: 'idemp-1',
      }),
    });

    const result = await parseRequest(req);
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.errorCode, 'INVALID_REQUEST');
      assertEquals(result.message, 'Invalid request payload');
    }
  });
});

Deno.test('parseRequest succeeds when member_token has null eventSlug', async () => {
  await withTokenSecret(async () => {
    const token = await createMemberLookupToken('member-1', null);
    const req = new Request('https://example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_slug: 'any-event',
        member_token: token,
        responses: { key: 'val' },
        idempotency_key: 'idemp-1',
      }),
    });

    const result = await parseRequest(req);
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.data.event_slug, 'any-event');
      assertEquals(result.data.member_id, 'member-1');
    }
  });
});
