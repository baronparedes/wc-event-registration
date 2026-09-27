import { afterEach, describe, expect, it, vi } from 'vitest';

describe('config env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses VITE Supabase vars when present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vite.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'vite-anon');

    const { env } = await import('@/config/env');

    expect(env.supabaseUrl).toBe('https://vite.supabase.co');
    expect(env.supabasePublishableKey).toBe('vite-anon');
  });

  it('falls back to NEXT_PUBLIC vars', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://next.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'next-anon');

    const { env } = await import('@/config/env');

    expect(env.supabaseUrl).toBe('https://next.supabase.co');
    expect(env.supabasePublishableKey).toBe('next-anon');
  });

  it('reads VAPID public key and optional vars correctly', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vite.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'vite-anon');
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'test-vapid-key');
    vi.stubEnv('VITE_APP_VERSION', '1.0.0');

    const { env } = await import('@/config/env');

    expect(env.vapidPublicKey).toBe('test-vapid-key');
    expect(env.appVersion).toBe('1.0.0');
    expect(typeof env.isDev).toBe('boolean');
    expect(typeof env.isProd).toBe('boolean');
  });

  it('throws when required Supabase vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined);

    await expect(import('@/config/env')).rejects.toThrow('Missing environment variable');
  });
});
