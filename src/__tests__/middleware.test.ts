import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import middleware from '@/middleware';

import * as seoApi from '../lib/domain/seo/api';

describe('Vercel Edge Middleware', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('bypasses middleware for standard user browser traffic', async () => {
    const request = new Request('https://welcomehub.com/events/tech-summit/register', {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const response = await middleware(request);
    expect(response).toBeUndefined();
  });

  it('intercepts facebook crawler and serves dynamic event meta tags with proper caching headers', async () => {
    vi.spyOn(seoApi, 'fetchEventMetadataForOg').mockResolvedValue({
      title: 'Dev Summit 2026',
      description: 'Annual developers gathering.',
      cover_image_key: 'covers/devsummit.png',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<!doctype html><html><head><title>Welcome Hub</title></head><body><div id="root"></div></body></html>',
    });

    const request = new Request('https://welcomehub.com/events/dev-summit-2026/register', {
      headers: {
        'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      },
    });

    const response = await middleware(request);
    expect(response).toBeInstanceOf(Response);
    expect(response?.status).toBe(200);
    expect(response?.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response?.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=300');

    const html = await response!.text();
    expect(html).toContain('<title>Dev Summit 2026 | Welcome Hub</title>');
    expect(html).toContain('<meta property="og:title" content="Dev Summit 2026 | Welcome Hub" />');
    expect(html).toContain(
      '<meta property="og:description" content="Annual developers gathering." />',
    );
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it('falls back to default site metadata for crawler requests when event not found or fetch times out', async () => {
    vi.spyOn(seoApi, 'fetchEventMetadataForOg').mockResolvedValue(null);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<!doctype html><html><head><title>Welcome Hub</title></head><body><div id="root"></div></body></html>',
    });

    const request = new Request('https://welcomehub.com/events/non-existent-event/register', {
      headers: {
        'user-agent': 'Twitterbot/1.0',
      },
    });

    const response = await middleware(request);
    expect(response).toBeInstanceOf(Response);
    const html = await response!.text();
    expect(html).toContain('<title>Welcome Hub</title>');
    expect(html).toContain('<meta property="og:title" content="Welcome Hub" />');
    expect(html).toContain(
      '<meta property="og:image" content="https://welcomehub.com/android-chrome-192x192.png" />',
    );
  });
});
