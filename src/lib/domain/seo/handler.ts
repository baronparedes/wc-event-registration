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
} from './index';

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
    const event = await fetchEventMetadataForOg(eventSlug);
    ogMetadata = buildEventOgMetadata(event, ogMetadata.url);
  } else if (formSlug) {
    const form = await fetchFormMetadataForOg(formSlug);
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
