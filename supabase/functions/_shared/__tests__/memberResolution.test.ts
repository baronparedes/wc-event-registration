import { assertEquals } from '@std/assert';

import { ENV_KEYS } from '../constants.ts';
import { createMemberLookupToken } from '../memberLookupToken.ts';
import { resolveMemberUser } from '../memberResolution.ts';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const TOKEN_SECRET = 'test-token-secret-must-be-long-enough-32-chars';

function createMockSupabase(userRecord: unknown) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: userRecord, error: null }),
        }),
      }),
    }),
  } as never;
}

async function withEnv(run: () => Promise<void>) {
  const prev = Deno.env.get(ENV_KEYS.edgeTokenEncryptionSecret);
  Deno.env.set(ENV_KEYS.edgeTokenEncryptionSecret, TOKEN_SECRET);
  try {
    await run();
  } finally {
    if (prev === undefined) Deno.env.delete(ENV_KEYS.edgeTokenEncryptionSecret);
    else Deno.env.set(ENV_KEYS.edgeTokenEncryptionSecret, prev);
  }
}

Deno.test('resolveMemberUser returns error when no identifier provided', async () => {
  const supabase = createMockSupabase(null);
  const result = await resolveMemberUser(supabase, {});
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.errorCode, 'MEMBER_RESOLUTION_FAILED');
    assertEquals(result.status, 400);
  }
});

Deno.test('resolveMemberUser rejects invalid member_token', async () => {
  await withEnv(async () => {
    const supabase = createMockSupabase(null);
    const result = await resolveMemberUser(supabase, { member_token: 'mlt2.invalid.token' });
    assertEquals(result.success, false);
    if (!result.success) {
      assertEquals(result.errorCode, 'INVALID_TOKEN');
      assertEquals(result.status, 400);
    }
  });
});

Deno.test('resolveMemberUser successfully resolves valid member_token', async () => {
  await withEnv(async () => {
    const token = await createMemberLookupToken('MEM-1001', null);
    const mockUser = {
      id: USER_ID,
      member_id: 'MEM-1001',
      full_name: 'Test John Doe',
      email: 'john@example.com',
      is_active: true,
    };
    const supabase = createMockSupabase(mockUser);
    const result = await resolveMemberUser(supabase, { member_token: token! });
    assertEquals(result.success, true);
    if (result.success) {
      assertEquals(result.user.userId, USER_ID);
      assertEquals(result.user.memberId, 'MEM-1001');
      assertEquals(result.user.fullName, 'Test John Doe');
      assertEquals(result.user.email, 'john@example.com');
    }
  });
});

Deno.test('resolveMemberUser resolves authenticated session user ID', async () => {
  const mockUser = {
    id: USER_ID,
    member_id: 'MEM-1001',
    full_name: 'Test Jane Doe',
    email: 'jane@example.com',
    is_active: true,
  };
  const supabase = createMockSupabase(mockUser);
  const result = await resolveMemberUser(supabase, { authUserId: USER_ID });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.user.userId, USER_ID);
    assertEquals(result.user.fullName, 'Test Jane Doe');
  }
});

Deno.test('resolveMemberUser returns 404 when user is not found or inactive', async () => {
  const supabase = createMockSupabase(null);
  const result = await resolveMemberUser(supabase, { member_id: 'MEM-9999' });
  assertEquals(result.success, false);
  if (!result.success) {
    assertEquals(result.errorCode, 'MEMBER_NOT_FOUND');
    assertEquals(result.status, 404);
  }
});
