import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({
    type: [CreateOrderItemDto],
    minItems: 1,
    description: 'Line items in this order. Must contain at least one entry.',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'items must contain at least 1 element' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
