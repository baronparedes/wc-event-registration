import {
  DEFAULT_OG_METADATA,
  type OgMetadata,
  buildEventOgMetadata,
  buildFormOgMetadata,
  extractEventSlug,
  extractFormSlug,
  fetchEventMetadataForOg,
  fetchFormMetadataForOg,
  injectMetaTags,
} from '../src/lib/domain/seo';

export const config = {
  runtime: 'nodejs',
};

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

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  // When rewritten by Vercel, x-forwarded-uri, x-matched-path, or x-vercel-original-path holds the original path
  const originalPath =
    request.headers.get('x-forwarded-uri') ||
    request.headers.get('x-matched-path') ||
    request.headers.get('x-vercel-original-path') ||
    url.searchParams.get('path') ||
    url.pathname;

  const eventSlug = extractEventSlug(originalPath);
  const formSlug = extractFormSlug(originalPath);

  // Fetch the base HTML template from the origin
  let baseHtml = FALLBACK_HTML_TEMPLATE;
  try {
    const originIndexUrl = new URL('/index.html', url.origin);
    const htmlResponse = await fetch(originIndexUrl.toString());
    if (htmlResponse.ok) {
      baseHtml = await htmlResponse.text();
    }
  } catch {
    // Fall back to inline template
  }

  const canonicalUrl = `${url.origin}${originalPath}`;

  let ogMetadata: OgMetadata = {
    title: DEFAULT_OG_METADATA.title,
    description: DEFAULT_OG_METADATA.description,
    imageUrl: `${url.origin}${DEFAULT_OG_METADATA.fallbackImageRelativePath}`,
    url: canonicalUrl,
    type: DEFAULT_OG_METADATA.type,
    siteName: DEFAULT_OG_METADATA.siteName,
    twitterCard: DEFAULT_OG_METADATA.twitterCard,
  };

  if (eventSlug) {
    const event = await fetchEventMetadataForOg(eventSlug);
    ogMetadata = buildEventOgMetadata(event, canonicalUrl);
  } else if (formSlug) {
    const form = await fetchFormMetadataForOg(formSlug);
    ogMetadata = buildFormOgMetadata(form, canonicalUrl);
  }

  const modifiedHtml = injectMetaTags(baseHtml, ogMetadata);

  return new Response(modifiedHtml, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
    },
  });
}
