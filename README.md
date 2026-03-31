# Web Scraper Assessment (TypeScript + Playwright)

This project scrapes product data from Amazon and Walmart using SKUs from `skus.json`, then writes results to `product_data.csv`.

## Features

- TypeScript + Playwright scraper for Amazon and Walmart
- Extracts: SKU, Source, Title, Description, Price, Number of Reviews and rating
- Modular, SOLID-compliant architecture — adding a new retailer requires touching one config file only
- All site endpoints and selectors centralised in `src/config/sites.ts`
- Retry with exponential backoff per record
- Concurrent scraping with configurable parallelism
- Graceful handling of unsupported source types (logged, written as `NOT_FOUND`)
- Error logging to `errors.log` with attempt-level timestamps
- 14 unit tests across utility and scraper registry modules

## Project Structure

```text
/project-root
├── src/
│   ├── types/
│   │   ├── product.ts        # ProductData interface
│   │   ├── sku.ts            # SkuRecordInput, SkuFile, SupportedSource
│   │   ├── scraper.ts        # SiteConfig, SiteSelectors, RetryOptions
│   │   └── index.ts
│   ├── config/
│   │   ├── paths.ts          # File-system paths (SKU file, CSV, error log)
│   │   ├── defaults.ts       # Timeouts, concurrency, browser settings, user agent
│   │   ├── sites.ts          # All site endpoints and CSS selectors (single source of truth)
│   │   └── index.ts
│   ├── scrapers/
│   │   ├── engine.ts         # Generic page-scraping engine driven by SiteConfig
│   │   ├── registry.ts       # Source type guard and SiteConfig lookup
│   │   ├── worker.ts         # Browser context lifecycle, retry orchestration per record
│   │   └── index.ts
│   ├── io/
│   │   ├── reader.ts         # Reads and validates skus.json
│   │   ├── csv.ts            # CSV writer factory and failure row builder
│   │   ├── logger.ts         # Appends timestamped entries to errors.log
│   │   └── index.ts
│   ├── utils/
│   │   ├── text.ts           # normalizeText, ensureValue
│   │   ├── async.ts          # sleep, withRetries, runWithConcurrency
│   │   └── index.ts
│   └── scraper.ts            # Thin orchestrator (~30 lines)
├── tests/
│   ├── utils.test.ts
│   └── sites.test.ts
├── skus.json
├── package.json
├── tsconfig.json
├── product_data.csv
├── errors.log
└── README.md
```

## Prerequisites

- Node.js 20+
- npm 10+

## Installation

```bash
npm install
npm run install:browsers
```

## Input Format

Edit `skus.json` with any mix of supported and unsupported sources. Unsupported types are handled gracefully — they produce a `NOT_FOUND` row and a log entry without crashing the run.

```json
{
  "skus": [
    { "Type": "Amazon",  "SKU": "B0CT4BB651" },
    { "Type": "Amazon",  "SKU": "B01LR5S6HK" },
    { "Type": "Amazon",  "SKU": "B000VK5P8Y" },
    { "Type": "Walmart", "SKU": "5326288985" },
    { "Type": "Walmart", "SKU": "338111942"  },
    { "Type": "Target",  "SKU": "1234567890" },
    { "Type": "Amazon",  "SKU": "INVALIDSKU123" }
  ]
}
```

## Running the Scraper

```bash
npm run scrape
```

`npm run scrape` always reads from `skus.json` and recreates `product_data.csv` from scratch on each run.

Environment variables:

| Variable             | Default | Description                          |
|----------------------|---------|--------------------------------------|
| `HEADLESS`           | `true`  | Run browser headless or visible       |
| `SCRAPER_CONCURRENCY`| `2`     | Max parallel browser contexts         |

```bash
HEADLESS=false SCRAPER_CONCURRENCY=3 npm run scrape
```

## Output

**`product_data.csv`** — one row per SKU:

| Column | Description |
|--------|-------------|
| SKU | Input SKU value |
| Source | Amazon / Walmart / unsupported type as-is |
| Title | Product title |
| Description | First available description text |
| Price | Displayed price |
| Number of Reviews and rating | Review count and star rating |

Rows where scraping failed or the source is unsupported show `NOT_FOUND` in all data columns.

**`errors.log`** — timestamped entries for every failed attempt and terminal failure:

```
[2026-03-31T14:52:33.912Z] [Attempt 1] Amazon B01LR5S6HK: product not found
[2026-03-31T14:52:42.541Z] [FAILED]    Amazon B01LR5S6HK: product not found
[2026-03-31T14:52:56.441Z] [FAILED]    Target 1234567890: Unsupported source type "Target"
```

## Testing

```bash
npm test
```

14 tests across two suites:
- `tests/utils.test.ts` — `normalizeText`, `ensureValue`, `withRetries`, `runWithConcurrency`
- `tests/sites.test.ts` — source type guard, URL generation, SITE_CONFIGS shape validation, `createFailureRow`

## Adding a New Retailer

Only `src/config/sites.ts` needs to change. Add a new entry to `SITE_CONFIGS` and `SUPPORTED_SOURCES`:

```ts
// src/config/sites.ts
export const SITE_CONFIGS: Record<SupportedSource, SiteConfig> = {
  Amazon:  { ... },
  Walmart: { ... },
  Target:  {                                          // ← add this
    source: 'Target',
    buildProductUrl: (sku) => `https://www.target.com/p/-/A-${sku}`,
    notFoundPattern: /page not found/i,
    selectors: { ... }
  }
};
```

No changes to `engine.ts`, `worker.ts`, `registry.ts`, or `scraper.ts`.

## Assumptions

- Amazon SKUs are ASINs, accessed via `/dp/{SKU}`
- Walmart SKUs are item IDs, accessed via `/ip/{SKU}`
- Selectors may vary by product category and geography; multiple fallback selectors are tried in order
- Records that cannot be scraped are still written to CSV with `NOT_FOUND` values for full traceability

## Anti-bot / CAPTCHA Handling

- Detects CAPTCHA/robot challenge signals via centralised selector in `config/sites.ts`
- Retries each page load up to 3 times with exponential backoff before giving up
- A random jitter delay (500–1700 ms) is added between requests to reduce detection risk
- Failed records are logged and written as `NOT_FOUND`; the run continues for remaining SKUs
- Does not programmatically solve or bypass CAPTCHAs

## Limitations

- Retail sites change DOM structure periodically, which may break selectors
- Geo-blocking, session state, and bot detection can cause `N/A` results even for valid SKUs
- Headful execution (`HEADLESS=false`) may improve success rates in restricted environments
- No cookie/session persistence between runs

## Build

```bash
npm run build
```

