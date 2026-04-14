import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum UomEnum {
  PCS = 'PCS',
  BOX = 'BOX',
  DOZEN = 'DOZEN',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ unique: true })
  partNumber!: string;

  @Column()
  productName!: string;

  @Column({ nullable: true })
  brand!: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  salesPrice!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  costPrice!: number;

  @Column({
    type: 'enum',
    enum: UomEnum,
    default: UomEnum.PCS,
  })
  uom!: UomEnum;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Index()
  @Column({ nullable: true, type: 'integer' })
  odooProductId!: number | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastSyncedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
