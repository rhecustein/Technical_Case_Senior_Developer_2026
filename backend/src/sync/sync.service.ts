import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OdooProductService } from '../odoo-integration/odoo-product.service';
import { ProductsService } from '../products/products.service';
import { SyncLog, SyncDirection, SyncStatus } from './entities/sync-log.entity';

export interface SyncResult {
  direction: SyncDirection;
  status: SyncStatus;
  recordsTotal: number;
  recordsSuccess: number;
  recordsFailed: number;
  errors: Array<{ item: string; error: string }>;
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly odooProductService: OdooProductService,
    private readonly productsService: ProductsService,
    @InjectRepository(SyncLog)
    private readonly syncLogRepository: Repository<SyncLog>,
  ) {}

  /**
   * Pull all products from Odoo via paginated JSON-RPC and upsert them into the
   * in-house database. Each product is processed independently; individual failures
   * are captured in the returned `errors[]` without aborting the batch.
   * A SyncLog entry is written regardless of outcome.
   */
  async syncFromOdoo(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.log('Starting sync: Odoo → In-house DB');

    const errors: Array<{ item: string; error: string }> = [];
    let recordsSuccess = 0;

    try {
      const odooProducts = await this.odooProductService.pullAllProducts();
      const total = odooProducts.length;

      for (const item of odooProducts) {
        try {
          await this.productsService.upsertFromOdoo(item);
          recordsSuccess++;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          this.logger.error(`Failed to upsert ${item.partNumber}: ${message}`);
          errors.push({ item: item.partNumber, error: message });
        }
      }

      const status =
        errors.length === 0
          ? SyncStatus.SUCCESS
          : recordsSuccess === 0
          ? SyncStatus.FAILED
          : SyncStatus.PARTIAL;

      await this.saveSyncLog({
        direction: SyncDirection.PULL,
        status,
        recordsTotal: total,
        recordsSuccess,
        recordsFailed: errors.length,
        errorDetails: errors.length > 0 ? errors : null,
        startedAt,
        finishedAt: new Date(),
      });

      this.logger.log(
        `Sync complete: ${recordsSuccess}/${total} products synced from Odoo`,
      );

      return {
        direction: SyncDirection.PULL,
        status,
        recordsTotal: total,
        recordsSuccess,
        recordsFailed: errors.length,
        errors,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Sync from Odoo failed: ${message}`);

      await this.saveSyncLog({
        direction: SyncDirection.PULL,
        status: SyncStatus.FAILED,
        recordsTotal: 0,
        recordsSuccess: 0,
        recordsFailed: 1,
        errorDetails: [{ error: message }],
        startedAt,
        finishedAt: new Date(),
      });

      throw err;
    }
  }

  /**
   * Push all products from the in-house database to Odoo.
   * Products without an `odooProductId` will be skipped by Odoo's write() call.
   * Failures per product are captured; the batch continues regardless.
   */
  async syncToOdoo(): Promise<SyncResult> {
    const startedAt = new Date();
    this.logger.log('Starting sync: In-house DB → Odoo');

    const errors: Array<{ item: string; error: string }> = [];
    let recordsSuccess = 0;

    try {
      const { data: products } = await this.productsService.findAll({
        page: 1,
        pageSize: 1000,
        sortOrder: 'ASC',
      });

      const total = products.length;

      for (const product of products) {
        try {
          const odooId = await this.odooProductService.pushProduct(product);
          recordsSuccess++;
          // Persist the Odoo ID back if it was newly discovered
          if (!product.odooProductId) {
            await this.productsService.setOdooId(product.id, odooId);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error';
          this.logger.error(
            `Failed to push ${product.partNumber} to Odoo: ${message}`,
          );
          errors.push({ item: product.partNumber, error: message });
        }
      }

      const status =
        errors.length === 0
          ? SyncStatus.SUCCESS
          : recordsSuccess === 0
          ? SyncStatus.FAILED
          : SyncStatus.PARTIAL;

      await this.saveSyncLog({
        direction: SyncDirection.PUSH,
        status,
        recordsTotal: total,
        recordsSuccess,
        recordsFailed: errors.length,
        errorDetails: errors.length > 0 ? errors : null,
        startedAt,
        finishedAt: new Date(),
      });

      this.logger.log(
        `Sync complete: ${recordsSuccess}/${total} products pushed to Odoo`,
      );

      return {
        direction: SyncDirection.PUSH,
        status,
        recordsTotal: total,
        recordsSuccess,
        recordsFailed: errors.length,
        errors,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Sync to Odoo failed: ${message}`);

      await this.saveSyncLog({
        direction: SyncDirection.PUSH,
        status: SyncStatus.FAILED,
        recordsTotal: 0,
        recordsSuccess: 0,
        recordsFailed: 1,
        errorDetails: [{ error: message }],
        startedAt,
        finishedAt: new Date(),
      });

      throw err;
    }
  }

  /** Return paginated sync log history, ordered newest-first. */
  async getLogs(
    page: number,
    pageSize: number,
  ): Promise<{ data: SyncLog[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const [data, total] = await this.syncLogRepository.findAndCount({
      order: { startedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  private async saveSyncLog(data: Omit<SyncLog, 'id' | 'createdAt'>): Promise<void> {
    await this.syncLogRepository.save(this.syncLogRepository.create(data));
  }
}
