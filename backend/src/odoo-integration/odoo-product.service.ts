import { Injectable, Logger } from '@nestjs/common';
import { OdooClientService } from './odoo-client.service';
import {
  OdooProductRaw,
  OdooProductMapped,
  OdooPullResult,
} from './interfaces/odoo-product.interface';
import { Product } from '../products/entities/product.entity';

const PRODUCT_FIELDS = [
  'id',
  'name',
  'x_part_number',
  'x_brand',
  'list_price',
  'standard_price',
  'uom_id',
  'description',
];

@Injectable()
export class OdooProductService {
  private readonly logger = new Logger(OdooProductService.name);

  constructor(private readonly odooClient: OdooClientService) {}

  async pullProducts(page: number, pageSize: number): Promise<OdooPullResult> {
    const domain: unknown[] = [['x_part_number', '!=', false]];

    const [records, total] = await Promise.all([
      this.odooClient.searchRead<OdooProductRaw>(
        'product.template',
        domain,
        PRODUCT_FIELDS,
        { offset: (page - 1) * pageSize, limit: pageSize, order: 'id asc' },
      ),
      this.odooClient.searchCount('product.template', domain),
    ]);

    return {
      data: records.map((r) => this.mapOdooToLocal(r)),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async pullAllProducts(): Promise<OdooProductMapped[]> {
    const pageSize = 100;
    let page = 1;
    const all: OdooProductMapped[] = [];

    while (true) {
      const result = await this.pullProducts(page, pageSize);
      all.push(...result.data);
      if (page >= result.pagination.totalPages) break;
      page++;
    }

    this.logger.log(`Pulled ${all.length} products from Odoo`);
    return all;
  }

  /**
   * Push a local product to Odoo using upsert semantics:
   * - If the product already has an `odooProductId` → write (update).
   * - Otherwise, search Odoo by part number first:
   *   - Found   → write the existing record (avoids UniqueViolation on create).
   *   - Not found → create a new record.
   * Returns the Odoo product template ID so callers can persist it locally.
   */
  async pushProduct(product: Product): Promise<number> {
    const vals = this.mapLocalToOdoo(product);

    if (product.odooProductId) {
      await this.odooClient.write('product.template', [product.odooProductId], vals);
      this.logger.log(`Pushed update for product ${product.partNumber} to Odoo`);
      return product.odooProductId;
    }

    // Search Odoo by part number to avoid duplicate key on create
    const existing = await this.odooClient.searchRead<{ id: number }>(
      'product.template',
      [['x_part_number', '=', product.partNumber]],
      ['id'],
      { limit: 1 },
    );

    if (existing.length > 0) {
      const odooId = existing[0].id;
      await this.odooClient.write('product.template', [odooId], vals);
      this.logger.log(
        `Found existing Odoo record for ${product.partNumber} (id=${odooId}), updated`,
      );
      return odooId;
    }

    const newId = await this.odooClient.create('product.template', vals);
    this.logger.log(`Created product ${product.partNumber} in Odoo with ID ${newId}`);
    return newId;
  }

  async bulkPushProducts(products: Product[]): Promise<void> {
    this.logger.log(`Bulk pushing ${products.length} products to Odoo`);

    for (const product of products) {
      try {
        await this.pushProduct(product);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(
          `Failed to push product ${product.partNumber} to Odoo: ${message}`,
        );
      }
    }
  }

  private mapOdooToLocal(raw: OdooProductRaw): OdooProductMapped {
    return {
      odooProductId: raw.id,
      partNumber: raw.x_part_number ?? '',
      productName: raw.name ?? '',
      brand: raw.x_brand !== false ? (raw.x_brand as string) : '',
      salesPrice: raw.list_price ?? 0,
      costPrice: raw.standard_price ?? 0,
      uom: Array.isArray(raw.uom_id) ? raw.uom_id[1] : 'PCS',
      description: raw.description !== false ? (raw.description as string) : '',
    };
  }

  private mapLocalToOdoo(product: Product): Record<string, unknown> {
    return {
      x_part_number: product.partNumber,
      name: product.productName,
      x_brand: product.brand ?? '',
      list_price: product.salesPrice,
      standard_price: product.costPrice,
      description: product.description ?? '',
    };
  }
}
