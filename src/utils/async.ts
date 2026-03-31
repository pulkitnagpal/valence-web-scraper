import type { RetryOptions } from '../types';

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  retries: 3,
  baseDelayMs: 1200,
  factor: 2
};

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries `fn` up to `options.retries` times with exponential backoff.
 * Calls `onError` after each failed attempt before sleeping.
 */
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

/**
 * Runs `worker` over `items` with at most `concurrency` in-flight at once.
 * Preserves result order regardless of completion order.
 */
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
