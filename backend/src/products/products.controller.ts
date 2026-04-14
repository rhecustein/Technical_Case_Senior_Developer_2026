import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { OdooProductService } from '../odoo-integration/odoo-product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { BulkUpdateProductDto } from './dto/bulk-update-product.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { PaginatedResponse } from '../common/interfaces/api-response.interface';
import { Product } from './entities/product.entity';

@ApiTags('products')
@ApiBearerAuth('access-token')
@Controller('products')
@UseGuards(AuthGuard)
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly odooProductService: OdooProductService,
  ) {}

  /**
   * List all products with optional search, sort, and pagination.
   * Responds with a paginated envelope including `pagination` meta.
   */
  @Get()
  @ApiOperation({ summary: 'List all products with pagination' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
  async findAll(@Query() query: PaginationQueryDto): Promise<PaginatedResponse<Product>> {
    const { data, total } = await this.productsService.findAll(query);
    const totalPages = Math.ceil(total / query.pageSize);

    return {
      success: true,
      data,
      message: 'Products retrieved successfully',
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * Get a single product by its UUID.
   * Returns 404 if the product does not exist.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  /**
   * Create a new product in the in-house database.
   * Data is always saved locally first — Odoo sync is attempted after.
   * The response includes `odooSynced` and optional `odooError` so the
   * frontend can notify the user of sync failures without blocking the save.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new product' })
  @ApiResponse({ status: 201, description: 'Product created (Odoo sync status included)' })
  @ApiResponse({ status: 409, description: 'Part number already exists' })
  async create(@Body() dto: CreateProductDto): Promise<Product & { odooSynced: boolean; odooError?: string }> {
    const product = await this.productsService.create(dto);
    let odooSynced = false;
    let odooError: string | undefined;
    try {
      const odooId = await this.odooProductService.pushProduct(product);
      odooSynced = true;
      if (!product.odooProductId) {
        await this.productsService.setOdooId(product.id, odooId);
        product.odooProductId = odooId;
        product.lastSyncedAt = new Date();
      }
    } catch (err) {
      odooError = err instanceof Error ? err.message : 'Odoo sync failed';
      this.logger.warn(`Odoo push failed for new product ${product.partNumber}: ${odooError}`);
    }
    return Object.assign(product, { odooSynced, ...(odooError ? { odooError } : {}) });
  }

  /**
   * Update a product by ID.
   * Data is always saved locally first — Odoo sync is attempted after.
   * The response includes `odooSynced` and optional `odooError`.
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiResponse({ status: 200, description: 'Product updated (Odoo sync status included)' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @ApiResponse({ status: 409, description: 'Part number already in use' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<Product & { odooSynced: boolean; odooError?: string }> {
    const product = await this.productsService.update(id, dto);
    let odooSynced = false;
    let odooError: string | undefined;
    try {
      const odooId = await this.odooProductService.pushProduct(product);
      odooSynced = true;
      if (!product.odooProductId) {
        await this.productsService.setOdooId(product.id, odooId);
        product.odooProductId = odooId;
        product.lastSyncedAt = new Date();
      }
    } catch (err) {
      odooError = err instanceof Error ? err.message : 'Odoo sync failed';
      this.logger.warn(`Odoo push failed for updated product ${product.partNumber}: ${odooError}`);
    }
    return Object.assign(product, { odooSynced, ...(odooError ? { odooError } : {}) });
  }

  /**
   * Delete a product by ID.
   * Returns 204 No Content on success.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a product' })
  @ApiResponse({ status: 204, description: 'Product deleted' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }

  /**
   * Bulk update multiple products identified by `partNumber`.
   * Each item is processed independently — failures are captured in `errors[]`
   * without blocking the rest of the batch.
   * Successfully updated products are pushed to Odoo asynchronously.
   */
  @Post('bulk-update')
  @ApiOperation({ summary: 'Bulk update multiple products by part number' })
  @ApiResponse({ status: 200, description: 'Bulk update result with per-item status' })
  async bulkUpdate(@Body() dto: BulkUpdateProductDto): Promise<{
    success: boolean;
    data: {
      updated: Product[];
      errors: Array<{ partNumber: string; error: string }>;
      summary: { total: number; success: number; failed: number };
    };
    message: string;
  }> {
    const { updated, errors } = await this.productsService.bulkUpdate(dto.updates);

    if (updated.length > 0) {
      this.odooProductService.bulkPushProducts(updated).catch((err: Error) => {
        this.logger.warn(`Async Odoo bulk push failed: ${err.message}`);
      });
    }

    return {
      success: errors.length === 0,
      data: {
        updated,
        errors,
        summary: {
          total: dto.updates.length,
          success: updated.length,
          failed: errors.length,
        },
      },
      message: `Bulk update: ${updated.length} updated, ${errors.length} failed`,
    };
  }
}
