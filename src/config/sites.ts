import type { SiteConfig, SupportedSource } from '../types';

/**
 * Playwright locator for common CAPTCHA / anti-bot challenge signals.
 * Centralised here so updating it affects every scraper uniformly.
 */
export const CAPTCHA_SELECTOR =
  'text=/captcha|robot|verify/i, #captchacharacters, iframe[title*=captcha i]';

/**
 * The canonical list of supported source names.
 * Add a new entry here (and a matching key in SITE_CONFIGS) to support a new retailer.
 */
export const SUPPORTED_SOURCES: SupportedSource[] = ['Amazon', 'Walmart'];

/**
 * Per-site configuration: product URL builder, not-found detection pattern,
 * and all CSS selectors used for data extraction.
 *
 * Open/Closed principle: extend by adding a new key; never modify existing entries.
 */
export const SITE_CONFIGS: Record<SupportedSource, SiteConfig> = {
  Amazon: {
    source: 'Amazon',
    buildProductUrl: (sku) => `https://www.amazon.com/dp/${encodeURIComponent(sku)}`,
    notFoundPattern: /couldn't find that page|dog of amazon|currently unavailable/i,
    selectors: {
      title: ['#productTitle', 'h1 span#title'],
      description: [
        '#feature-bullets ul li:not(.aok-hidden) span.a-list-item',
        '#productDescription p',
        '#bookDescription_feature_div .a-expander-content'
      ],
      price: ['.a-price .a-offscreen', '#corePrice_feature_div .a-offscreen'],
      reviews: ['#acrCustomerReviewText', '[data-hook="total-review-count"]'],
      rating: ['#acrPopover', 'span[data-hook="rating-out-of-text"]']
    }
  },
  Walmart: {
    source: 'Walmart',
    buildProductUrl: (sku) => `https://www.walmart.com/ip/${encodeURIComponent(sku)}`,
    notFoundPattern: /we couldn't find this page|page not found|sorry, this item is unavailable/i,
    selectors: {
      title: ['h1[data-automation-id="product-title"]', 'h1#main-title'],
      description: [
        '[data-testid="product-description-content"]',
        '.about-desc',
        '#product-description'
      ],
      price: [
        '[itemprop="price"]',
        'span[data-automation-id="product-price"]',
        '[data-testid="price-current"]'
      ],
      reviews: ['[data-testid="reviews-and-ratings"]', 'a[href*="/reviews"]', '[itemprop="ratingCount"]'],
      rating: ['[itemprop="ratingValue"]', '[data-testid="rating-stars"]']
    }
  }
};
