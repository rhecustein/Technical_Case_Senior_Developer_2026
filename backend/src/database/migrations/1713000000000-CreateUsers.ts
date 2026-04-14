import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1713000000000 implements MigrationInterface {
  name = 'CreateUsers1713000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
        "username"     VARCHAR     NOT NULL,
        "passwordHash" VARCHAR     NOT NULL,
        "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "PK_users_id"      PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
