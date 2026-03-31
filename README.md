# Web Scraper Assessment (TypeScript + Playwright)

This project scrapes product data from Amazon and Walmart using SKUs from `skus.json`, then writes results to `product_data.csv`.

## Features

- TypeScript + Playwright scraper for Amazon and Walmart
- Extracts:
	- SKU
	- Source
	- Title
	- Description
	- Price
	- Number of Reviews and rating
- Retry support with exponential backoff
- Concurrency support for faster scraping
- Error logging to `errors.log`
- Unit tests for key utility logic

## Project Structure

```text
/project-root
|-- /src
|   |-- scraper.ts
|   |-- utils.ts
|-- /tests
|   |-- utils.test.ts
|-- skus.json
|-- package.json
|-- tsconfig.json
|-- product_data.csv
|-- errors.log
|-- README.md
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

Update `skus.json` with records in this format:

```json
{
	"skus": [
		{ "Type": "Amazon", "SKU": "B0CT4BB651" },
		{ "Type": "Walmart", "SKU": "5326288985" },
		{ "Type": "Amazon", "SKU": "B01LR5S6HK" }
	]
}
```

## Run the Scraper

```bash
npm run scrape
```

Environment variables:

- `HEADLESS=true|false` (default `true`)
- `SCRAPER_CONCURRENCY=<number>` (default `2`)

Example:

```bash
HEADLESS=false SCRAPER_CONCURRENCY=3 npm run scrape
```

## Output

- `product_data.csv` (appended rows with product data)
- `errors.log` (timestamped attempt/failure/fatal logs)

CSV columns:

- SKU
- Source (Amazon/Walmart)
- Title
- Description
- Price
- Number of Reviews and rating

## Testing

```bash
npm test
```

## Assumptions

- SKU is mapped as:
	- Amazon: ASIN in URL `/dp/{SKU}`
	- Walmart: item id in URL `/ip/{SKU}`
- Selectors can vary by product category and geography; scraper uses multiple fallback selectors.
- If product page cannot be parsed, row is still written with `NOT_FOUND` fields for traceability.

## Anti-bot / CAPTCHA Handling

- Scraper detects common CAPTCHA/robot challenge signals.
- It retries failed attempts with exponential backoff.
- If all retries fail, failure is logged to `errors.log`, and a fallback `NOT_FOUND` row is produced.
- This implementation does not bypass CAPTCHA challenges programmatically.

## Limitations

- Retail sites can change DOM structure at any time, which may break selectors.
- Some products may not expose full descriptions in static page HTML.
- Geographic differences, account state, cookies, and bot protections can affect results.
- Headful execution (`HEADLESS=false`) may improve outcomes in some environments.

## Build

```bash
npm run build
```
