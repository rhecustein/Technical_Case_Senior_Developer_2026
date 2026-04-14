import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductRepository } from './product.repository';
import { Product, UomEnum } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

/** Build a partial Product mock with sensible defaults. */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'uuid-001',
    partNumber: 'MP-001',
    productName: 'Test Product',
    brand: 'TestBrand',
    salesPrice: 100000,
    costPrice: 80000,
    uom: UomEnum.PCS,
    description: 'Test description',
    odooProductId: null,
    lastSyncedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

type MockProductRepo = Partial<Record<keyof ProductRepository, jest.Mock>>;

function createMockProductRepository(): MockProductRepo {
  return {
    findPaginated: jest.fn(),
    findById: jest.fn(),
    findByPartNumber: jest.fn(),
    findByOdooId: jest.fn(),
    findAll: jest.fn(),
    build: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };
}

describe('ProductsService', () => {
  let service: ProductsService;
  let repo: MockProductRepo;

  beforeEach(async () => {
    repo = createMockProductRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductRepository, useValue: repo },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  afterEach(() => jest.clearAllMocks());

  /* ─── findAll ──────────────────────────────────────────────── */
  describe('findAll', () => {
    it('returns paginated products and total count', async () => {
      const products = [makeProduct()];
      repo.findPaginated!.mockResolvedValue({ data: products, total: 1 });

      const result = await service.findAll({ page: 1, pageSize: 10, sortOrder: 'DESC' });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repo.findPaginated).toHaveBeenCalledWith({ page: 1, pageSize: 10, sortOrder: 'DESC' });
    });

    it('returns empty list when no products exist', async () => {
      repo.findPaginated!.mockResolvedValue({ data: [], total: 0 });

      const result = await service.findAll({ page: 1, pageSize: 10, sortOrder: 'DESC' });

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  /* ─── findOne ──────────────────────────────────────────────── */
  describe('findOne', () => {
    it('returns product when found', async () => {
      const product = makeProduct();
      repo.findById!.mockResolvedValue(product);

      const result = await service.findOne('uuid-001');

      expect(result).toEqual(product);
      expect(repo.findById).toHaveBeenCalledWith('uuid-001');
    });

    it('throws NotFoundException when product does not exist', async () => {
      repo.findById!.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  /* ─── findByPartNumber ─────────────────────────────────────── */
  describe('findByPartNumber', () => {
    it('returns product when part number exists', async () => {
      const product = makeProduct();
      repo.findByPartNumber!.mockResolvedValue(product);

      const result = await service.findByPartNumber('MP-001');
      expect(result).toEqual(product);
    });

    it('returns null when part number does not exist', async () => {
      repo.findByPartNumber!.mockResolvedValue(null);
      const result = await service.findByPartNumber('MISSING');
      expect(result).toBeNull();
    });
  });

  /* ─── create ───────────────────────────────────────────────── */
  describe('create', () => {
    const dto: CreateProductDto = {
      partNumber: 'MP-NEW',
      productName: 'New Product',
      salesPrice: 100000,
      costPrice: 80000,
      uom: UomEnum.PCS,
    };

    it('creates and returns a new product', async () => {
      repo.findByPartNumber!.mockResolvedValue(null);
      const created = makeProduct({ partNumber: 'MP-NEW' });
      repo.build!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result.partNumber).toBe('MP-NEW');
      expect(repo.build).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalledWith(created);
    });

    it('throws ConflictException when part number already exists', async () => {
      repo.findByPartNumber!.mockResolvedValue(makeProduct());

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  /* ─── update ───────────────────────────────────────────────── */
  describe('update', () => {
    it('updates and returns the modified product', async () => {
      const product = makeProduct();
      repo.findById!.mockResolvedValue(product);
      repo.save!.mockResolvedValue({ ...product, productName: 'Updated' });

      const dto: UpdateProductDto = { productName: 'Updated' };
      const result = await service.update('uuid-001', dto);

      expect(result.productName).toBe('Updated');
      expect(repo.save).toHaveBeenCalled();
    });

    it('throws NotFoundException when product to update does not exist', async () => {
      repo.findById!.mockResolvedValue(null);

      await expect(
        service.update('missing', { productName: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException when new partNumber is already taken', async () => {
      const existing = makeProduct({ id: 'uuid-001', partNumber: 'MP-001' });
      const conflict = makeProduct({ id: 'uuid-002', partNumber: 'MP-TAKEN' });

      repo.findById!.mockResolvedValue(existing);
      repo.findByPartNumber!.mockResolvedValue(conflict);

      await expect(
        service.update('uuid-001', { partNumber: 'MP-TAKEN' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  /* ─── remove ───────────────────────────────────────────────── */
  describe('remove', () => {
    it('removes the product successfully', async () => {
      const product = makeProduct();
      repo.findById!.mockResolvedValue(product);
      repo.remove!.mockResolvedValue(undefined);

      await expect(service.remove('uuid-001')).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(product);
    });

    it('throws NotFoundException if product does not exist', async () => {
      repo.findById!.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });

  /* ─── bulkUpdate ───────────────────────────────────────────── */
  describe('bulkUpdate', () => {
    it('updates found products and records errors for missing ones', async () => {
      const found = makeProduct({ partNumber: 'MP-001' });
      const saved = { ...found, salesPrice: 200000 };

      repo.findByPartNumber!
        .mockResolvedValueOnce(found)
        .mockResolvedValueOnce(null);
      repo.save!.mockResolvedValue(saved);

      const result = await service.bulkUpdate([
        { partNumber: 'MP-001', salesPrice: 200000 },
        { partNumber: 'MP-999', salesPrice: 50000 },
      ]);

      expect(result.updated).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].partNumber).toBe('MP-999');
      expect(result.errors[0].error).toBe('Product not found');
    });

    it('captures repository errors per item without aborting batch', async () => {
      repo.findByPartNumber!.mockRejectedValue(new Error('DB error'));

      const result = await service.bulkUpdate([{ partNumber: 'MP-001' }]);

      expect(result.updated).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('DB error');
    });
  });

  /* ─── upsertFromOdoo ───────────────────────────────────────── */
  describe('upsertFromOdoo', () => {
    const odooData = {
      odooProductId: 42,
      partNumber: 'MP-042',
      productName: 'Odoo Product',
      brand: 'OdooBrand',
      salesPrice: 500000,
      costPrice: 400000,
      uom: 'PCS',
      description: 'From Odoo',
    };

    it('creates a new product when odooProductId does not exist locally', async () => {
      repo.findByOdooId!.mockResolvedValue(null);
      const created = makeProduct({ odooProductId: 42 });
      repo.build!.mockReturnValue(created);
      repo.save!.mockResolvedValue(created);

      const result = await service.upsertFromOdoo(odooData);

      expect(repo.build).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.odooProductId).toBe(42);
    });

    it('updates an existing product when odooProductId already exists', async () => {
      const existing = makeProduct({ odooProductId: 42, partNumber: 'MP-042-OLD' });
      repo.findByOdooId!.mockResolvedValue(existing);
      repo.save!.mockResolvedValue({ ...existing, partNumber: 'MP-042' });

      const result = await service.upsertFromOdoo(odooData);

      expect(repo.build).not.toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.partNumber).toBe('MP-042');
    });

    it('normalizes BOX and DOZEN uom values correctly', async () => {
      repo.findByOdooId!.mockResolvedValue(null);
      const built = makeProduct({ uom: UomEnum.BOX });
      repo.build!.mockReturnValue(built);
      repo.save!.mockResolvedValue(built);

      await service.upsertFromOdoo({ ...odooData, uom: 'box' });

      const buildCall = repo.build!.mock.calls[0][0] as Partial<Product>;
      expect(buildCall.uom).toBe(UomEnum.BOX);
    });
  });
});
