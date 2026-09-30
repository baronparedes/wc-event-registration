import { assertEquals } from '@std/assert';

import { ENV_KEYS } from '../constants.ts';
import { createMemberLookupToken, decodeMemberLookupToken } from '../memberLookupToken.ts';

async function withTokenSecret(secret: string | undefined, run: () => Promise<void>) {
  const previousSecret = Deno.env.get(ENV_KEYS.edgeTokenEncryptionSecret);
  if (secret === undefined) {
    Deno.env.delete(ENV_KEYS.edgeTokenEncryptionSecret);
  } else {
    Deno.env.set(ENV_KEYS.edgeTokenEncryptionSecret, secret);
  }

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

Deno.test('createMemberLookupToken rejects a blank member ID', async () => {
  await withTokenSecret('test-secret', async () => {
    assertEquals(await createMemberLookupToken('  ', 'event'), null);
  });
});

Deno.test('member lookup tokens round-trip normalized claims and the expiry window', async () => {
  await withTokenSecret('test-secret', async () => {
    const token = await createMemberLookupToken(' member-001 ', ' spring-event ');
    if (!token) throw new Error('Expected a token');

    const decoded = await decodeMemberLookupToken(token);
    if (!decoded) throw new Error('Expected a decoded token');

    assertEquals(token.startsWith('mlt2.'), true);
    assertEquals(decoded.memberId, 'member-001');
    assertEquals(decoded.eventSlug, 'spring-event');
    assertEquals(decoded.exp - decoded.iat, 600);
  });
});

Deno.test('decodeMemberLookupToken rejects expired tokens', async () => {
  await withTokenSecret('test-secret', async () => {
    const originalNow = Date.now;
    const issuedAt = Date.parse('2026-09-30T12:00:00Z');

    try {
      Date.now = () => issuedAt;
      const token = await createMemberLookupToken('member-001', null);
      if (!token) throw new Error('Expected a token');

      Date.now = () => issuedAt + 601_000;
      assertEquals(await decodeMemberLookupToken(token), null);
    } finally {
      Date.now = originalNow;
    }
  });
});

Deno.test(
  'member lookup token decoding rejects malformed, tampered, and wrong-secret tokens',
  async () => {
    await withTokenSecret('test-secret', async () => {
      const token = await createMemberLookupToken('member-001', null);
      if (!token) throw new Error('Expected a token');

      assertEquals(await decodeMemberLookupToken('not-a-token'), null);
      assertEquals(await decodeMemberLookupToken(token.replace('mlt2.', 'mlt1.')), null);

      const [prefix, iv, payload] = token.split('.');
      const replacementCharacter = payload?.[0] === 'A' ? 'B' : 'A';
      const tamperedToken = `${prefix}.${iv}.${replacementCharacter}${payload?.slice(1)}`;
      assertEquals(await decodeMemberLookupToken(tamperedToken), null);
    });

    await withTokenSecret('different-secret', async () => {
      const token = await createMemberLookupToken('member-001', null);
      if (!token) throw new Error('Expected a token');
      await withTokenSecret('test-secret', async () => {
        assertEquals(await decodeMemberLookupToken(token), null);
      });
    });
  },
);

Deno.test('member lookup token creation and decoding fail closed without a secret', async () => {
  await withTokenSecret(undefined, async () => {
    assertEquals(await createMemberLookupToken('member-001', null), null);
    assertEquals(await decodeMemberLookupToken('mlt2.invalid.invalid'), null);
  });
});
