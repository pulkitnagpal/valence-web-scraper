/**
 * Collapses all internal whitespace to single spaces and trims the result.
 * Returns 'N/A' for empty, null, or undefined input.
 */
export function normalizeText(value: string | null | undefined): string {
  if (!value) {
    return 'N/A';
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length > 0 ? cleaned : 'N/A';
}

/**
 * Alias of normalizeText; semantically signals intent to guarantee a string value.
 */
export function ensureValue(value: string | null | undefined): string {
  return normalizeText(value);
}
