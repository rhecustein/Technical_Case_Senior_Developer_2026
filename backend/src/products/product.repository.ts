import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsOrder } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';

/**
 * Data-access abstraction layer for the Product entity.
 * All TypeORM queries are isolated here; services never touch the
 * raw TypeORM repository directly.
 */
@Injectable()
export class ProductRepository {
  constructor(
    @InjectRepository(Product)
    private readonly repo: Repository<Product>,
  ) {}

  /**
   * Find products with optional full-text search, sort, and pagination.
   */
  async findPaginated(
    query: PaginationQueryDto,
  ): Promise<{ data: Product[]; total: number }> {
    const { page, pageSize, search, sortBy = 'createdAt', sortOrder = 'DESC' } = query;

    const where = search
      ? [
          { partNumber: Like(`%${search}%`) },
          { productName: Like(`%${search}%`) },
          { brand: Like(`%${search}%`) },
        ]
      : undefined;

    const order: FindOptionsOrder<Product> = { [sortBy]: sortOrder };

    const [data, total] = await this.repo.findAndCount({
      where,
      order,
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { data, total };
  }

  /**
   * Find a single product by primary key, returns null if not found.
   */
  async findById(id: string): Promise<Product | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Find a product by part number, returns null if not found.
   */
  async findByPartNumber(partNumber: string): Promise<Product | null> {
    return this.repo.findOne({ where: { partNumber } });
  }

  /**
   * Find a product by Odoo product ID (used during sync upsert).
   */
  async findByOdooId(odooProductId: number): Promise<Product | null> {
    return this.repo.findOne({ where: { odooProductId } });
  }

  /** Retrieve all products without pagination (used for push-to-Odoo sync). */
  async findAll(limit = 1000): Promise<Product[]> {
    return this.repo.find({ order: { createdAt: 'ASC' }, take: limit });
  }

  /** Create a new Product entity instance (does not persist). */
  build(data: Partial<Product>): Product {
    return this.repo.create(data);
  }

  /** Persist a product (insert or update). */
  async save(product: Product): Promise<Product> {
    return this.repo.save(product);
  }

  /** Remove a product from the database. */
  async remove(product: Product): Promise<void> {
    await this.repo.remove(product);
  }
}
