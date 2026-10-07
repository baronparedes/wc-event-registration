import {
  CRAWLER_USER_AGENTS_REGEX,
  DEFAULT_OG_METADATA,
  EVENT_DYNAMIC_ROUTE_REGEX,
  FORM_DYNAMIC_ROUTE_REGEX,
} from './constants';
import type { EventOgRecord, FormOgRecord, OgMetadata } from './types';

/**
 * Checks whether the incoming User-Agent belongs to a social media / messaging crawler.
 */
export function isCrawlerUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return CRAWLER_USER_AGENTS_REGEX.test(userAgent);
}

/**
 * Extracts event slug from supported registration/countdown routes.
 */
export function extractEventSlug(pathname: string): string | null {
  const match = pathname.match(EVENT_DYNAMIC_ROUTE_REGEX);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Extracts form slug from supported form submission routes (/forms/:slug/submit).
 */
export function extractFormSlug(pathname: string): string | null {
  const match = pathname.match(FORM_DYNAMIC_ROUTE_REGEX);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Strips HTML tags and markdown formatting and truncates text cleanly.
 */
export function stripHtmlAndTruncate(text: string | null | undefined, maxLength = 200): string {
  if (!text) return '';

  const clean = text
    // Replace markdown links [text](url) with just text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove HTML tags by replacing them with space
    .replace(/<[^>]*>/g, ' ')
    // Remove markdown headers, bold, italics, code blocks
    .replace(/[#*_`~]/g, '')
    // Normalize whitespace & newlines
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

/**
 * Escapes characters for safe inclusion inside HTML attributes.
 */
export function escapeHtmlAttribute(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Resolves fully qualified absolute image URL.
 */
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

/**
 * Builds standard OgMetadata from an event record and canonical URL.
 */
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

/**
 * Builds standard OgMetadata from a form record and canonical URL.
 */
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

/**
 * Generates formatted Open Graph and Twitter HTML meta tags.
 */
export function generateOgMetaTagString(meta: OgMetadata): string {
  const title = escapeHtmlAttribute(meta.title);
  const description = escapeHtmlAttribute(meta.description);
  const url = escapeHtmlAttribute(meta.url);
  const type = escapeHtmlAttribute(meta.type ?? 'website');
  const siteName = escapeHtmlAttribute(meta.siteName ?? DEFAULT_OG_METADATA.siteName);
  const twitterCard = escapeHtmlAttribute(meta.twitterCard ?? 'summary_large_image');
  const image = meta.imageUrl ? escapeHtmlAttribute(meta.imageUrl) : '';

  const tags = [
    `    <!-- Open Graph / Social Meta Tags -->`,
    `    <meta name="description" content="${description}" />`,
    `    <meta property="og:type" content="${type}" />`,
    `    <meta property="og:site_name" content="${siteName}" />`,
    `    <meta property="og:title" content="${title}" />`,
    `    <meta property="og:description" content="${description}" />`,
    `    <meta property="og:url" content="${url}" />`,
  ];

  if (image) {
    tags.push(`    <meta property="og:image" content="${image}" />`);
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

/**
 * Injects Open Graph meta tags and title into raw HTML template.
 */
export function injectMetaTags(html: string, meta: OgMetadata): string {
  let modifiedHtml = html;

  // Replace or inject <title>
  const escapedTitle = escapeHtmlAttribute(meta.title);
  if (/<title>.*?<\/title>/i.test(modifiedHtml)) {
    modifiedHtml = modifiedHtml.replace(/<title>.*?<\/title>/i, `<title>${escapedTitle}</title>`);
  }

  // Remove existing dynamic tags if present
  modifiedHtml = modifiedHtml
    .replace(/\s*<meta\s+name=["']description["'][^>]*>/gi, '')
    .replace(/\s*<meta\s+property=["']og:[^"']+["'][^>]*>/gi, '')
    .replace(/\s*<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, '');

  const generatedTags = generateOgMetaTagString(meta);

  // Inject before </head>
  if (/<\/head>/i.test(modifiedHtml)) {
    return modifiedHtml.replace(/<\/head>/i, `${generatedTags}\n  </head>`);
  }

  return `${modifiedHtml}\n${generatedTags}`;
}
