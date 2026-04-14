import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { UomEnum } from '../entities/product.entity';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  partNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  productName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  brand?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salesPrice!: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice!: number;

  @IsEnum(UomEnum)
  uom!: UomEnum;

  @IsOptional()
  @IsString()
  description?: string;
}
