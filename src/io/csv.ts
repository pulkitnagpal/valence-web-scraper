import { createObjectCsvWriter } from 'csv-writer';
import type { ProductData } from '../types';

export function createProductCsvWriter(csvPath: string) {
  return createObjectCsvWriter({
    path: csvPath,
    header: [
      { id: 'SKU', title: 'SKU' },
      { id: 'Source', title: 'Source' },
      { id: 'Title', title: 'Title' },
      { id: 'Description', title: 'Description' },
      { id: 'Price', title: 'Price' },
      { id: 'Number of Reviews and rating', title: 'Number of Reviews and rating' }
    ]
  });
}

export function createFailureRow(sku: string, source: string): ProductData {
  return {
    SKU: sku,
    Source: source,
    Title: 'NOT_FOUND',
    Description: 'NOT_FOUND',
    Price: 'NOT_FOUND',
    'Number of Reviews and rating': 'NOT_FOUND'
  };
}
