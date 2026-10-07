export interface OgMetadata {
  title: string;
  description: string;
  imageUrl?: string | null;
  url: string;
  type?: 'website' | 'article';
  siteName?: string;
  twitterCard?: 'summary' | 'summary_large_image';
}

export interface EventOgRecord {
  title: string;
  description?: string | null;
  cover_image_key?: string | null;
}
