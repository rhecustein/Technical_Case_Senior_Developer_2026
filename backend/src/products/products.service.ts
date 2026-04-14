import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ProductRepository } from './product.repository';
import { Product, UomEnum } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkUpdateItemDto } from './dto/bulk-update-product.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly productRepository: ProductRepository) {}

  /**
   * Return a paginated, optionally filtered and sorted list of products.
   * Searches across partNumber, productName, and brand when `search` is provided.
   */
  async findAll(query: PaginationQueryDto): Promise<{ data: Product[]; total: number }> {
    return this.productRepository.findPaginated(query);
  }

  /** Find a single product by UUID. Throws NotFoundException if not found. */
  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }
    return product;
  }

  /** Find a product by its unique part number. Returns null if not found. */
  async findByPartNumber(partNumber: string): Promise<Product | null> {
    return this.productRepository.findByPartNumber(partNumber);
  }

  /**
   * Create a new product.
   * Throws ConflictException (409) if a product with the same partNumber already exists.
   */
  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findByPartNumber(dto.partNumber);
    if (existing) {
      throw new ConflictException(`Product with partNumber ${dto.partNumber} already exists`);
    }

    const product = this.productRepository.build({
      ...dto,
      uom: dto.uom as UomEnum,
    });
    return this.productRepository.save(product);
  }

  /**
   * Update an existing product by ID.
   * Throws NotFoundException if not found; ConflictException if the new partNumber is taken.
   */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (dto.partNumber && dto.partNumber !== product.partNumber) {
      const conflict = await this.productRepository.findByPartNumber(dto.partNumber);
      if (conflict) {
        throw new ConflictException(`Part number ${dto.partNumber} already in use`);
      }
    }

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  /**
   * Persist a discovered Odoo product ID onto a local product record and set
   * `lastSyncedAt` to now. Used after a push creates/finds an Odoo record for a
   * product that previously had no `odooProductId`.
   */
  async setOdooId(id: string, odooId: number): Promise<void> {
    const product = await this.productRepository.findById(id);
    if (product) {
      product.odooProductId = odooId;
      product.lastSyncedAt = new Date();
      await this.productRepository.save(product);
    }
  }

  /** Delete a product by ID. Throws NotFoundException if it does not exist. */
  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  /**
   * Bulk update products by partNumber.
   * Items are processed independently — failures are recorded in `errors[]`
   * without aborting the rest of the batch.
   */
  async bulkUpdate(
    updates: BulkUpdateItemDto[],
  ): Promise<{ updated: Product[]; errors: Array<{ partNumber: string; error: string }> }> {
    const updated: Product[] = [];
    const errors: Array<{ partNumber: string; error: string }> = [];

    for (const item of updates) {
      try {
        const existing = await this.productRepository.findByPartNumber(item.partNumber);

        if (existing) {
          // Update in-place
          Object.assign(existing, item);
          const saved = await this.productRepository.save(existing);
          updated.push(saved);
        } else {
          // Create new product (upsert semantics)
          // productName defaults to partNumber if omitted; prices default to 0; uom defaults to PCS
          const uom = (item.uom as UomEnum) ?? UomEnum.PCS;
          const product = this.productRepository.build({
            partNumber: item.partNumber,
            productName: item.productName ?? item.partNumber,
            brand: item.brand ?? '',
            salesPrice: item.salesPrice ?? 0,
            costPrice: item.costPrice ?? 0,
            uom,
            description: item.description ?? '',
          });
          const saved = await this.productRepository.save(product);
          updated.push(saved);
          this.logger.log(`Bulk upsert: created new product ${item.partNumber}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`Bulk update error for ${item.partNumber}: ${message}`);
        errors.push({ partNumber: item.partNumber, error: message });
      }
    }

    return { updated, errors };
  }

  /**
   * Upsert a product record received from Odoo.
   * Matches on `odooProductId`; creates a new row if not found, updates in-place otherwise.
   * Sets `lastSyncedAt` to the current timestamp on every call.
   */
  async upsertFromOdoo(odooProduct: {
    odooProductId: number;
    partNumber: string;
    productName: string;
    brand: string;
    salesPrice: number;
    costPrice: number;
    uom: string;
    description: string;
  }): Promise<Product> {
    const existing = await this.productRepository.findByOdooId(odooProduct.odooProductId);
    const uom = this.normalizeUom(odooProduct.uom);

    if (existing) {
      Object.assign(existing, {
        partNumber: odooProduct.partNumber,
        productName: odooProduct.productName,
        brand: odooProduct.brand,
        salesPrice: odooProduct.salesPrice,
        costPrice: odooProduct.costPrice,
        uom,
        description: odooProduct.description,
        lastSyncedAt: new Date(),
      });
      return this.productRepository.save(existing);
    }

    const product = this.productRepository.build({
      odooProductId: odooProduct.odooProductId,
      partNumber: odooProduct.partNumber,
      productName: odooProduct.productName,
      brand: odooProduct.brand,
      salesPrice: odooProduct.salesPrice,
      costPrice: odooProduct.costPrice,
      uom,
      description: odooProduct.description,
      lastSyncedAt: new Date(),
    });
    return this.productRepository.save(product);
  }

  /** Normalize any UOM string from Odoo into the local UomEnum value. */
  private normalizeUom(uom: string): UomEnum {
    const upper = uom.toUpperCase();
    if (upper === 'BOX') return UomEnum.BOX;
    if (upper === 'DOZEN' || upper === 'DZ') return UomEnum.DOZEN;
    return UomEnum.PCS;
  }
}
