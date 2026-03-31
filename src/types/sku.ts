export type SupportedSource = 'Amazon' | 'Walmart';

export interface SkuRecordInput {
  Type: string;
  SKU: string;
}

export interface SkuFile {
  skus: SkuRecordInput[];
}
