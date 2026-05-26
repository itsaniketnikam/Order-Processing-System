import { ApiProperty } from '@nestjs/swagger';
import { OrderItem } from '../entities/order-item.entity';

export class OrderItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'iPhone 16' })
  productName!: string;

  @ApiProperty({ example: 2 })
  quantity!: number;

  @ApiProperty({ example: 80000 })
  price!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  static fromEntity(item: OrderItem): OrderItemResponseDto {
    const dto = new OrderItemResponseDto();
    dto.id = item.id;
    dto.productName = item.productName;
    dto.quantity = item.quantity;
    dto.price = Number(item.price);
    dto.createdAt = item.createdAt;
    return dto;
  }
}
