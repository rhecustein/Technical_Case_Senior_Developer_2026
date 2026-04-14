import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum SyncDirection {
  PULL = 'PULL',
  PUSH = 'PUSH',
}

export enum SyncStatus {
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

@Entity('sync_logs')
export class SyncLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: SyncDirection })
  direction!: SyncDirection;

  @Column({ type: 'enum', enum: SyncStatus })
  status!: SyncStatus;

  @Column({ default: 0 })
  recordsTotal!: number;

  @Column({ default: 0 })
  recordsSuccess!: number;

  @Column({ default: 0 })
  recordsFailed!: number;

  @Column({ type: 'jsonb', nullable: true })
  errorDetails!: Record<string, unknown>[] | null;

  @Column({ type: 'timestamp' })
  startedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
