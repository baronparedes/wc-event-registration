function requiredAny(names: string[]): string {
  for (const name of names) {
    const value = import.meta.env[name];
    if (value) {
      return value;
    }
  }

  throw new Error(`Missing environment variable: one of ${names.join(', ')}`);
}

function optionalAny(names: string[]): string | undefined {
  for (const name of names) {
    const value = import.meta.env[name];
    if (value) {
      return value;
    }
  }
  return undefined;
}

export const env = {
  isDev: Boolean(import.meta.env.DEV),
  isProd: Boolean(import.meta.env.PROD),
  mode: import.meta.env.MODE as string,
  supabaseUrl: requiredAny(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']),
  supabasePublishableKey: requiredAny([
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ]),
  vapidPublicKey: optionalAny(['VITE_VAPID_PUBLIC_KEY', 'NEXT_PUBLIC_VAPID_PUBLIC_KEY']),
  appVersion: import.meta.env.VITE_APP_VERSION as string | undefined,
  appCommitHash: import.meta.env.VITE_APP_COMMIT_HASH as string | undefined,
  excuseEventId: optionalAny(['VITE_EXCUSE_REQUEST_EVENT_ID', 'NEXT_EXCUSE_REQUEST_EVENT_ID']),
};
