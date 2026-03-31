import path from 'node:path';

export const PATHS = {
  skuFile: path.resolve(process.cwd(), 'skus.json'),
  csvFile: path.resolve(process.cwd(), 'product_data.csv'),
  errorLogFile: path.resolve(process.cwd(), 'errors.log')
};
