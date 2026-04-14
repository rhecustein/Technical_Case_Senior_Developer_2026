import { Module } from '@nestjs/common';
import { OdooClientService } from './odoo-client.service';
import { OdooProductService } from './odoo-product.service';

@Module({
  providers: [OdooClientService, OdooProductService],
  exports: [OdooClientService, OdooProductService],
})
export class OdooIntegrationModule {}
