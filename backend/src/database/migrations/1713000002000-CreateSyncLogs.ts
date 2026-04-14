import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSyncLogs1713000002000 implements MigrationInterface {
  name = 'CreateSyncLogs1713000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "sync_logs_direction_enum" AS ENUM ('PULL', 'PUSH')
    `);

    await queryRunner.query(`
      CREATE TYPE "sync_logs_status_enum" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED')
    `);

    await queryRunner.query(`
      CREATE TABLE "sync_logs" (
        "id"             UUID                       NOT NULL DEFAULT gen_random_uuid(),
        "direction"      "sync_logs_direction_enum" NOT NULL,
        "status"         "sync_logs_status_enum"    NOT NULL,
        "recordsTotal"   INTEGER                    NOT NULL DEFAULT 0,
        "recordsSuccess" INTEGER                    NOT NULL DEFAULT 0,
        "recordsFailed"  INTEGER                    NOT NULL DEFAULT 0,
        "errorDetails"   JSONB,
        "startedAt"      TIMESTAMP                  NOT NULL,
        "finishedAt"     TIMESTAMP,
        "createdAt"      TIMESTAMPTZ                NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sync_logs_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_sync_logs_direction"  ON "sync_logs" ("direction")`);
    await queryRunner.query(`CREATE INDEX "IDX_sync_logs_startedAt"  ON "sync_logs" ("startedAt" DESC)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_sync_logs_startedAt"`);
    await queryRunner.query(`DROP INDEX "IDX_sync_logs_direction"`);
    await queryRunner.query(`DROP TABLE "sync_logs"`);
    await queryRunner.query(`DROP TYPE "sync_logs_status_enum"`);
    await queryRunner.query(`DROP TYPE "sync_logs_direction_enum"`);
  }
}
