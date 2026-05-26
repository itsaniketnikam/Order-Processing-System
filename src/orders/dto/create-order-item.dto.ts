import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'iPhone 16', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  productName!: string;

  @ApiProperty({ example: 2, minimum: 1, description: 'Must be > 0' })
  @IsInt()
  @Min(1, { message: 'quantity must be greater than 0' })
  quantity!: number;

  @ApiProperty({ example: 80000, minimum: 0.01, description: 'Must be > 0' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'price must be greater than 0' })
  price!: number;
}
