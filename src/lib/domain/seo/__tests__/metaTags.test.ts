import { describe, expect, it } from 'vitest';

import {
  DEFAULT_OG_METADATA,
  buildAbsoluteImageUrl,
  buildEventOgMetadata,
  buildFormOgMetadata,
  escapeHtmlAttribute,
  extractEventSlug,
  extractFormSlug,
  generateOgMetaTagString,
  injectMetaTags,
  isCrawlerUserAgent,
  stripHtmlAndTruncate,
} from '../index';

describe('SEO & Open Graph Helpers', () => {
  describe('isCrawlerUserAgent', () => {
    it('detects popular social and messaging crawlers', () => {
      expect(
        isCrawlerUserAgent(
          'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        ),
      ).toBe(true);
      expect(isCrawlerUserAgent('Facebot')).toBe(true);
      expect(isCrawlerUserAgent('Twitterbot/1.0')).toBe(true);
      expect(isCrawlerUserAgent('Viber/6.5.5.1372')).toBe(true);
      expect(isCrawlerUserAgent('WhatsApp/2.21.12.21 A')).toBe(true);
      expect(isCrawlerUserAgent('TelegramBot (like TwitterBot)')).toBe(true);
      expect(
        isCrawlerUserAgent('Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)'),
      ).toBe(true);
      expect(
        isCrawlerUserAgent(
          'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
        ),
      ).toBe(true);
      expect(isCrawlerUserAgent('Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)')).toBe(
        true,
      );
    });

    it('returns false for standard browser user agents', () => {
      expect(
        isCrawlerUserAgent(
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ),
      ).toBe(false);
      expect(
        isCrawlerUserAgent(
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        ),
      ).toBe(false);
      expect(isCrawlerUserAgent(null)).toBe(false);
      expect(isCrawlerUserAgent(undefined)).toBe(false);
      expect(isCrawlerUserAgent('')).toBe(false);
    });
  });

  describe('extractEventSlug', () => {
    it('extracts slugs from registration, public registration, and countdown routes', () => {
      expect(extractEventSlug('/events/tech-summit-2026/register')).toBe('tech-summit-2026');
      expect(extractEventSlug('/events/tech-summit-2026/register/')).toBe('tech-summit-2026');
      expect(extractEventSlug('/events/youth-camp/register-public')).toBe('youth-camp');
      expect(extractEventSlug('/events/sunday-service/countdown')).toBe('sunday-service');
      expect(extractEventSlug('/events/special%20event/register')).toBe('special event');
    });

    it('returns null for non-matching or admin routes', () => {
      expect(extractEventSlug('/')).toBeNull();
      expect(extractEventSlug('/admin/events/123')).toBeNull();
      expect(extractEventSlug('/events')).toBeNull();
      expect(extractEventSlug('/forms/sample/submit')).toBeNull();
    });
  });

  describe('extractFormSlug', () => {
    it('extracts slugs from form submission routes', () => {
      expect(extractFormSlug('/forms/volunteer-registration/submit')).toBe(
        'volunteer-registration',
      );
      expect(extractFormSlug('/forms/volunteer-registration/submit/')).toBe(
        'volunteer-registration',
      );
      expect(extractFormSlug('/forms/retreat%20form/submit')).toBe('retreat form');
    });

    it('returns null for non-matching routes', () => {
      expect(extractFormSlug('/')).toBeNull();
      expect(extractFormSlug('/events/tech-summit/register')).toBeNull();
      expect(extractFormSlug('/admin/forms/123')).toBeNull();
      expect(extractFormSlug('/forms')).toBeNull();
    });
  });

  describe('stripHtmlAndTruncate', () => {
    it('removes HTML tags and markdown formatting', () => {
      const raw =
        '<h1>Annual <strong>Summit</strong></h1><p>Join us for <em>great</em> things at [Our Site](https://example.com)!</p>';
      expect(stripHtmlAndTruncate(raw)).toBe('Annual Summit Join us for great things at Our Site!');
    });

    it('truncates cleanly on word boundaries', () => {
      const text =
        'This is a very long description that exceeds the normal snippet limit and needs to be truncated cleanly on word boundary.';
      const truncated = stripHtmlAndTruncate(text, 40);
      expect(truncated.length).toBeLessThanOrEqual(43);
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('handles empty or null values', () => {
      expect(stripHtmlAndTruncate('')).toBe('');
      expect(stripHtmlAndTruncate(null)).toBe('');
      expect(stripHtmlAndTruncate(undefined)).toBe('');
    });
  });

  describe('escapeHtmlAttribute', () => {
    it('escapes dangerous HTML characters', () => {
      expect(escapeHtmlAttribute('<script>alert("xss & \'fun\'")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss &amp; &#39;fun&#39;&quot;)&lt;/script&gt;',
      );
    });
  });

  describe('buildAbsoluteImageUrl', () => {
    it('preserves absolute URLs', () => {
      expect(
        buildAbsoluteImageUrl('https://cdn.example.com/photo.jpg', 'https://welcomehub.com'),
      ).toBe('https://cdn.example.com/photo.jpg');
    });

    it('builds absolute URL for relative paths', () => {
      expect(buildAbsoluteImageUrl('/custom.png', 'https://welcomehub.com')).toBe(
        'https://welcomehub.com/custom.png',
      );
    });

    it('builds Supabase storage public URL for cover image keys', () => {
      expect(
        buildAbsoluteImageUrl(
          'covers/pic.jpg',
          'https://welcomehub.com',
          'https://xyz.supabase.co',
        ),
      ).toBe('https://xyz.supabase.co/storage/v1/object/public/event_covers/covers/pic.jpg');
    });

    it('returns default fallback image if key is null', () => {
      expect(buildAbsoluteImageUrl(null, 'https://welcomehub.com')).toBe(
        `https://welcomehub.com${DEFAULT_OG_METADATA.fallbackImageRelativePath}`,
      );
    });
  });

  describe('buildEventOgMetadata', () => {
    it('creates rich metadata for existing event record', () => {
      const meta = buildEventOgMetadata(
        {
          title: 'Leadership Conference 2026',
          description: 'A 3-day empowerment conference for leaders.',
          cover_image_key: 'covers/conf.jpg',
        },
        'https://welcomehub.com/events/leadership-2026/register',
        { supabaseUrl: 'https://xyz.supabase.co', appName: 'Welcome Hub' },
      );

      expect(meta.title).toBe('Leadership Conference 2026 | Welcome Hub');
      expect(meta.description).toBe('A 3-day empowerment conference for leaders.');
      expect(meta.imageUrl).toBe(
        'https://xyz.supabase.co/storage/v1/object/public/event_covers/covers/conf.jpg',
      );
      expect(meta.url).toBe('https://welcomehub.com/events/leadership-2026/register');
      expect(meta.type).toBe('article');
      expect(meta.twitterCard).toBe('summary_large_image');
    });

    it('falls back to site defaults when event is null', () => {
      const meta = buildEventOgMetadata(null, 'https://welcomehub.com/events/unknown/register');
      expect(meta.title).toBe(DEFAULT_OG_METADATA.title);
      expect(meta.description).toBe(DEFAULT_OG_METADATA.description);
      expect(meta.imageUrl).toBe('https://welcomehub.com/android-chrome-192x192.png');
    });
  });

  describe('buildFormOgMetadata', () => {
    it('creates rich metadata for published form record', () => {
      const meta = buildFormOgMetadata(
        {
          title: 'Volunteer Application',
          description: 'Sign up to serve in Sunday service teams.',
        },
        'https://welcomehub.com/forms/volunteer-app/submit',
      );

      expect(meta.title).toBe('Volunteer Application | Welcome Hub');
      expect(meta.description).toBe('Sign up to serve in Sunday service teams.');
      expect(meta.imageUrl).toBe('https://welcomehub.com/android-chrome-192x192.png');
      expect(meta.url).toBe('https://welcomehub.com/forms/volunteer-app/submit');
      expect(meta.type).toBe('website');
      expect(meta.twitterCard).toBe('summary_large_image');
    });

    it('falls back to site defaults when form is null', () => {
      const meta = buildFormOgMetadata(null, 'https://welcomehub.com/forms/missing/submit');
      expect(meta.title).toBe(DEFAULT_OG_METADATA.title);
      expect(meta.description).toBe(DEFAULT_OG_METADATA.description);
    });
  });

  describe('generateOgMetaTagString', () => {
    it('generates expected meta tags format', () => {
      const tags = generateOgMetaTagString({
        title: 'Test Event',
        description: 'Test Description',
        imageUrl: 'https://example.com/image.png',
        url: 'https://example.com/event',
        type: 'article',
        siteName: 'Welcome Hub',
        twitterCard: 'summary_large_image',
      });

      expect(tags).toContain('<meta property="og:title" content="Test Event" />');
      expect(tags).toContain('<meta property="og:description" content="Test Description" />');
      expect(tags).toContain(
        '<meta property="og:image" content="https://example.com/image.png" />',
      );
      expect(tags).toContain('<meta name="twitter:card" content="summary_large_image" />');
    });
  });

  describe('injectMetaTags', () => {
    it('replaces existing title and inserts OG meta tags before </head>', () => {
      const templateHtml = `<!doctype html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>Old Title</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

      const meta = {
        title: 'Tech Summit 2026 | Welcome Hub',
        description: 'Explore emerging technologies.',
        imageUrl: 'https://cdn.example.com/image.jpg',
        url: 'https://welcomehub.com/events/tech-summit/register',
        type: 'article' as const,
        siteName: 'Welcome Hub',
      };

      const result = injectMetaTags(templateHtml, meta);

      expect(result).toContain('<title>Tech Summit 2026 | Welcome Hub</title>');
      expect(result).not.toContain('<title>Old Title</title>');
      expect(result).toContain(
        '<meta property="og:title" content="Tech Summit 2026 | Welcome Hub" />',
      );
      expect(result).toContain(
        '<meta property="og:description" content="Explore emerging technologies." />',
      );
      expect(result).toContain(
        '<meta property="og:image" content="https://cdn.example.com/image.jpg" />',
      );
      expect(result).toContain(
        '<meta property="og:url" content="https://welcomehub.com/events/tech-summit/register" />',
      );
      expect(result).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(result).toContain('</head>');
    });
  });
});
