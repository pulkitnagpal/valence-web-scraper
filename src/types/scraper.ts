export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  factor: number;
}

export interface SiteSelectors {
  title: string[];
  description: string[];
  price: string[];
  reviews: string[];
  rating: string[];
}

export interface SiteConfig {
  source: string;
  buildProductUrl: (sku: string) => string;
  notFoundPattern: RegExp;
  selectors: SiteSelectors;
}
