import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { User } from '../auth/entities/user.entity';
import { SyncLog } from '../sync/entities/sync-log.entity';

export function getDatabaseConfig(): TypeOrmModuleOptions {
  const isProduction = process.env['NODE_ENV'] === 'production';

  return {
    type: 'postgres',
    host: process.env['APP_DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['APP_DB_PORT'] ?? '5432', 10),
    username: process.env['APP_DB_USER'] ?? 'warehouse',
    password: process.env['APP_DB_PASSWORD'] ?? 'warehouse',
    database: process.env['APP_DB_NAME'] ?? 'warehouse_system',
    entities: [Product, User, SyncLog],
    // synchronize keeps existing schema up to date automatically
    // Migration files exist in database/migrations/ for documentation and manual runs
    synchronize: true,
    migrationsRun: false,
    migrations: [__dirname + '/../database/migrations/*.{ts,js}'],
    logging: !isProduction,
  };
}
