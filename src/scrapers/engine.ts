import type { Page } from 'playwright';
import { CAPTCHA_SELECTOR, DEFAULTS } from '../config';
import type { ProductData, SiteConfig } from '../types';
import { ensureValue, normalizeText } from '../utils';

/**
 * Detects common CAPTCHA / anti-bot challenge signals on the current page.
 */
async function hasCaptcha(page: Page): Promise<boolean> {
  return page.locator(CAPTCHA_SELECTOR).first().isVisible({ timeout: 1500 }).catch(() => false);
}

/**
 * Tries each selector in order and returns the first non-empty text found.
 * Returns 'N/A' if none of the selectors yield readable content.
 */
async function getSafeText(page: Page, selectors: string[]): Promise<string> {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) {
      continue;
    }
    const text = await locator.textContent({ timeout: 3000 }).catch(() => null);
    if (text && normalizeText(text) !== 'N/A') {
      return normalizeText(text);
    }
  }
  return 'N/A';
}

/**
 * Generic scraping engine driven entirely by a SiteConfig.
 * Adding a new site requires no changes here — only a new SiteConfig entry.
 */
export async function scrapeBySiteConfig(
  page: Page,
  config: SiteConfig,
  sku: string
): Promise<Omit<ProductData, 'SKU' | 'Source'>> {
  await page.goto(config.buildProductUrl(sku), {
    waitUntil: 'domcontentloaded',
    timeout: DEFAULTS.timeoutMs
  });

  if (await hasCaptcha(page)) {
    throw new Error(`${config.source} anti-bot/captcha detected for SKU ${sku}`);
  }

  const bodyText = normalizeText(await page.locator('body').first().textContent().catch(() => ''));
  if (config.notFoundPattern.test(bodyText)) {
    throw new Error(`${config.source} product not found for SKU ${sku}`);
  }

  await page.waitForLoadState('networkidle', { timeout: DEFAULTS.waitForNetworkIdleMs }).catch(() => undefined);

  const title = await getSafeText(page, config.selectors.title);
  const description = await getSafeText(page, config.selectors.description);
  const price = await getSafeText(page, config.selectors.price);
  const reviews = await getSafeText(page, config.selectors.reviews);
  const rating = await getSafeText(page, config.selectors.rating);

  return {
    Title: ensureValue(title),
    Description: ensureValue(description),
    Price: ensureValue(price),
    'Number of Reviews and rating': ensureValue(`${reviews} | ${rating}`)
  };
}
