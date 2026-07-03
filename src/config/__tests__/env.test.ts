import { afterEach, describe, expect, it, vi } from 'vitest';

describe('config env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses VITE Supabase vars and defaults wizard flag to true', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://vite.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'vite-anon');
    vi.stubEnv('VITE_EVENT_REGISTRATION_WIZARD_ENABLED', undefined);

    const { env } = await import('@/config/env');

    expect(env.supabaseUrl).toBe('https://vite.supabase.co');
    expect(env.supabaseAnonKey).toBe('vite-anon');
    expect(env.registrationWizardEnabled).toBe(true);
  });

  it('falls back to NEXT_PUBLIC vars and parses false-like wizard values', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://next.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'next-anon');
    vi.stubEnv('VITE_EVENT_REGISTRATION_WIZARD_ENABLED', 'no');

    const { env } = await import('@/config/env');

    expect(env.supabaseUrl).toBe('https://next.supabase.co');
    expect(env.supabaseAnonKey).toBe('next-anon');
    expect(env.registrationWizardEnabled).toBe(false);
  });

  it('throws when required Supabase vars are missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', undefined);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', undefined);

    await expect(import('@/config/env')).rejects.toThrow('Missing environment variable');
  });
});
