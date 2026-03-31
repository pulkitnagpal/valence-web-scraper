import type { Browser, BrowserContext } from 'playwright';
import { DEFAULTS, PATHS } from '../config';
import { createFailureRow } from '../io/csv';
import { appendErrorLog } from '../io/logger';
import type { ProductData, SkuRecordInput } from '../types';
import { sleep, withRetries } from '../utils';
import { scrapeBySiteConfig } from './engine';
import { getSiteConfig, isSupportedSource } from './registry';

function createBrowserContext(browser: Browser): Promise<BrowserContext> {
  return browser.newContext({
    viewport: DEFAULTS.browser.viewport,
    userAgent: DEFAULTS.userAgent,
    locale: DEFAULTS.browser.locale,
    timezoneId: DEFAULTS.browser.timezoneId
  });
}

/**
 * Manages the full lifecycle of scraping a single SKU record:
 * - Spins up an isolated browser context
 * - Validates the source type
 * - Delegates to the generic engine via retry
 * - Logs failures and returns a NOT_FOUND row instead of throwing
 */
export async function scrapeRecord(browser: Browser, record: SkuRecordInput): Promise<ProductData> {
  const context = await createBrowserContext(browser);
  const page = await context.newPage();

  try {
    await page.setDefaultTimeout(DEFAULTS.timeoutMs);
    await sleep(500 + Math.floor(Math.random() * 1200));

    if (!isSupportedSource(record.Type)) {
      throw new Error(`Unsupported source type "${record.Type}" for SKU ${record.SKU}`);
    }

    const config = getSiteConfig(record.Type);

    const details = await withRetries(
      async () => scrapeBySiteConfig(page, config, record.SKU),
      DEFAULTS.retry,
      async (error, attempt) => {
        await appendErrorLog(
          PATHS.errorLogFile,
          `[Attempt ${attempt}] ${record.Type} ${record.SKU}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    );

    return { SKU: record.SKU, Source: record.Type, ...details };
  } catch (error) {
    await appendErrorLog(
      PATHS.errorLogFile,
      `[FAILED] ${record.Type} ${record.SKU}: ${error instanceof Error ? error.message : String(error)}`
    );
    return createFailureRow(record.SKU, record.Type);
  } finally {
    await page.close().catch(() => undefined);
    await context.close().catch(() => undefined);
  }
}
