import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as seoApi from '@/lib/domain/seo/api';
import handler, { handleOgRequest } from '@/lib/domain/seo/handler';

describe('api/og Serverless Function', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('generates dynamic open graph HTML for public events', async () => {
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

    const html = await handleOgRequest(
      'https://www.welcomehub.app/api/og?route=/events/dev-summit-2026/register',
    );

    expect(html).toContain('<title>Dev Summit 2026 | Welcome Hub</title>');
    expect(html).toContain('<meta property="og:title" content="Dev Summit 2026 | Welcome Hub" />');
    expect(html).toContain(
      '<meta property="og:description" content="Annual developers gathering." />',
    );
    expect(html).toContain(
      '<meta property="og:image" content="http://127.0.0.1:54321/storage/v1/object/public/event_covers/covers/devsummit.png" />',
    );
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it('generates dynamic open graph HTML for public forms', async () => {
    vi.spyOn(seoApi, 'fetchFormMetadataForOg').mockResolvedValue({
      title: 'Volunteer Signup',
      description: 'Join Sunday team.',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<!doctype html><html><head><title>Welcome Hub</title></head><body><div id="root"></div></body></html>',
    });

    const html = await handleOgRequest(
      'https://www.welcomehub.app/api/og?route=/forms/volunteer-signup/submit',
    );

    expect(html).toContain('<title>Volunteer Signup | Welcome Hub</title>');
    expect(html).toContain('<meta property="og:title" content="Volunteer Signup | Welcome Hub" />');
    expect(html).toContain('<meta property="og:description" content="Join Sunday team." />');
    expect(html).toContain(
      '<meta property="og:url" content="https://www.welcomehub.app/forms/volunteer-signup/submit" />',
    );
  });

  it('handles Web standard Request object in default handler', async () => {
    vi.spyOn(seoApi, 'fetchEventMetadataForOg').mockResolvedValue({
      title: 'Music Workshop',
      description: 'Learn acoustic guitar.',
      cover_image_key: null,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<!doctype html><html><head><title>Welcome Hub</title></head><body><div id="root"></div></body></html>',
    });

    const request = new Request(
      'https://www.welcomehub.app/api/og?route=/events/music-workshop/countdown',
    );

    const response = (await handler(request)) as Response;
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=300');

    const html = await response.text();
    expect(html).toContain('<title>Music Workshop | Welcome Hub</title>');
    expect(html).toContain(
      '<meta property="og:image" content="https://www.welcomehub.app/android-chrome-192x192.png" />',
    );
  });

  it('handles Node-like request and response objects in default handler', async () => {
    vi.spyOn(seoApi, 'fetchEventMetadataForOg').mockResolvedValue({
      title: 'Tech Fest',
      description: 'Annual gathering.',
      cover_image_key: null,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<!doctype html><html><head><title>Welcome Hub</title></head><body><div id="root"></div></body></html>',
    });

    const headers: Record<string, string> = {};
    let statusSet = 0;
    let sentBody = '';

    const fakeReq = {
      query: { route: '/events/tech-fest/register' },
      url: '/api/og?route=/events/tech-fest/register',
      headers: { host: 'www.welcomehub.app' },
    };

    const fakeRes = {
      status(code: number) {
        statusSet = code;
        return this;
      },
      setHeader(key: string, value: string) {
        headers[key] = value;
        return this;
      },
      send(body: string) {
        sentBody = body;
      },
    };

    await handler(fakeReq, fakeRes);

    expect(statusSet).toBe(200);
    expect(headers['Content-Type']).toBe('text/html; charset=utf-8');
    expect(headers['Cache-Control']).toBe('public, max-age=60, s-maxage=300');
    expect(sentBody).toContain('<title>Tech Fest | Welcome Hub</title>');
  });

  it('falls back to default template when fetching fails', async () => {
    vi.spyOn(seoApi, 'fetchEventMetadataForOg').mockRejectedValue(new Error('Network error'));

    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const request = new Request(
      'https://www.welcomehub.app/api/og?route=/events/failing-event/register',
    );

    const response = (await handler(request)) as Response;
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(200);

    const html = await response.text();
    expect(html).toContain('<title>Welcome Hub</title>');
  });
});
