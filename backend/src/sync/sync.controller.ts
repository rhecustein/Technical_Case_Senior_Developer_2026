import { Controller, Get, Post, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SyncService, SyncResult } from './sync.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { SyncLog } from './entities/sync-log.entity';

@ApiTags('sync')
@ApiBearerAuth('access-token')
@Controller('sync')
@UseGuards(AuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  /**
   * Trigger a full pull sync from Odoo.
   * Fetches all products via paginated JSON-RPC and upserts them into the local DB.
   * Returns a SyncResult with totals and per-item error details.
   */
  @Post('pull')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pull products from Odoo into local database' })
  @ApiResponse({ status: 200, description: 'Sync result with totals and errors' })
  pullFromOdoo(): Promise<SyncResult> {
    return this.syncService.syncFromOdoo();
  }

  /**
   * Trigger a full push sync to Odoo.
   * Sends all local products to Odoo via JSON-RPC write/create calls.
   * Returns a SyncResult with totals and per-item error details.
   */
  @Post('push')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Push local products to Odoo' })
  @ApiResponse({ status: 200, description: 'Sync result with totals and errors' })
  pushToOdoo(): Promise<SyncResult> {
    return this.syncService.syncToOdoo();
  }

  /**
   * Retrieve paginated sync activity logs ordered by most recent first.
   * Useful for auditing pull/push history, error investigation, and the dashboard.
   */
  @Get('logs')
  @ApiOperation({ summary: 'Get sync activity logs with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Sync logs retrieved' })
  getLogs(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ): Promise<{ data: SyncLog[]; total: number; page: number; pageSize: number; totalPages: number }> {
    return this.syncService.getLogs(Number(page), Number(pageSize));
  }
}
