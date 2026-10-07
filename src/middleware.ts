import {
  DEFAULT_OG_METADATA,
  type OgMetadata,
  buildEventOgMetadata,
  extractEventSlug,
  fetchEventMetadataForOg,
  injectMetaTags,
  isCrawlerUserAgent,
} from './lib/domain/seo';

export const config = {
  runtime: 'nodejs',
  matcher: [
    /*
     * Match all paths except static files, assets, and service workers
     */
    '/((?!api|assets|favicon\\.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|webmanifest|json|txt)$).*)',
  ],
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

export default async function middleware(request: Request): Promise<Response | undefined> {
  const userAgent = request.headers.get('user-agent');

  // Let regular end-user traffic pass directly to the client-side SPA
  if (!isCrawlerUserAgent(userAgent)) {
    return undefined;
  }

  const url = new URL(request.url);
  const slug = extractEventSlug(url.pathname);

  // Fetch the base HTML template from the origin
  let baseHtml = FALLBACK_HTML_TEMPLATE;
  try {
    const originIndexUrl = new URL('/index.html', url.origin);
    const htmlResponse = await fetch(originIndexUrl.toString());
    if (htmlResponse.ok) {
      baseHtml = await htmlResponse.text();
    }
  } catch {
    // Fall back to inline minimal template
  }

  let ogMetadata: OgMetadata = {
    title: DEFAULT_OG_METADATA.title,
    description: DEFAULT_OG_METADATA.description,
    imageUrl: `${url.origin}${DEFAULT_OG_METADATA.fallbackImageRelativePath}`,
    url: url.toString(),
    type: DEFAULT_OG_METADATA.type,
    siteName: DEFAULT_OG_METADATA.siteName,
    twitterCard: DEFAULT_OG_METADATA.twitterCard,
  };

  if (slug) {
    const event = await fetchEventMetadataForOg(slug);
    ogMetadata = buildEventOgMetadata(event, url.toString());
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
