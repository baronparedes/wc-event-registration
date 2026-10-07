export const DEFAULT_OG_METADATA = {
  title: 'Welcome Hub',
  description: 'Community Event Registration & Attendance Management',
  siteName: 'Welcome Hub',
  type: 'website' as const,
  twitterCard: 'summary_large_image' as const,
  fallbackImageRelativePath: '/android-chrome-192x192.png',
};

export const CRAWLER_USER_AGENTS_REGEX =
  /facebookexternalhit|facebot|twitterbot|viber|whatsapp|telegrambot|discordbot|linkedinbot|slackbot|applebot|pinterestbot|googlebot|bingbot|duckduckbot|yandexbot|baiduspider|skypeuripreview|quora|redditbot/i;

export const EVENT_DYNAMIC_ROUTE_REGEX =
  /^\/events\/([^/]+)\/(?:register|register-public|countdown)\/?$/;
