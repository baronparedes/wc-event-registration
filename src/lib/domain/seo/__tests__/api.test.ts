import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchEventMetadataForOg } from '../api';

describe('fetchEventMetadataForOg', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetches event metadata successfully', async () => {
    const mockEvent = {
      id: 'event-123',
      title: 'Youth Camp 2026',
      description: 'Annual youth gathering',
      cover_image_key: 'covers/camp.jpg',
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, event: mockEvent }),
    });

    const result = await fetchEventMetadataForOg('youth-camp-2026', {
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'test-anon-key',
    });

    expect(result).toEqual({
      title: 'Youth Camp 2026',
      description: 'Annual youth gathering',
      cover_image_key: 'covers/camp.jpg',
    });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test.supabase.co/functions/v1/get-public-event',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          apikey: 'test-anon-key',
          Authorization: 'Bearer test-anon-key',
        }),
        body: JSON.stringify({ slug: 'youth-camp-2026' }),
      }),
    );
  });

  it('returns null on fetch error or 404/500 HTTP response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await fetchEventMetadataForOg('missing-event', {
      supabaseUrl: 'https://test.supabase.co',
    });

    expect(result).toBeNull();
  });

  it('returns null when slug or supabaseUrl is missing', async () => {
    const result = await fetchEventMetadataForOg('', { supabaseUrl: '' });
    expect(result).toBeNull();
  });

  it('handles network timeouts gracefully', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        setTimeout(() => reject(new Error('AbortError')), 50);
      });
    });

    const result = await fetchEventMetadataForOg('timeout-event', {
      supabaseUrl: 'https://test.supabase.co',
      timeoutMs: 10,
    });

    expect(result).toBeNull();
  });
});
