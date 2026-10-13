import { assertEquals } from '@std/assert';

import {
  encodeBase64Utf8,
  escapeHtml,
  fetchResendTemplate,
  resetTemplateCache,
  tokenizeTemplate,
  wrapPlainTextAsHtml,
} from '../emailTemplate.ts';

Deno.test('tokenizeTemplate - replaces single and triple mustache variables', () => {
  const template =
    '<h1>Hello {{name}}</h1><p>Role: {{{role}}}</p><span>Unchanged: {{missing}}</span>';
  const variables = { name: 'John Doe', role: 'Usher' };

  const output = tokenizeTemplate(template, variables);
  assertEquals(output, '<h1>Hello John Doe</h1><p>Role: Usher</p><span>Unchanged: </span>');
});

Deno.test('tokenizeTemplate - handles null or missing variables gracefully', () => {
  const template = 'Hello {{name}}!';
  assertEquals(tokenizeTemplate(template, null), 'Hello {{name}}!');
  assertEquals(tokenizeTemplate(template, undefined), 'Hello {{name}}!');
  assertEquals(tokenizeTemplate('', { name: 'John' }), '');
});

Deno.test('escapeHtml - escapes HTML special characters', () => {
  const raw = '<script>alert("xss" & \'test\')</script>';
  assertEquals(
    escapeHtml(raw),
    '&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;test&#39;)&lt;/script&gt;',
  );
});

Deno.test('wrapPlainTextAsHtml - wraps text with breaklines in responsive html layout', () => {
  const plain = 'Line 1\nLine 2';
  const html = wrapPlainTextAsHtml(plain, 'Service Update');

  assertEquals(html.includes('<title>Service Update</title>'), true);
  assertEquals(html.includes('Line 1<br />Line 2'), true);
  assertEquals(html.includes('class="email-container"'), true);
});

Deno.test('encodeBase64Utf8 - accurately encodes UTF-8 and emoji characters', () => {
  const text = 'Hello world! 🇵🇭 Welcome Church';
  const encoded = encodeBase64Utf8(text);
  const decoded = new TextDecoder().decode(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0)));
  assertEquals(decoded, text);
});

Deno.test('fetchResendTemplate - fetches and caches template HTML with User-Agent', async () => {
  resetTemplateCache();
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  let capturedHeaders: HeadersInit | undefined;

  try {
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      fetchCount++;
      capturedHeaders = init?.headers;
      const url = input.toString();
      if (url === 'https://api.resend.com/templates/tmpl_123') {
        return Promise.resolve(
          Response.json({
            id: 'tmpl_123',
            subject: 'Reminder: {{event}}',
            html: '<p>Hi {{name}}</p>',
          }),
        );
      }
      return Promise.resolve(new Response(null, { status: 404 }));
    }) as typeof globalThis.fetch;

    const template1 = await fetchResendTemplate('tmpl_123', 'fake-key');
    assertEquals(template1?.id, 'tmpl_123');
    assertEquals(template1?.html, '<p>Hi {{name}}</p>');
    assertEquals(fetchCount, 1);
    assertEquals((capturedHeaders as Record<string, string>)?.['User-Agent'], 'WelcomeHub/1.0');

    // Second call should hit in-memory cache
    const template2 = await fetchResendTemplate('tmpl_123', 'fake-key');
    assertEquals(template2?.id, 'tmpl_123');
    assertEquals(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    resetTemplateCache();
  }
});

Deno.test('fetchResendTemplate - unwraps nested data envelope if present in response', async () => {
  resetTemplateCache();
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = ((input: RequestInfo | URL) => {
      const url = input.toString();
      if (url === 'https://api.resend.com/templates/tmpl_nested') {
        return Promise.resolve(
          Response.json({
            data: {
              id: 'tmpl_nested',
              subject: 'Nested Subject',
              html: '<div>Nested Content</div>',
            },
          }),
        );
      }
      return Promise.resolve(new Response('Not found', { status: 404 }));
    }) as typeof globalThis.fetch;

    const template = await fetchResendTemplate('tmpl_nested', 'fake-key');
    assertEquals(template?.id, 'tmpl_nested');
    assertEquals(template?.subject, 'Nested Subject');
    assertEquals(template?.html, '<div>Nested Content</div>');
  } finally {
    globalThis.fetch = originalFetch;
    resetTemplateCache();
  }
});

Deno.test('fetchResendTemplate - handles 400/404 HTTP errors gracefully', async () => {
  resetTemplateCache();
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (() => {
      return Promise.resolve(
        new Response(JSON.stringify({ statusCode: 404, message: 'Template not found' }), {
          status: 404,
        }),
      );
    }) as typeof globalThis.fetch;

    const template = await fetchResendTemplate('tmpl_missing', 'fake-key');
    assertEquals(template, null);
  } finally {
    globalThis.fetch = originalFetch;
    resetTemplateCache();
  }
});
