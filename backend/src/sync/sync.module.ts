import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncLog } from './entities/sync-log.entity';
import { OdooIntegrationModule } from '../odoo-integration/odoo-integration.module';
import { ProductsModule } from '../products/products.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SyncLog]),
    OdooIntegrationModule,
    ProductsModule,
    AuthModule,
  ],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
