import { promises as fs } from 'node:fs';
import path from 'node:path';

export type ProductSource = 'Amazon' | 'Walmart';

export interface SkuRecord {
  Type: ProductSource;
  SKU: string;
}

export interface SkuFile {
  skus: SkuRecord[];
}

export interface ProductData {
  SKU: string;
  Source: ProductSource;
  Title: string;
  Description: string;
  Price: string;
  'Number of Reviews and rating': string;
}

export interface RetryOptions {
  retries: number;
  baseDelayMs: number;
  factor: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 3,
  baseDelayMs: 1200,
  factor: 2
};

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return 'N/A';
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'N/A';
}

export function ensureValue(value: string | null | undefined): string {
  return normalizeText(value);
}

export async function withRetries<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = DEFAULT_RETRY_OPTIONS,
  onError?: (error: unknown, attempt: number) => Promise<void> | void
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= options.retries; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (onError) {
        await onError(error, attempt);
      }

      if (attempt < options.retries) {
        const delay = options.baseDelayMs * Math.pow(options.factor, attempt - 1);
        await sleep(delay);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Operation failed after retries.');
}

export async function readSkuFile(filePath: string): Promise<SkuRecord[]> {
  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<SkuFile>;

  if (!parsed || !Array.isArray(parsed.skus)) {
    throw new Error(`Invalid SKU file format in ${absolutePath}. Expected: { \"skus\": [...] }`);
  }

  const records = parsed.skus.filter((item): item is SkuRecord => {
    return (
      typeof item === 'object' &&
      item !== null &&
      (item as Partial<SkuRecord>).Type !== undefined &&
      (item as Partial<SkuRecord>).SKU !== undefined &&
      ((item as Partial<SkuRecord>).Type === 'Amazon' || (item as Partial<SkuRecord>).Type === 'Walmart') &&
      typeof (item as Partial<SkuRecord>).SKU === 'string'
    );
  });

  if (records.length !== parsed.skus.length) {
    throw new Error('One or more SKU records are invalid. Each record must include Type (Amazon|Walmart) and SKU.');
  }

  return records;
}

export async function appendErrorLog(logPath: string, message: string): Promise<void> {
  const entry = `[${new Date().toISOString()}] ${message}\n`;
  await fs.appendFile(path.resolve(logPath), entry, 'utf-8');
}

export async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (concurrency < 1) {
    throw new Error('Concurrency must be at least 1.');
  }

  const results = new Array<R>(items.length);
  let currentIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = currentIndex;
      currentIndex += 1;

      if (index >= items.length) {
        return;
      }

      results[index] = await worker(items[index], index);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => runWorker());
  await Promise.all(workers);

  return results;
}
