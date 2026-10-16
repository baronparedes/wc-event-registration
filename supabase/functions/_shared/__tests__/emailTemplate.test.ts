import { assertEquals } from '@std/assert';

import {
  encodeBase64Utf8,
  escapeHtml,
  fetchResendTemplate,
  linkifyEscapedText,
  resetTemplateCache,
  resolveActionText,
  toAbsoluteUrl,
  tokenizeTemplate,
  wrapPlainTextAsHtml,
} from '../emailTemplate.ts';

Deno.test('toAbsoluteUrl - resolves relative paths to welcomehub.app by default', () => {
  assertEquals(
    toAbsoluteUrl('/events/okay-ka-pop/countdown'),
    'https://welcomehub.app/events/okay-ka-pop/countdown',
  );
  assertEquals(
    toAbsoluteUrl('events/okay-ka-pop/countdown'),
    'https://welcomehub.app/events/okay-ka-pop/countdown',
  );
  assertEquals(toAbsoluteUrl('/profile'), 'https://welcomehub.app/profile');
  assertEquals(toAbsoluteUrl('https://example.com/custom-page'), 'https://example.com/custom-page');
  assertEquals(toAbsoluteUrl(''), '');
  assertEquals(toAbsoluteUrl(null), '');
  assertEquals(
    toAbsoluteUrl('/events/123', 'https://staging.welcomehub.app'),
    'https://staging.welcomehub.app/events/123',
  );
});

Deno.test('resolveActionText - derives contextual button labels', () => {
  assertEquals(resolveActionText('/events/okay-ka-pop/countdown'), 'View Event');
  assertEquals(resolveActionText('https://welcomehub.app/profile'), 'View Profile');
  assertEquals(resolveActionText('/register/sunday'), 'Register Now');
  assertEquals(resolveActionText('/forms/volunteer-signup'), 'Open Form');
  assertEquals(resolveActionText('/admin/notifications'), 'Open Admin Dashboard');
  assertEquals(resolveActionText('/'), 'Open Welcome Hub');
  assertEquals(resolveActionText('https://welcomehub.app'), 'Open Welcome Hub');
  assertEquals(resolveActionText('/other/path'), 'View Details');
});

Deno.test('tokenizeTemplate - replaces single and triple mustache variables', () => {
  const template =
    '<h1>Hello {{name}}</h1><p>Role: {{{role}}}</p><span>Unchanged: {{missing}}</span>';
  const variables = { name: 'John Doe', role: 'Usher' };

  const output = tokenizeTemplate(template, variables);
  assertEquals(output, '<h1>Hello John Doe</h1><p>Role: Usher</p><span>Unchanged: </span>');
});

Deno.test('tokenizeTemplate - handles conditional sections and inverted sections', () => {
  const template =
    '<div>{{#action_url}}<a href="{{action_url}}">{{action_text}}</a>{{/action_url}}{{^action_url}}No link{{/action_url}}</div>';

  const withUrl = tokenizeTemplate(template, {
    action_url: 'https://welcomehub.app/events/123',
    action_text: 'View Event',
  });
  assertEquals(withUrl, '<div><a href="https://welcomehub.app/events/123">View Event</a></div>');

  const withoutUrl = tokenizeTemplate(template, { action_url: '', action_text: '' });
  assertEquals(withoutUrl, '<div>No link</div>');

  const withNullUrl = tokenizeTemplate(template, null);
  assertEquals(withNullUrl, template);
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

Deno.test('linkifyEscapedText - turns URLs into hyperlinks safely', () => {
  const input = 'Check out https://welcomehub.app/events/123 for details.';
  const output = linkifyEscapedText(input);
  assertEquals(
    output,
    'Check out <a href="https://welcomehub.app/events/123" style="color: #2563eb; text-decoration: underline;" target="_blank" rel="noopener noreferrer">https://welcomehub.app/events/123</a> for details.',
  );
});

Deno.test('wrapPlainTextAsHtml - wraps text with breaklines in responsive html layout', () => {
  const plain = 'Line 1\nLine 2';
  const html = wrapPlainTextAsHtml(plain, 'Service Update');

  assertEquals(html.includes('<title>Service Update</title>'), true);
  assertEquals(html.includes('<h2 class="email-title">Service Update</h2>'), true);
  assertEquals(html.includes('Line 1<br />Line 2'), true);
  assertEquals(html.includes('class="email-container"'), true);
  assertEquals(html.includes('welcomehub.app'), true);
  assertEquals(html.includes('<div class="email-cta-container"'), false);
});

Deno.test('wrapPlainTextAsHtml - renders CTA button and full domain for relative actionUrl', () => {
  const message = 'Join us for Christmas party!\n\nSee you there!';
  const html = wrapPlainTextAsHtml(message, 'Event Notice', {
    actionUrl: '/events/okay-ka-pop/countdown',
  });

  assertEquals(html.includes('<div class="email-cta-container"'), true);
  assertEquals(html.includes('href="https://welcomehub.app/events/okay-ka-pop/countdown"'), true);
  assertEquals(html.includes('View Event &rarr;'), true);
  assertEquals(html.includes('class="email-button"'), true);
  assertEquals(html.includes('/events/okay-ka-pop/countdown<br />'), false);
});

Deno.test(
  'wrapPlainTextAsHtml - auto-detects trailing relative URL from text and strips it from body',
  () => {
    const text = 'Join us for Christmas party!\n\nSee you there!\n\n/events/okay-ka-pop/countdown';
    const html = wrapPlainTextAsHtml(text, 'Event Notice');

    assertEquals(html.includes('<div class="email-cta-container"'), true);
    assertEquals(html.includes('href="https://welcomehub.app/events/okay-ka-pop/countdown"'), true);
    assertEquals(html.includes('View Event &rarr;'), true);
    // Ensure trailing URL was stripped from the message body
    assertEquals(html.includes('/events/okay-ka-pop/countdown<br />'), false);
    assertEquals(
      html.includes('Join us for Christmas party!<br /><br />See you there!\n    </div>'),
      true,
    );
  },
);

Deno.test('wrapPlainTextAsHtml - supports custom actionText', () => {
  const message = 'Fill up this form:';
  const html = wrapPlainTextAsHtml(message, 'Survey', {
    actionUrl: 'https://welcomehub.app/forms/feedback',
    actionText: 'Complete Survey',
  });

  assertEquals(html.includes('Complete Survey &rarr;'), true);
  assertEquals(html.includes('href="https://welcomehub.app/forms/feedback"'), true);
});

Deno.test('wrapPlainTextAsHtml - converts inline URLs in body text to hyperlinks', () => {
  const plain = 'Please visit https://welcomehub.app for updates.';
  const html = wrapPlainTextAsHtml(plain);

  assertEquals(html.includes('<h2 class="email-title">'), false);
  assertEquals(html.includes('<a href="https://welcomehub.app"'), true);
});

Deno.test('encodeBase64Utf8 - accurately encodes UTF-8 and emoji characters', () => {
  const text = 'Hello world! 🇵🇭 Welcome Ministry';
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
