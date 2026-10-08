#!/usr/bin/env node
/**
 * Test Open Graph and Twitter Card metadata for Welcome Hub URLs.
 *
 * Usage:
 *   npm run test:og -- <url-or-path> [crawler-name]
 *
 * Examples:
 *   npm run test:og -- https://www.welcomehub.app/events/tech-summit-2026/register
 *   npm run test:og -- http://localhost:3000/events/tech-summit-2026/register facebook
 *   npm run test:og -- /events/youth-camp/countdown twitter
 */

const DEFAULT_BASE_URL = process.env.BASE_URL || 'https://www.welcomehub.app';

const CRAWLER_USER_AGENTS = {
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  viber: 'Viber/6.5.5.1372',
  whatsapp: 'WhatsApp/2.21.12.21 A',
  twitter: 'Twitterbot/1.0',
  x: 'Twitterbot/1.0',
  telegram: 'TelegramBot (like TwitterBot)',
  discord: 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
  linkedin: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
  slack: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  apple:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Applebot/0.1',
  google: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
  bing: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
  browser:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

function printHelp() {
  console.log(`
\x1b[1m\x1b[36mWelcome Hub Open Graph Tester\x1b[0m

\x1b[33mUsage:\x1b[0m
  npm run test:og -- <url-or-path> [crawler]

\x1b[33mAvailable Crawlers:\x1b[0m
  ${Object.keys(CRAWLER_USER_AGENTS).join(', ')} (default: facebook)

\x1b[33mExamples:\x1b[0m
  npm run test:og -- https://www.welcomehub.app/events/tech-summit/register
  npm run test:og -- http://localhost:3000/events/tech-summit/register facebook
  npm run test:og -- /events/youth-camp/countdown twitter
  npm run test:og -- /forms/sample-form/submit whatsapp
`);
}

async function testOpenGraph() {
  const rawArgs = process.argv.slice(2).filter((arg) => arg !== '--');

  if (rawArgs.length === 0 || rawArgs.includes('-h') || rawArgs.includes('--help')) {
    printHelp();
    process.exit(rawArgs.length === 0 ? 1 : 0);
  }

  const targetArg = rawArgs[0];
  const crawlerArg = (rawArgs[1] || 'facebook').toLowerCase();

  const targetUrl =
    targetArg.startsWith('http://') || targetArg.startsWith('https://')
      ? targetArg
      : `${DEFAULT_BASE_URL.replace(/\/+$/, '')}/${targetArg.replace(/^\/+/, '')}`;

  const userAgent = CRAWLER_USER_AGENTS[crawlerArg] || CRAWLER_USER_AGENTS.facebook;

  console.log(`\n\x1b[1m🔍 Requesting URL:\x1b[0m ${targetUrl}`);
  console.log(`\x1b[1m🤖 User-Agent:\x1b[0m ${crawlerArg} (${userAgent})\n`);

  try {
    const startTime = Date.now();
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml',
      },
    });
    const duration = Date.now() - startTime;

    console.log(
      `\x1b[1m📡 Status:\x1b[0m ${response.status} ${response.statusText} (${duration}ms)`,
    );
    console.log(`\x1b[1m📄 Content-Type:\x1b[0m ${response.headers.get('content-type') || 'N/A'}`);
    console.log(
      `\x1b[1m⚡ Cache-Control:\x1b[0m ${response.headers.get('cache-control') || 'N/A'}\n`,
    );

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '(none)';

    // Extract meta tags
    const metaTags = {};
    const metaRegex =
      /<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']*)["']|<meta\s+content=["']([^"']*)["']\s+(?:name|property)=["']([^"']+)["']/gi;
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      const key = match[1] || match[4];
      const val = match[2] || match[3];
      metaTags[key.toLowerCase()] = val;
    }

    console.log('\x1b[1m\x1b[32m--- Extracted Open Graph Metadata ---\x1b[0m');
    console.log(`  \x1b[36mHTML Title:\x1b[0m        ${pageTitle}`);
    console.log(
      `  \x1b[36mog:title:\x1b[0m          ${metaTags['og:title'] || '\x1b[31m(missing)\x1b[0m'}`,
    );
    console.log(
      `  \x1b[36mog:description:\x1b[0m    ${metaTags['og:description'] || '\x1b[31m(missing)\x1b[0m'}`,
    );
    console.log(
      `  \x1b[36mog:image:\x1b[0m          ${metaTags['og:image'] || '\x1b[31m(missing)\x1b[0m'}`,
    );
    console.log(
      `  \x1b[36mog:url:\x1b[0m            ${metaTags['og:url'] || '\x1b[31m(missing)\x1b[0m'}`,
    );
    console.log(
      `  \x1b[36mog:type:\x1b[0m           ${metaTags['og:type'] || '\x1b[33m(website)\x1b[0m'}`,
    );
    console.log(`  \x1b[36mog:site_name:\x1b[0m      ${metaTags['og:site_name'] || 'N/A'}`);

    console.log('\n\x1b[1m\x1b[34m--- Twitter Card Metadata ---\x1b[0m');
    console.log(
      `  \x1b[36mtwitter:card:\x1b[0m      ${metaTags['twitter:card'] || '\x1b[33m(none)\x1b[0m'}`,
    );
    console.log(`  \x1b[36mtwitter:title:\x1b[0m     ${metaTags['twitter:title'] || 'N/A'}`);
    console.log(
      `  \x1b[36mtwitter:description:\x1b[0m ${metaTags['twitter:description'] || 'N/A'}`,
    );
    console.log(`  \x1b[36mtwitter:image:\x1b[0m     ${metaTags['twitter:image'] || 'N/A'}`);

    // Verify image accessibility
    const imageUrl = metaTags['og:image'] || metaTags['twitter:image'];
    if (imageUrl) {
      console.log('\n\x1b[1m🖼️  Validating Image URL...\x1b[0m');
      try {
        const imgRes = await fetch(imageUrl, { method: 'HEAD' });
        if (imgRes.ok) {
          console.log(`  \x1b[32m✔ Image reachable (${imgRes.status} OK)\x1b[0m: ${imageUrl}`);
        } else {
          console.log(`  \x1b[31m✖ Image unreachable (HTTP ${imgRes.status})\x1b[0m: ${imageUrl}`);
        }
      } catch (err) {
        console.log(`  \x1b[31m✖ Image check failed:\x1b[0m ${err.message}`);
      }
    }

    console.log('\n\x1b[1m\x1b[32m--- Verification Summary ---\x1b[0m');
    const isSuccess = metaTags['og:title'] && metaTags['og:image'];
    if (isSuccess) {
      console.log('  \x1b[32m✔ Open Graph tags are properly generated and populated!\x1b[0m\n');
    } else {
      console.log('  \x1b[33m⚠ Warning: Missing standard Open Graph tags.\x1b[0m\n');
    }
  } catch (err) {
    console.error(`\x1b[31mError fetching URL:\x1b[0m`, err);
    process.exit(1);
  }
}

testOpenGraph();
