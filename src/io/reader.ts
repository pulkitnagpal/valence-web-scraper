import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { SkuFile, SkuRecordInput } from '../types';

export async function readSkuFile(filePath: string): Promise<SkuRecordInput[]> {
  const absolutePath = path.resolve(filePath);
  const raw = await fs.readFile(absolutePath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<SkuFile>;

  if (!parsed || !Array.isArray(parsed.skus)) {
    throw new Error(`Invalid SKU file format in ${absolutePath}. Expected: { "skus": [...] }`);
  }

  const invalidRecord = parsed.skus.find((item) => {
    if (typeof item !== 'object' || item === null) {
      return true;
    }
    const candidate = item as Partial<SkuRecordInput>;
    if (typeof candidate.Type !== 'string' || typeof candidate.SKU !== 'string') {
      return true;
    }
    return candidate.Type.trim().length === 0 || candidate.SKU.trim().length === 0;
  });

  if (invalidRecord) {
    throw new Error('One or more SKU records are invalid. Each record must include non-empty Type and SKU strings.');
  }

  return parsed.skus as SkuRecordInput[];
}
