import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    // Login to get token
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    accessToken = loginRes.body.access_token as string;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health returns ok', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'ok');
      });
  });

  it('GET /api/products requires auth', () => {
    return request(app.getHttpServer()).get('/api/products').expect(401);
  });

  it('GET /api/products with auth returns paginated list', () => {
    return request(app.getHttpServer())
      .get('/api/products?page=1&pageSize=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.pagination).toHaveProperty('pageSize', 10);
      });
  });

  it('POST /api/products creates a product', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        partNumber: 'E2E-TEST-001',
        productName: 'E2E Test Product',
        brand: 'TestBrand',
        salesPrice: 100000,
        costPrice: 80000,
        uom: 'PCS',
      })
      .expect(201);

    expect(res.body.data).toHaveProperty('partNumber', 'E2E-TEST-001');

    // Cleanup
    await request(app.getHttpServer())
      .delete(`/api/products/${res.body.data.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
  });

  it('POST /api/products/bulk-update updates multiple products', async () => {
    // Create test product
    const createRes = await request(app.getHttpServer())
      .post('/api/products')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        partNumber: 'BULK-TEST-001',
        productName: 'Bulk Test Product',
        salesPrice: 50000,
        costPrice: 40000,
        uom: 'BOX',
      });

    const res = await request(app.getHttpServer())
      .post('/api/products/bulk-update')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        updates: [
          { partNumber: 'BULK-TEST-001', brand: 'UpdatedBrand' },
        ],
      })
      .expect(200);

    expect(res.body.data.summary.success).toBeGreaterThanOrEqual(1);

    // Cleanup
    await request(app.getHttpServer())
      .delete(`/api/products/${createRes.body.data.id}`)
      .set('Authorization', `Bearer ${accessToken}`);
  });
});
