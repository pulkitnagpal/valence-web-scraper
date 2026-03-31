import { chromium } from 'playwright';
import { DEFAULTS, PATHS } from './config';
import { createProductCsvWriter } from './io/csv';
import { appendErrorLog } from './io/logger';
import { readSkuFile } from './io/reader';
import { scrapeRecord } from './scrapers/worker';
import { runWithConcurrency } from './utils';

async function run(): Promise<void> {
  const records = await readSkuFile(PATHS.skuFile);
  const browser = await chromium.launch({ headless: DEFAULTS.headless });
  const csvWriter = createProductCsvWriter(PATHS.csvFile);

  try {
    const results = await runWithConcurrency(
      records,
      DEFAULTS.concurrency,
      async (record) => scrapeRecord(browser, record)
    );
    await csvWriter.writeRecords(results);
    console.log(`Scraping complete. ${results.length} records written to ${PATHS.csvFile}.`);
  } finally {
    await browser.close();
  }
}

void run().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  await appendErrorLog(PATHS.errorLogFile, `[FATAL] ${message}`);
  console.error(`Scraper failed: ${message}`);
  process.exit(1);
});
