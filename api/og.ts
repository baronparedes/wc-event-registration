export interface OgMetadata {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  type?: string;
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image';
}

export interface EventOgRecord {
  title: string;
  description: string | null;
  cover_image_key: string | null;
}

export interface FormOgRecord {
  title: string;
  description: string | null;
}

export const DEFAULT_OG_METADATA = {
  title: 'Welcome Hub',
  description: 'Community Event Registration & Attendance Management',
  siteName: 'Welcome Hub',
  type: 'website' as const,
  twitterCard: 'summary_large_image' as const,
  fallbackImageRelativePath: '/android-chrome-512x512.png',
};

export const CRAWLER_USER_AGENTS_REGEX =
  /facebookexternalhit|facebot|twitterbot|viber|whatsapp|telegrambot|discordbot|linkedinbot|slackbot|applebot|pinterestbot|googlebot|bingbot|duckduckbot|yandexbot|baiduspider|skypeuripreview|quora|redditbot/i;

export const EVENT_DYNAMIC_ROUTE_REGEX =
  /^\/events\/([^/]+)\/(?:register|register-public|countdown)\/?$/;

export const FORM_DYNAMIC_ROUTE_REGEX = /^\/forms\/([^/]+)\/submit\/?$/;

export function isCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_USER_AGENTS_REGEX.test(userAgent);
}

export function extractEventSlug(pathname: string): string | null {
  const match = pathname.match(EVENT_DYNAMIC_ROUTE_REGEX);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function extractFormSlug(pathname: string): string | null {
  const match = pathname.match(FORM_DYNAMIC_ROUTE_REGEX);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function stripHtmlAndTruncate(text: string | null | undefined, maxLength = 200): string {
  if (!text) return '';

  const clean = text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length <= maxLength) return clean;

  const truncated = clean.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return `${truncated.slice(0, lastSpace)}...`;
  }
  return `${truncated}...`;
}

export function escapeHtmlAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildAbsoluteImageUrl(
  imageKeyOrUrl: string | null | undefined,
  origin: string,
  supabaseUrl?: string,
): string {
  if (!imageKeyOrUrl) {
    return `${origin}${DEFAULT_OG_METADATA.fallbackImageRelativePath}`;
  }

  if (imageKeyOrUrl.startsWith('http://') || imageKeyOrUrl.startsWith('https://')) {
    return imageKeyOrUrl;
  }

  if (imageKeyOrUrl.startsWith('/')) {
    return `${origin}${imageKeyOrUrl}`;
  }

  const resolvedSupabaseUrl =
    supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';

  if (resolvedSupabaseUrl) {
    const cleanSupabaseUrl = resolvedSupabaseUrl.replace(/\/+$/, '');
    const cleanKey = imageKeyOrUrl.replace(/^\/+/, '');
    return `${cleanSupabaseUrl}/storage/v1/object/public/event_covers/${cleanKey}`;
  }

  return `${origin}/${imageKeyOrUrl}`;
}

export function buildEventOgMetadata(
  event: EventOgRecord | null | undefined,
  canonicalUrl: string,
  options?: {
    supabaseUrl?: string;
    appName?: string;
  },
): OgMetadata {
  const urlObj = new URL(canonicalUrl);
  const origin = urlObj.origin;
  const appName = options?.appName ?? DEFAULT_OG_METADATA.siteName;

  if (!event) {
    return {
      title: DEFAULT_OG_METADATA.title,
      description: DEFAULT_OG_METADATA.description,
      imageUrl: buildAbsoluteImageUrl(null, origin, options?.supabaseUrl),
      url: canonicalUrl,
      type: DEFAULT_OG_METADATA.type,
      siteName: appName,
      twitterCard: DEFAULT_OG_METADATA.twitterCard,
    };
  }

  const rawDescription = event.description || DEFAULT_OG_METADATA.description;
  const cleanDescription = stripHtmlAndTruncate(rawDescription, 200);
  const imageUrl = buildAbsoluteImageUrl(event.cover_image_key, origin, options?.supabaseUrl);

  return {
    title: `${event.title} | ${appName}`,
    description: cleanDescription,
    imageUrl,
    url: canonicalUrl,
    type: 'article',
    siteName: appName,
    twitterCard: 'summary_large_image',
  };
}

