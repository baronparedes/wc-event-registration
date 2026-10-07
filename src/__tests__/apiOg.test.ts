import handler from '@api/og';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as seoApi from '../lib/domain/seo/api';

describe('Vercel Serverless /api/og Handler', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('serves dynamic event meta tags when rewritten from event routes', async () => {
    vi.spyOn(seoApi, 'fetchEventMetadataForOg').mockResolvedValue({
      title: 'Excuse Request 2026',
      description: 'Submit an excuse request for upcoming Sunday service.',
      cover_image_key: 'covers/excuse-request.jpg',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<!doctype html><html><head><title>Welcome Hub</title></head><body><div id="root"></div></body></html>',
    });

    const request = new Request('https://www.welcomehub.app/api/og', {
      headers: {
        'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'x-matched-path': '/events/excuse-request-2026/register',
      },
    });

    const response = await handler(request);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=300');

    const html = await response.text();
    expect(html).toContain('<title>Excuse Request 2026 | Welcome Hub</title>');
    expect(html).toContain(
      '<meta property="og:title" content="Excuse Request 2026 | Welcome Hub" />',
    );
    expect(html).toContain(
      '<meta property="og:description" content="Submit an excuse request for upcoming Sunday service." />',
    );
    expect(html).toContain(
      '<meta property="og:url" content="https://www.welcomehub.app/events/excuse-request-2026/register" />',
    );
  });
});
