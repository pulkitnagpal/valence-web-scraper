import { describe, expect, it } from 'vitest';
import { isSupportedSource, getSiteConfig } from '../src/scrapers/registry';
import { SUPPORTED_SOURCES, SITE_CONFIGS } from '../src/config/sites';
import { createFailureRow } from '../src/io/csv';

describe('source registry', () => {
  it('identifies supported source types', () => {
    expect(isSupportedSource('Amazon')).toBe(true);
    expect(isSupportedSource('Walmart')).toBe(true);
  });

  it('rejects unsupported source types', () => {
    expect(isSupportedSource('Target')).toBe(false);
    expect(isSupportedSource('')).toBe(false);
    expect(isSupportedSource('ebay')).toBe(false);
  });

  it('SUPPORTED_SOURCES matches SITE_CONFIGS keys', () => {
    const configKeys = Object.keys(SITE_CONFIGS);
    expect(SUPPORTED_SOURCES.sort()).toEqual(configKeys.sort());
  });
});

describe('site config endpoints', () => {
  it('builds Amazon product URL from SKU', () => {
    const config = getSiteConfig('Amazon');
    expect(config.buildProductUrl('B01LR5S6HK')).toBe('https://www.amazon.com/dp/B01LR5S6HK');
  });

  it('builds Walmart product URL from SKU', () => {
    const config = getSiteConfig('Walmart');
    expect(config.buildProductUrl('12345')).toBe('https://www.walmart.com/ip/12345');
  });

  it('encodes special characters in SKU for URLs', () => {
    const config = getSiteConfig('Amazon');
    expect(config.buildProductUrl('A B+C')).toBe('https://www.amazon.com/dp/A%20B%2BC');
  });

  it('every site config has all required selector fields', () => {
    for (const config of Object.values(SITE_CONFIGS)) {
      expect(Array.isArray(config.selectors.title)).toBe(true);
      expect(Array.isArray(config.selectors.description)).toBe(true);
      expect(Array.isArray(config.selectors.price)).toBe(true);
      expect(Array.isArray(config.selectors.reviews)).toBe(true);
      expect(Array.isArray(config.selectors.rating)).toBe(true);
    }
  });
});

describe('createFailureRow', () => {
  it('returns NOT_FOUND for all fields', () => {
    const row = createFailureRow('SKU123', 'Target');
    expect(row.SKU).toBe('SKU123');
    expect(row.Source).toBe('Target');
    expect(row.Title).toBe('NOT_FOUND');
    expect(row.Price).toBe('NOT_FOUND');
    expect(row['Number of Reviews and rating']).toBe('NOT_FOUND');
  });
});
