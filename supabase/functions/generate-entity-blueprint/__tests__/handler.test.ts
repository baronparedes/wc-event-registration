import { assertEquals, assertMatch } from '@std/assert';

import { getSystemPrompt, getUserPrompt, parseBlueprintResponse } from '../prompt.ts';

const ORIGIN = 'https://app.example.com';

function isHostnameAllowed(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

async function withEnv(
  options: { apiKey?: string; role?: string; adminId?: string } = {},
  run: (handle: (req: Request) => Promise<Response>) => Promise<void>,
) {
  const adminId = options.adminId ?? crypto.randomUUID();
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS', 'GOOGLE_API_KEY'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);

  if (options.apiKey !== undefined) {
    Deno.env.set('GOOGLE_API_KEY', options.apiKey);
  } else {
    Deno.env.delete('GOOGLE_API_KEY');
    Deno.env.delete('GOOGLE_GENERATIVE_AI_API_KEY');
  }

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: adminId }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: options.role ?? 'admin' }));
    }
    // Mock Google Generative AI API endpoint
    if (
      isHostnameAllowed(url.hostname, 'googleapis.com') ||
      isHostnameAllowed(url.hostname, 'generativelanguage.googleapis.com')
    ) {
      const mockBlueprint = {
        metadata: {
          title: 'Couples Fellowship 2026',
          slug: 'couples-fellowship-2026',
          description: 'A night of encouragement and connection for married couples.',
          location: 'Multi-Purpose Hall',
          audience: 'members_and_public',
          duplicate_policy: 'block',
        },
        fields: [
          {
            field_key: 'spouse_name',
            label: "Spouse's Full Name",
            field_type: 'text',
            is_required: true,
            placeholder: 'Jane Doe',
            help_text: null,
            options: [],
            validation_rules: {},
          },
          {
            field_key: 'need_childcare',
            label: 'Do you require childcare services during the event?',
            field_type: 'radio',
            is_required: true,
            options: [
              { label: 'Yes', value: 'yes' },
              { label: 'No', value: 'no' },
            ],
            validation_rules: {},
          },
          {
            field_key: 'childcare_count',
            label: 'How many children will need childcare?',
            field_type: 'number',
            is_required: false,
            options: [],
            validation_rules: {
              visibility_rule: {
                depends_on_field_key: 'need_childcare',
                equals_value: 'yes',
              },
            },
          },
        ],
      };

      const mockResponseBody = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify(mockBlueprint),
                },
              ],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 200, totalTokenCount: 320 },
      };
      return Promise.resolve(Response.json(mockResponseBody));
    }

    return Promise.resolve(new Response('Not Found', { status: 404 }));
  };

  try {
    const { handleGenerateEntityBlueprint } = await import('../handler.ts');
    await run(handleGenerateEntityBlueprint);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function request(body: unknown, authenticated = true) {
  const headers = new Headers({ origin: ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/generate-entity-blueprint', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

// 1. Prompt & Parser Unit Tests
Deno.test('getSystemPrompt strictly bans AI slop and corporate filler words', () => {
  const eventPrompt = getSystemPrompt('event');
  assertMatch(eventPrompt, /EDITORIAL EXCELLENCE & ANTI-SLOP RULES/);
  assertMatch(eventPrompt, /Zero AI Slop & Buzzwords/);
  assertMatch(eventPrompt, /delve/);
  assertMatch(eventPrompt, /tapestry/);
  assertMatch(eventPrompt, /location/);

  const formPrompt = getSystemPrompt('form');
  assertMatch(formPrompt, /Zero AI Slop & Buzzwords/);
  assertEquals(formPrompt.includes('location'), false);
});

Deno.test('getUserPrompt embeds prompt and audience preference', () => {
  const prompt = getUserPrompt({
    domain: 'event',
    prompt: 'Couples retreat with dinner',
    audiencePreference: 'members',
  });
  assertMatch(prompt, /Entity Domain: EVENT/);
  assertMatch(prompt, /Target Audience Preference: members/);
  assertMatch(prompt, /Couples retreat with dinner/);
});

Deno.test('parseBlueprintResponse cleanly handles markdown code fences and cleans fields', () => {
  const rawMarkdown = `\`\`\`json
{
  "metadata": {
    "title": "Volunteer Training 2026",
    "description": "Annual training workshop."
  },
  "fields": [
    {
      "field_key": "years_serving",
      "label": "How many years have you been serving?",
      "field_type": "number",
      "is_required": true
    },
    {
      "field_key": "dietary_needs",
      "label": "Dietary needs?",
      "field_type": "radio",
      "is_required": true,
      "options": [{"label": "Yes", "value": "yes"}, {"label": "No", "value": "no"}]
    },
    {
      "field_key": "dietary_details",
      "label": "Please specify:",
      "field_type": "text",
      "is_required": false,
      "validation_rules": {
        "visibility_rule": {
          "depends_on_field_key": "dietary_needs",
          "equals_value": "yes"
        }
      }
    }
  ]
}
\`\`\``;

  const result = parseBlueprintResponse(rawMarkdown, 'event');
  assertEquals(result.domain, 'event');
  assertEquals(result.metadata.title, 'Volunteer Training 2026');
  assertEquals(result.metadata.slug, 'volunteer-training-2026');
  assertEquals(typeof result.metadata.starts_at, 'string');
  assertEquals(typeof result.metadata.ends_at, 'string');
  assertEquals(typeof result.metadata.registration_opens_at, 'string');
  assertEquals(typeof result.metadata.registration_closes_at, 'string');
  assertMatch(result.metadata.starts_at!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assertMatch(result.metadata.ends_at!, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  assertEquals(result.fields.length, 3);
  assertEquals(result.fields[0].field_key, 'years_serving');
  assertEquals(result.fields[0].field_type, 'number');
  assertEquals(result.fields[1].options.length, 2);
  assertEquals(
    result.fields[2].validation_rules.visibility_rule?.depends_on_field_key,
    'dietary_needs',
  );
});

Deno.test(
  'parseBlueprintResponse strips invalid visibility rule if target field does not exist',
  () => {
    const rawJson = JSON.stringify({
      metadata: { title: 'Test Event' },
      fields: [
        {
          field_key: 'custom_notes',
          label: 'Notes',
          field_type: 'textarea',
          validation_rules: {
            visibility_rule: {
              depends_on_field_key: 'non_existent_field',
              equals_value: 'xyz',
            },
          },
        },
      ],
    });

    const result = parseBlueprintResponse(rawJson, 'form');
    assertEquals(result.fields[0].validation_rules.visibility_rule, undefined);
  },
);

// 2. HTTP Handler Tests
Deno.test('handleGenerateEntityBlueprint rejects unauthenticated requests with 401', async () => {
  await withEnv({ apiKey: 'fake-key' }, async (handle) => {
    const res = await handle(request({ domain: 'event', prompt: 'Summer youth camp' }, false));
    assertEquals(res.status, 401);
  });
});

Deno.test('handleGenerateEntityBlueprint rejects non-admin users with 401', async () => {
  await withEnv({ apiKey: 'fake-key', role: 'member' }, async (handle) => {
    const res = await handle(request({ domain: 'event', prompt: 'Summer youth camp' }));
    assertEquals(res.status, 401);
  });
});

Deno.test('handleGenerateEntityBlueprint returns 400 on short prompts', async () => {
  await withEnv({ apiKey: 'fake-key' }, async (handle) => {
    const res = await handle(request({ domain: 'event', prompt: 'hi' }));
    assertEquals(res.status, 400);
  });
});

Deno.test('handleGenerateEntityBlueprint returns 500 when GOOGLE_API_KEY is missing', async () => {
  await withEnv({}, async (handle) => {
    const res = await handle(request({ domain: 'event', prompt: 'Couples retreat with dinner' }));
    assertEquals(res.status, 500);
    const body = await res.json();
    assertEquals(body.error, 'AI generation service is not configured');
  });
});

Deno.test('handleGenerateEntityBlueprint successfully returns structured blueprint', async () => {
  await withEnv({ apiKey: 'fake-google-key' }, async (handle) => {
    const res = await handle(
      request({
        domain: 'event',
        prompt: 'Couples Fellowship 2026 with childcare needs and emergency contact',
        audiencePreference: 'members_and_public',
      }),
    );

    assertEquals(res.status, 200);
    const body = await res.json();
    assertEquals(body.domain, 'event');
    assertEquals(body.metadata.title, 'Couples Fellowship 2026');
    assertEquals(body.metadata.slug, 'couples-fellowship-2026');
    assertEquals(typeof body.metadata.starts_at, 'string');
    assertEquals(typeof body.metadata.ends_at, 'string');
    assertEquals(typeof body.metadata.registration_opens_at, 'string');
    assertEquals(typeof body.metadata.registration_closes_at, 'string');
    assertEquals(body.fields.length, 3);
    assertEquals(body.fields[0].field_key, 'spouse_name');
    assertEquals(body.fields[1].field_type, 'radio');
    assertEquals(
      body.fields[2].validation_rules.visibility_rule?.depends_on_field_key,
      'need_childcare',
    );
  });
});
