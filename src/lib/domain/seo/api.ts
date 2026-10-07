import type { EventOgRecord, FormOgRecord } from './types';

export interface FetchEventMetadataOptions {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  timeoutMs?: number;
}

/**
 * Fetches published event record for Open Graph metadata.
 * Communicates with the public get-public-event Edge Function with strict timeout and error boundaries.
 */
export async function fetchEventMetadataForOg(
  slug: string,
  options: FetchEventMetadataOptions = {},
): Promise<EventOgRecord | null> {
  const supabaseUrl =
    options.supabaseUrl ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    options.supabaseAnonKey ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!supabaseUrl || !slug) {
    return null;
  }

  const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/get-public-event`;
  const timeoutMs = options.timeoutMs ?? 2500;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(supabaseAnonKey
          ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
          : {}),
      },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      event?: EventOgRecord | null;
    };

    if (payload?.success && payload.event) {
      return {
        title: payload.event.title,
        description: payload.event.description ?? null,
        cover_image_key: payload.event.cover_image_key ?? null,
      };
    }

    return null;
  } catch {
    // Graceful fallback on network error, DNS failure, or timeout
    return null;
  }
}

/**
 * Fetches published form record for Open Graph metadata.
 * Communicates with the public get-public-form Edge Function with strict timeout and error boundaries.
 */
export async function fetchFormMetadataForOg(
  slug: string,
  options: FetchEventMetadataOptions = {},
): Promise<FormOgRecord | null> {
  const supabaseUrl =
    options.supabaseUrl ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';

  const supabaseAnonKey =
    options.supabaseAnonKey ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!supabaseUrl || !slug) {
    return null;
  }

  const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/get-public-form`;
  const timeoutMs = options.timeoutMs ?? 2500;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(supabaseAnonKey
          ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
          : {}),
      },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      form?: FormOgRecord | null;
    };

    if (payload?.success && payload.form) {
      return {
        title: payload.form.title,
        description: payload.form.description ?? null,
      };
    }

    return null;
  } catch {
    // Graceful fallback on network error, DNS failure, or timeout
    return null;
  }
}
