function requiredAny(names: string[]): string {
  for (const name of names) {
    const value = import.meta.env[name]
    if (value) {
      return value
    }
  }

  throw new Error(`Missing environment variable: one of ${names.join(', ')}`)
}

function optionalAny(names: string[]): string | undefined {
  for (const name of names) {
    const value = import.meta.env[name]
    if (value !== undefined) {
      return value
    }
  }

  return undefined
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue
  }

  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

export const env = {
  supabaseUrl: requiredAny(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']),
  supabaseAnonKey: requiredAny(['VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY']),
  registrationWizardEnabled: parseBoolean(
    optionalAny(['VITE_EVENT_REGISTRATION_WIZARD_ENABLED']),
    true,
  ),
}
