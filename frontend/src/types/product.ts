export type UomType = 'PCS' | 'BOX' | 'DOZEN';

export interface Product {
  id: string;
  partNumber: string;
  productName: string;
  brand: string;
  salesPrice: number;
  costPrice: number;
  uom: UomType;
  description: string;
  odooProductId: number | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  partNumber: string;
  productName: string;
  brand?: string;
  salesPrice: number;
  costPrice: number;
  uom: UomType;
  description?: string;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface BulkUpdateItem {
  partNumber: string;
  productName?: string;
  brand?: string;
  salesPrice?: number;
  costPrice?: number;
  uom?: UomType;
  description?: string;
}

export interface BulkUpdatePayload {
  updates: BulkUpdateItem[];
}
