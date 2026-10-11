import { assertEquals } from '@std/assert';
import { parseRequest } from '../handlers/parseRequest.ts';
import { createMemberLookupToken } from '@/shared/memberLookupToken.ts';

Deno.test('parseRequest correctly parses valid body', async () => {
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

Deno.test('parseRequest fails when missing idempotency key', async () => {
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
