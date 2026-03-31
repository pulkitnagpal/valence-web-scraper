export const DEFAULTS = {
  timeoutMs: 30_000,
  waitForNetworkIdleMs: 10_000,
  concurrency: Number.parseInt(process.env.SCRAPER_CONCURRENCY ?? '2', 10),
  headless: (process.env.HEADLESS ?? 'true').toLowerCase() !== 'false',
  retry: {
    retries: 3,
    baseDelayMs: 1500,
    factor: 2
  },
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  browser: {
    viewport: { width: 1366, height: 768 },
    locale: 'en-US',
    timezoneId: 'America/New_York'
  }
};