export function buildFormOgMetadata(
  form: FormOgRecord | null | undefined,
  canonicalUrl: string,
  options?: {
    supabaseUrl?: string;
    appName?: string;
  },
): OgMetadata {
  const urlObj = new URL(canonicalUrl);
  const origin = urlObj.origin;
  const appName = options?.appName ?? DEFAULT_OG_METADATA.siteName;

  if (!form) {
    return {
      title: DEFAULT_OG_METADATA.title,
      description: DEFAULT_OG_METADATA.description,
      imageUrl: buildAbsoluteImageUrl(null, origin, options?.supabaseUrl),
      url: canonicalUrl,
      type: DEFAULT_OG_METADATA.type,
      siteName: appName,
      twitterCard: DEFAULT_OG_METADATA.twitterCard,
    };
  }

  const rawDescription = form.description || DEFAULT_OG_METADATA.description;
  const cleanDescription = stripHtmlAndTruncate(rawDescription, 200);
  const imageUrl = buildAbsoluteImageUrl(null, origin, options?.supabaseUrl);

  return {
    title: `${form.title} | ${appName}`,
    description: cleanDescription,
    imageUrl,
    url: canonicalUrl,
    type: 'website',
    siteName: appName,
    twitterCard: 'summary_large_image',
  };
}

export function generateOgMetaTagString(meta: OgMetadata): string {
  const title = escapeHtmlAttribute(meta.title);
  const description = escapeHtmlAttribute(meta.description);
  const url = escapeHtmlAttribute(meta.url);
  const type = escapeHtmlAttribute(meta.type ?? 'website');
  const siteName = escapeHtmlAttribute(meta.siteName ?? DEFAULT_OG_METADATA.siteName);
  const twitterCard = escapeHtmlAttribute(meta.twitterCard ?? 'summary_large_image');
  const image = meta.imageUrl ? escapeHtmlAttribute(meta.imageUrl) : '';

  const tags = [
    `    <!-- Open Graph / Facebook / WhatsApp / Viber -->`,
    `    <meta name="description" content="${description}" />`,
    `    <meta property="og:type" content="${type}" />`,
    `    <meta property="og:site_name" content="${siteName}" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    `    <meta property="og:url" content="${url}" />`,
  ];

  if (image) {
    tags.push(`    <meta property="og:image" content="${image}" />`);
    if (image.startsWith('https://')) {
      tags.push(`    <meta property="og:image:secure_url" content="${image}" />`);
    }
    const imageType = image.endsWith('.png') ? 'image/png' : 'image/jpeg';
    tags.push(`    <meta property="og:image:type" content="${imageType}" />`);
    tags.push(`    <meta property="og:image:width" content="1200" />`);
    tags.push(`    <meta property="og:image:height" content="630" />`);
    tags.push(`    <meta property="og:image:alt" content="${title}" />`);
  }

  tags.push(`    <!-- Twitter -->`);
  tags.push(`    <meta name="twitter:card" content="${twitterCard}" />`);
  tags.push(`    <meta name="twitter:title" content="${title}" />`);
  tags.push(`    <meta name="twitter:description" content="${description}" />`);

  if (image) {
    tags.push(`    <meta name="twitter:image" content="${image}" />`);
  }

  return tags.join('\n');
}

export function injectMetaTags(html: string, meta: OgMetadata): string {
  let modifiedHtml = html;

  const escapedTitle = escapeHtmlAttribute(meta.title);
  modifiedHtml = modifiedHtml
    .replace(/\s*<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/\s*<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');

  const generatedTags = generateOgMetaTagString(meta);

  if (/<title>.*?<\/title>/i.test(modifiedHtml)) {
    return modifiedHtml.replace(
      /<title>.*?<\/title>/i,
      `<title>${escapedTitle}</title>\n${generatedTags}`,
    );
  }

  if (/<head>/i.test(modifiedHtml)) {
    return modifiedHtml.replace(
      /<head>/i,
      `<head>\n    <title>${escapedTitle}</title>\n${generatedTags}`,
    );
  }

  return `${modifiedHtml}\n${generatedTags}`;
}

export async function fetchEventMetadataForOg(
  slug: string,
  options?: { origin?: string },
): Promise<EventOgRecord | null> {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!supabaseUrl || !slug) return null;

  const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/get-public-event`;
  const requestOrigin =
    options?.origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://www.welcomehub.app');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: requestOrigin,
        ...(supabaseAnonKey
          ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
          : {}),
      },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

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
    return null;
  }
}

