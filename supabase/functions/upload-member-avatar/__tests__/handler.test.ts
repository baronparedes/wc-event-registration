import { assertEquals } from '@std/assert';

import { handleUploadMemberAvatar } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const MEMBER_ID = '11111111-1111-4111-8111-111111111111';
const JPEG_DATA_URL = 'data:image/jpeg;base64,/9j/2Q==';
let requestNumber = 0;

async function withFunctionEnv(run: () => Promise<void>) {
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(body: unknown, authenticated = true) {
  const headers = new Headers({
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${++requestNumber}`,
  });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/upload-member-avatar', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function payload(image = JPEG_DATA_URL) {
  return { id: MEMBER_ID, image_base64: image };
}

type FetchOptions = {
  member?: { avatar_object_key: string | null } | null;
  memberError?: boolean;
  storageError?: boolean;
  updateError?: boolean;
  updatedMember?: { id: string } | null;
  role?: string;
};

function mockFetch(options: FetchOptions = {}) {
  const originalFetch = globalThis.fetch;
  const lookups: URL[] = [];
  const updates: Array<{ url: URL; body: unknown }> = [];
  const uploads: Array<{ url: URL; headers: Headers; body: BodyInit | null | undefined }> = [];

  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-record', role: options.role ?? 'admin' }));
    }
    if (url.pathname === '/rest/v1/users' && init?.method === 'PATCH') {
      updates.push({ url, body: JSON.parse(String(init.body)) as unknown });
      return Promise.resolve(
        options.updateError
          ? Response.json({ message: 'update failed' }, { status: 500 })
          : Response.json(
              options.updatedMember === undefined ? { id: MEMBER_ID } : options.updatedMember,
            ),
      );
    }
    if (url.pathname === '/rest/v1/users') {
      lookups.push(url);
      return Promise.resolve(
        options.memberError
          ? Response.json({ message: 'lookup failed' }, { status: 500 })
          : Response.json(
              options.member === undefined ? { avatar_object_key: null } : options.member,
            ),
      );
    }
    if (url.pathname.startsWith('/storage/v1/object/member_avatars/')) {
      uploads.push({ url, headers: new Headers(init?.headers), body: init?.body });
      return Promise.resolve(
        options.storageError
          ? Response.json({ message: 'upload failed' }, { status: 500 })
          : Response.json({ Key: url.pathname.slice('/storage/v1/object/'.length) }),
      );
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    lookups,
    updates,
    uploads,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('upload-member-avatar validates IDs and requires an admin session', async () => {
  await withFunctionEnv(async () => {
    assertEquals(
      (await handleUploadMemberAvatar(buildRequest({ ...payload(), id: 'invalid' }))).status,
      400,
    );
    assertEquals((await handleUploadMemberAvatar(buildRequest(payload(), false))).status, 401);
    const fetchMock = mockFetch({ role: 'slod' });
    try {
      const response = await handleUploadMemberAvatar(buildRequest(payload()));
      assertEquals(response.status, 401);
      assertEquals(fetchMock.lookups, []);
      assertEquals(fetchMock.uploads, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('upload-member-avatar rejects invalid JPEG data before member lookup', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch();
    try {
      for (const image of [
        'data:image/png;base64,/9j/2Q==',
        'data:image/jpeg;base64,AAAA',
        'data:image/jpeg;base64,!!!',
      ]) {
        const response = await handleUploadMemberAvatar(buildRequest(payload(image)));
        assertEquals(response.status, 400);
        assertEquals((await response.json()).error, 'A valid JPEG image is required');
      }
      assertEquals(fetchMock.lookups, []);
      assertEquals(fetchMock.uploads, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('upload-member-avatar rejects decoded images larger than 1 MB', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const bytes = new Uint8Array(1_048_577);
      bytes.set([0xff, 0xd8]);
      bytes.set([0xff, 0xd9], bytes.length - 2);
      let base64 = '';
      for (let offset = 0; offset < bytes.length; offset += 24_576) {
        base64 += btoa(String.fromCharCode(...bytes.subarray(offset, offset + 24_576)));
      }
      const response = await handleUploadMemberAvatar(
        buildRequest(payload(`data:image/jpeg;base64,${base64}`)),
      );
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error, 'Image must be 1 MB or smaller');
      assertEquals(fetchMock.lookups, []);
      assertEquals(fetchMock.uploads, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'upload-member-avatar handles member lookup failures and missing active members',
  async () => {
    await withFunctionEnv(async () => {
      for (const options of [{ memberError: true }, { member: null }]) {
        const fetchMock = mockFetch(options);
        try {
          const response = await handleUploadMemberAvatar(buildRequest(payload()));
          assertEquals(response.status, options.memberError ? 500 : 404);
          assertEquals(fetchMock.lookups[0].searchParams.get('is_active'), 'eq.true');
          assertEquals(fetchMock.uploads, []);
        } finally {
          fetchMock.restore();
        }
      }
    });
  },
);

Deno.test('upload-member-avatar uploads a JPEG and updates the member avatar key', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const response = await handleUploadMemberAvatar(buildRequest(payload()));
      const key = `avatars/member/${MEMBER_ID}.jpg`;
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, avatar_object_key: key });
      assertEquals(fetchMock.uploads.length, 1);
      assertEquals(fetchMock.uploads[0].url.pathname, `/storage/v1/object/member_avatars/${key}`);
      assertEquals(fetchMock.uploads[0].headers.get('content-type'), 'image/jpeg');
      assertEquals(fetchMock.uploads[0].headers.get('x-upsert'), 'true');
      assertEquals(fetchMock.updates[0].body, { avatar_object_key: key });
      assertEquals(fetchMock.updates[0].url.searchParams.get('id'), `eq.${MEMBER_ID}`);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'upload-member-avatar reuses the existing avatar path with a JPEG extension',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ member: { avatar_object_key: 'avatars/member/legacy.JPEG' } });
      try {
        const response = await handleUploadMemberAvatar(buildRequest(payload()));
        assertEquals((await response.json()).avatar_object_key, 'avatars/member/legacy.jpg');
        assertEquals(fetchMock.updates[0].body, { avatar_object_key: 'avatars/member/legacy.jpg' });
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('upload-member-avatar does not update the member when storage fails', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ storageError: true });
    try {
      const response = await handleUploadMemberAvatar(buildRequest(payload()));
      assertEquals(response.status, 500);
      assertEquals(fetchMock.updates, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'upload-member-avatar reports failures after storage when member update fails',
  async () => {
    await withFunctionEnv(async () => {
      for (const options of [{ updateError: true }, { updatedMember: null }]) {
        const fetchMock = mockFetch(options);
        try {
          const response = await handleUploadMemberAvatar(buildRequest(payload()));
          assertEquals(response.status, options.updateError ? 500 : 404);
          assertEquals(fetchMock.uploads.length, 1);
        } finally {
          fetchMock.restore();
        }
      }
    });
  },
);
