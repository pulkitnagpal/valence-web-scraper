import { describe, expect, it } from 'vitest';
import { normalizeText, runWithConcurrency, withRetries } from '../src/utils';
import { ensureValue } from '../src/utils/text';

describe('normalizeText', () => {
  it('normalizes whitespace and trims', () => {
    expect(normalizeText('  Hello   world \n  test ')).toBe('Hello world test');
  });

  it('returns N/A for empty input', () => {
    expect(normalizeText('   ')).toBe('N/A');
    expect(normalizeText(undefined)).toBe('N/A');
  });

  it('ensureValue delegates to normalizeText', () => {
    expect(ensureValue('  hello  ')).toBe('hello');
    expect(ensureValue(null)).toBe('N/A');
  });
});

describe('withRetries', () => {
  it('retries until success', async () => {
    let attempts = 0;

    const result = await withRetries(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }

        return 'ok';
      },
      { retries: 3, baseDelayMs: 1, factor: 1 }
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(3);
  });

  it('throws after max retries', async () => {
    await expect(
      withRetries(
        async () => {
          throw new Error('Always fails');
        },
        { retries: 2, baseDelayMs: 1, factor: 1 }
      )
    ).rejects.toThrow('Always fails');
  });
});

describe('runWithConcurrency', () => {
  it('processes all items preserving result order', async () => {
    const input = [1, 2, 3, 4, 5];

    const output = await runWithConcurrency(input, 2, async (value) => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      return value * 2;
    });

    expect(output).toEqual([2, 4, 6, 8, 10]);
  });
});
