function requiredAny(names: string[]): string {
  for (const name of names) {
    const value = import.meta.env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing environment variable: one of ${names.join(', ')}`);
}

export const env = {
  supabaseUrl: requiredAny(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']),
  supabasePublishableKey: requiredAny([
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]),
  appVersion: import.meta.env.VITE_APP_VERSION as string | undefined,
  appCommitHash: import.meta.env.VITE_APP_COMMIT_HASH as string | undefined,
  excuseEventId: (import.meta.env.VITE_EXCUSE_REQUEST_EVENT_ID ||
    import.meta.env.NEXT_EXCUSE_REQUEST_EVENT_ID) as string | undefined,
};
