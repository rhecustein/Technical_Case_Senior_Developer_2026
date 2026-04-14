import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SyncService } from './sync.service';
import { SyncLog, SyncDirection, SyncStatus } from './entities/sync-log.entity';
import { OdooProductService } from '../odoo-integration/odoo-product.service';
import { ProductsService } from '../products/products.service';
import { Product, UomEnum } from '../products/entities/product.entity';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'uuid-001',
    partNumber: 'MP-001',
    productName: 'Test Product',
    brand: 'Brand',
    salesPrice: 100000,
    costPrice: 80000,
    uom: UomEnum.PCS,
    description: '',
    odooProductId: 1,
    lastSyncedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeOdooProduct(partNumber = 'MP-001') {
  return {
    odooProductId: 1,
    partNumber,
    productName: 'Test Product',
    brand: 'Brand',
    salesPrice: 100000,
    costPrice: 80000,
    uom: 'PCS',
    description: '',
  };
}

describe('SyncService', () => {
  let service: SyncService;
  let odooProductService: jest.Mocked<OdooProductService>;
  let productsService: jest.Mocked<ProductsService>;
  let syncLogRepo: { findAndCount: jest.Mock; create: jest.Mock; save: jest.Mock };

  beforeEach(async () => {
    syncLogRepo = {
      findAndCount: jest.fn(),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyncService,
        {
          provide: OdooProductService,
          useValue: {
            pullAllProducts: jest.fn(),
            pushProduct: jest.fn(),
          },
        },
        {
          provide: ProductsService,
          useValue: {
            upsertFromOdoo: jest.fn(),
            findAll: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SyncLog),
          useValue: syncLogRepo,
        },
      ],
    }).compile();

    service = module.get<SyncService>(SyncService);
    odooProductService = module.get(OdooProductService);
    productsService = module.get(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  /* ─── syncFromOdoo ─────────────────────────────────────────── */
  describe('syncFromOdoo', () => {
    it('returns SUCCESS when all products upsert without errors', async () => {
      const odooProducts = [makeOdooProduct('MP-001'), makeOdooProduct('MP-002')];
      odooProductService.pullAllProducts.mockResolvedValue(odooProducts);
      productsService.upsertFromOdoo.mockResolvedValue(makeProduct());

      const result = await service.syncFromOdoo();

      expect(result.direction).toBe(SyncDirection.PULL);
      expect(result.status).toBe(SyncStatus.SUCCESS);
      expect(result.recordsTotal).toBe(2);
      expect(result.recordsSuccess).toBe(2);
      expect(result.recordsFailed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('returns PARTIAL when some products fail to upsert', async () => {
      const odooProducts = [makeOdooProduct('MP-001'), makeOdooProduct('MP-FAIL')];
      odooProductService.pullAllProducts.mockResolvedValue(odooProducts);
      productsService.upsertFromOdoo
        .mockResolvedValueOnce(makeProduct())
        .mockRejectedValueOnce(new Error('Upsert failed'));

      const result = await service.syncFromOdoo();

      expect(result.status).toBe(SyncStatus.PARTIAL);
      expect(result.recordsSuccess).toBe(1);
      expect(result.recordsFailed).toBe(1);
      expect(result.errors[0].item).toBe('MP-FAIL');
    });

    it('returns FAILED and throws when Odoo pull itself throws', async () => {
      odooProductService.pullAllProducts.mockRejectedValue(
        new Error('Odoo unreachable'),
      );

      await expect(service.syncFromOdoo()).rejects.toThrow('Odoo unreachable');
      expect(syncLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SyncStatus.FAILED, direction: SyncDirection.PULL }),
      );
    });

    it('saves a sync log entry for every sync run', async () => {
      odooProductService.pullAllProducts.mockResolvedValue([makeOdooProduct()]);
      productsService.upsertFromOdoo.mockResolvedValue(makeProduct());

      await service.syncFromOdoo();

      expect(syncLogRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  /* ─── syncToOdoo ───────────────────────────────────────────── */
  describe('syncToOdoo', () => {
    it('returns SUCCESS when all products are pushed without errors', async () => {
      const products = [
        makeProduct({ partNumber: 'MP-001' }),
        makeProduct({ id: 'uuid-002', partNumber: 'MP-002' }),
      ];
      productsService.findAll.mockResolvedValue({ data: products, total: 2 });
      odooProductService.pushProduct.mockResolvedValue(undefined);

      const result = await service.syncToOdoo();

      expect(result.direction).toBe(SyncDirection.PUSH);
      expect(result.status).toBe(SyncStatus.SUCCESS);
      expect(result.recordsTotal).toBe(2);
      expect(result.recordsSuccess).toBe(2);
    });

    it('returns PARTIAL when some products fail to push', async () => {
      productsService.findAll.mockResolvedValue({
        data: [makeProduct(), makeProduct({ id: 'uuid-002', partNumber: 'MP-002' })],
        total: 2,
      });
      odooProductService.pushProduct
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Push failed'));

      const result = await service.syncToOdoo();

      expect(result.status).toBe(SyncStatus.PARTIAL);
      expect(result.recordsFailed).toBe(1);
    });

    it('returns FAILED and throws when fetching local products fails', async () => {
      productsService.findAll.mockRejectedValue(new Error('DB down'));

      await expect(service.syncToOdoo()).rejects.toThrow('DB down');
      expect(syncLogRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: SyncStatus.FAILED, direction: SyncDirection.PUSH }),
      );
    });
  });

  /* ─── getLogs ──────────────────────────────────────────────── */
  describe('getLogs', () => {
    it('returns paginated sync logs with correct meta', async () => {
      const logs: SyncLog[] = [
        {
          id: 'log-1',
          direction: SyncDirection.PULL,
          status: SyncStatus.SUCCESS,
          recordsTotal: 10,
          recordsSuccess: 10,
          recordsFailed: 0,
          errorDetails: null,
          startedAt: new Date(),
          finishedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      syncLogRepo.findAndCount.mockResolvedValue([logs, 1]);

      const result = await service.getLogs(1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('calculates totalPages correctly for multi-page results', async () => {
      syncLogRepo.findAndCount.mockResolvedValue([[], 25]);
      const result = await service.getLogs(1, 10);
      expect(result.totalPages).toBe(3);
    });
  });
});
