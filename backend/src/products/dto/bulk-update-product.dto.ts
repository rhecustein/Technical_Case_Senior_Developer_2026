import {
  IsArray,
  IsString,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UomEnum } from '../entities/product.entity';

export class BulkUpdateItemDto {
  @IsString()
  @IsNotEmpty()
  partNumber!: string;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  salesPrice?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @IsEnum(UomEnum)
  uom?: UomEnum;

  @IsOptional()
  @IsString()
  description?: string;
}

export class BulkUpdateProductDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateItemDto)
  updates!: BulkUpdateItemDto[];
}
