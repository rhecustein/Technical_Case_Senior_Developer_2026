import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProducts1713000001000 implements MigrationInterface {
  name = 'CreateProducts1713000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "products_uom_enum" AS ENUM ('PCS', 'BOX', 'DOZEN')
    `);

    await queryRunner.query(`
      CREATE TABLE "products" (
        "id"            UUID              NOT NULL DEFAULT gen_random_uuid(),
        "partNumber"    VARCHAR           NOT NULL,
        "productName"   VARCHAR           NOT NULL,
        "brand"         VARCHAR,
        "salesPrice"    NUMERIC(15, 2)    NOT NULL DEFAULT '0',
        "costPrice"     NUMERIC(15, 2)    NOT NULL DEFAULT '0',
        "uom"           "products_uom_enum" NOT NULL DEFAULT 'PCS',
        "description"   TEXT,
        "odooProductId" INTEGER,
        "lastSyncedAt"  TIMESTAMP,
        "createdAt"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ       NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_products_partNumber" UNIQUE ("partNumber"),
        CONSTRAINT "PK_products_id"         PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_products_partNumber"    ON "products" ("partNumber")`);
    await queryRunner.query(`CREATE INDEX "IDX_products_odooProductId" ON "products" ("odooProductId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_products_odooProductId"`);
    await queryRunner.query(`DROP INDEX "IDX_products_partNumber"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "products_uom_enum"`);
  }
}