export async function fetchFormMetadataForOg(
  slug: string,
  options?: { origin?: string },
): Promise<FormOgRecord | null> {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    '';

  if (!supabaseUrl || !slug) return null;

  const endpoint = `${supabaseUrl.replace(/\/+$/, '')}/functions/v1/get-public-form`;
  const requestOrigin =
    options?.origin ||
    (typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://www.welcomehub.app');

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: requestOrigin,
        ...(supabaseAnonKey
          ? { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` }
          : {}),
      },
      body: JSON.stringify({ slug }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

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
    return null;
  }
}

const FALLBACK_HTML_TEMPLATE = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>Welcome Hub</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Arimo:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&amp;family=JetBrains+Mono:wght@500;600&amp;display=swap"
    />
    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="/favicon.ico" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="WC Events" />
    <meta name="theme-color" content="#0b5fff" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;

export interface NodeLikeRequest {
  query?: Record<string, string | string[] | undefined>;
  url?: string;
  headers?: Record<string, string | string[] | undefined>;
}

export interface NodeLikeResponse {
  status: (code: number) => NodeLikeResponse;
  setHeader: (key: string, value: string) => NodeLikeResponse;
  send: (body: string) => void;
}

export async function handleOgRequest(
  targetUrlString: string,
  targetRoutePath?: string,
): Promise<string> {
  const url = new URL(targetUrlString);
  const routePath = targetRoutePath || url.searchParams.get('route') || url.pathname;

  const eventSlug = extractEventSlug(routePath);
  const formSlug = extractFormSlug(routePath);

  let baseHtml = FALLBACK_HTML_TEMPLATE;
  try {
    const originIndexUrl = new URL('/index.html', url.origin);
    const htmlResponse = await fetch(originIndexUrl.toString());
    if (htmlResponse.ok) {
      baseHtml = await htmlResponse.text();
    }
  } catch {
    // Fall back to inline fallback HTML
  }

  let ogMetadata: OgMetadata = {
    title: DEFAULT_OG_METADATA.title,
    description: DEFAULT_OG_METADATA.description,
    imageUrl: `${url.origin}${DEFAULT_OG_METADATA.fallbackImageRelativePath}`,
    url: new URL(routePath, url.origin).toString(),
    type: DEFAULT_OG_METADATA.type,
    siteName: DEFAULT_OG_METADATA.siteName,
    twitterCard: DEFAULT_OG_METADATA.twitterCard,
  };

  if (eventSlug) {
    const event = await fetchEventMetadataForOg(eventSlug, { origin: url.origin });
    ogMetadata = buildEventOgMetadata(event, ogMetadata.url);
  } else if (formSlug) {
    const form = await fetchFormMetadataForOg(formSlug, { origin: url.origin });
    ogMetadata = buildFormOgMetadata(form, ogMetadata.url);
  }

  return injectMetaTags(baseHtml, ogMetadata);
}

function isStandardRequest(req: Request | NodeLikeRequest): req is Request {
  return typeof Request !== 'undefined' && req instanceof Request;
}

export default async function handler(
  requestOrReq: Request | NodeLikeRequest,
  optionalRes?: NodeLikeResponse,
): Promise<Response | void> {
  let targetUrlString = 'https://www.welcomehub.app/';
  let routePath: string | undefined;

  if (isStandardRequest(requestOrReq)) {
    targetUrlString = requestOrReq.url;
    const parsedUrl = new URL(requestOrReq.url);
    routePath = parsedUrl.searchParams.get('route') || undefined;
  } else if (typeof requestOrReq === 'object' && requestOrReq !== null) {
    const nodeReq = requestOrReq;
    const rawRoute = nodeReq.query?.route;
    if (typeof rawRoute === 'string') {
      routePath = rawRoute;
    } else if (Array.isArray(rawRoute) && rawRoute[0]) {
      routePath = rawRoute[0];
    }
    const hostHeader = nodeReq.headers?.['x-forwarded-host'] || nodeReq.headers?.host;
    const host =
      typeof hostHeader === 'string'
        ? hostHeader
        : Array.isArray(hostHeader) && hostHeader[0]
          ? hostHeader[0]
          : 'www.welcomehub.app';

    const protoHeader = nodeReq.headers?.['x-forwarded-proto'];
    const proto =
      typeof protoHeader === 'string'
        ? protoHeader
        : Array.isArray(protoHeader) && protoHeader[0]
          ? protoHeader[0]
          : 'https';

    targetUrlString = `${proto}://${host}${nodeReq.url || '/'}`;
  }

  try {
    const html = await handleOgRequest(targetUrlString, routePath);

    if (optionalRes && typeof optionalRes.status === 'function') {
      optionalRes.setHeader('Content-Type', 'text/html; charset=utf-8');
      optionalRes.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      optionalRes.status(200).send(html);
      return;
    }

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300',
      },
    });
  } catch {
    if (optionalRes && typeof optionalRes.status === 'function') {
      optionalRes.setHeader('Content-Type', 'text/html; charset=utf-8');
      optionalRes.status(200).send(FALLBACK_HTML_TEMPLATE);
      return;
    }

    return new Response(FALLBACK_HTML_TEMPLATE, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }
}
