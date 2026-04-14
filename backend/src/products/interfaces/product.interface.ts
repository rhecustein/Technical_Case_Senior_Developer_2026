import { UomEnum } from '../entities/product.entity';

export interface IProduct {
  id: string;
  partNumber: string;
  productName: string;
  brand: string;
  salesPrice: number;
  costPrice: number;
  uom: UomEnum;
  description: string;
  odooProductId: number | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductsService {
  findAll(query: {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Promise<{ data: IProduct[]; total: number }>;
  findOne(id: string): Promise<IProduct>;
  create(data: Partial<IProduct>): Promise<IProduct>;
  update(id: string, data: Partial<IProduct>): Promise<IProduct>;
  remove(id: string): Promise<void>;
  bulkUpdate(updates: Array<Partial<IProduct> & { partNumber: string }>): Promise<IProduct[]>;
}
