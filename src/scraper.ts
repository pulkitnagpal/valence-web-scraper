import path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { createObjectCsvWriter } from 'csv-writer';
import {
  appendErrorLog,
  ensureValue,
  normalizeText,
  readSkuFile,
  runWithConcurrency,
  sleep,
  type ProductData,
  type SkuRecord,
  withRetries
} from './utils';

const SKU_FILE = path.resolve(process.cwd(), 'skus.json');
const CSV_FILE = path.resolve(process.cwd(), 'product_data.csv');
const ERROR_LOG_FILE = path.resolve(process.cwd(), 'errors.log');

const DEFAULT_TIMEOUT_MS = 30000;
const CONCURRENCY = Number.parseInt(process.env.SCRAPER_CONCURRENCY ?? '2', 10);
const HEADLESS = (process.env.HEADLESS ?? 'true').toLowerCase() !== 'false';

const csvWriter = createObjectCsvWriter({
  path: CSV_FILE,
  header: [
    { id: 'SKU', title: 'SKU' },
    { id: 'Source', title: 'Source' },
    { id: 'Title', title: 'Title' },
    { id: 'Description', title: 'Description' },
    { id: 'Price', title: 'Price' },
    { id: 'Number of Reviews and rating', title: 'Number of Reviews and rating' }
  ],
  append: existsSync(CSV_FILE) && statSync(CSV_FILE).size > 0
});

function hasCaptcha(page: Page): Promise<boolean> {
  return page
    .locator('text=/captcha|robot|verify/i, #captchacharacters, iframe[title*=captcha i]')
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);
}

async function getSafeText(page: Page, selectors: string[]): Promise<string> {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if (await loc.count()) {
      const text = await loc.textContent({ timeout: 3000 }).catch(() => null);
      if (text && normalizeText(text) !== 'N/A') {
        return normalizeText(text);
      }
    }
  }

  return 'N/A';
}

async function scrapeAmazon(page: Page, sku: string): Promise<Omit<ProductData, 'SKU' | 'Source'>> {
  const url = `https://www.amazon.com/dp/${encodeURIComponent(sku)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS });

  if (await hasCaptcha(page)) {
    throw new Error(`Amazon anti-bot/captcha page detected for SKU ${sku}`);
  }

  const notFound = await page
    .locator('text=/couldn\'t find that page|dog of amazon|currently unavailable/i')
    .first()
    .isVisible({ timeout: 1500 })
    .catch(() => false);

  if (notFound) {
    throw new Error(`Amazon product not found for SKU ${sku}`);
  }

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

  const title = await getSafeText(page, ['#productTitle', 'h1 span#title']);
  const description = await getSafeText(page, [
    '#feature-bullets ul li:not(.aok-hidden) span.a-list-item',
    '#productDescription p',
    '#bookDescription_feature_div .a-expander-content'
  ]);

  const wholePrice = await getSafeText(page, ['.a-price .a-offscreen', '#corePrice_feature_div .a-offscreen']);
  const reviewsCount = await getSafeText(page, ['#acrCustomerReviewText', '[data-hook="total-review-count"]']);
  const rating = await getSafeText(page, ['#acrPopover', 'span[data-hook="rating-out-of-text"]']);

  return {
    Title: ensureValue(title),
    Description: ensureValue(description),
    Price: ensureValue(wholePrice),
    'Number of Reviews and rating': ensureValue(`${reviewsCount} | ${rating}`)
  };
}

async function scrapeWalmart(page: Page, sku: string): Promise<Omit<ProductData, 'SKU' | 'Source'>> {
  const url = `https://www.walmart.com/ip/${encodeURIComponent(sku)}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: DEFAULT_TIMEOUT_MS });

  if (await hasCaptcha(page)) {
    throw new Error(`Walmart anti-bot/captcha page detected for SKU ${sku}`);
  }

  const notFound = await page
    .locator('text=/we couldn\'t find this page|page not found|sorry\, this item is unavailable/i')
    .first()
    .isVisible({ timeout: 2000 })
    .catch(() => false);

  if (notFound) {
    throw new Error(`Walmart product not found for SKU ${sku}`);
  }

  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => undefined);

  const title = await getSafeText(page, ['h1[data-automation-id="product-title"]', 'h1#main-title']);
  const description = await getSafeText(page, [
    '[data-testid="product-description-content"]',
    '.about-desc',
    '#product-description'
  ]);
  const price = await getSafeText(page, [
    '[itemprop="price"]',
    'span[data-automation-id="product-price"]',
    '[data-testid="price-current"]'
  ]);
  const reviews = await getSafeText(page, [
    '[data-testid="reviews-and-ratings"]',
    'a[href*="/reviews"]',
    '[itemprop="ratingCount"]'
  ]);
  const rating = await getSafeText(page, ['[itemprop="ratingValue"]', '[data-testid="rating-stars"]']);

  return {
    Title: ensureValue(title),
    Description: ensureValue(description),
    Price: ensureValue(price),
    'Number of Reviews and rating': ensureValue(`${reviews} | ${rating}`)
  };
}

async function createContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    viewport: { width: 1366, height: 768 },
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });
}

async function scrapeOne(browser: Browser, record: SkuRecord): Promise<ProductData> {
  const context = await createContext(browser);
  const page = await context.newPage();

  try {
    await page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
    await sleep(500 + Math.floor(Math.random() * 1200));

    const details = await withRetries(
      async () => {
        if (record.Type === 'Amazon') {
          return scrapeAmazon(page, record.SKU);
        }

        return scrapeWalmart(page, record.SKU);
      },
      { retries: 3, baseDelayMs: 1500, factor: 2 },
      async (error, attempt) => {
        await appendErrorLog(
          ERROR_LOG_FILE,
          `[Attempt ${attempt}] ${record.Type} ${record.SKU}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    );

    return {
      SKU: record.SKU,
      Source: record.Type,
      ...details
    };
  } catch (error) {
    await appendErrorLog(
      ERROR_LOG_FILE,
      `[FAILED] ${record.Type} ${record.SKU}: ${error instanceof Error ? error.message : String(error)}`
    );

    return {
      SKU: record.SKU,
      Source: record.Type,
      Title: 'NOT_FOUND',
      Description: 'NOT_FOUND',
      Price: 'NOT_FOUND',
      'Number of Reviews and rating': 'NOT_FOUND'
    };
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}

async function run(): Promise<void> {
  const records = await readSkuFile(SKU_FILE);
  const browser = await chromium.launch({ headless: HEADLESS });

  try {
    const results = await runWithConcurrency(records, CONCURRENCY, async (record) => scrapeOne(browser, record));
    await csvWriter.writeRecords(results);

    console.log(`Scraping complete. ${results.length} records written to ${CSV_FILE}.`);
  } finally {
    await browser.close();
  }
}

void run().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await appendErrorLog(ERROR_LOG_FILE, `[FATAL] ${message}`);
  console.error(`Scraper failed: ${message}`);
  process.exit(1);
});
