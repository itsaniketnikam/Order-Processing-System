import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Order } from '../entities/order.entity';
import { OrderStatus } from '../enums/order-status.enum';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: 160000 })
  totalAmount!: number;

  @ApiPropertyOptional({
    type: [OrderItemResponseDto],
    description: 'Populated only when the order is fetched with relations',
  })
  items?: OrderItemResponseDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  /**
   * Maps an Order entity to its DTO. If `order.items` was loaded by the
   * caller (e.g. via `relations: ['items']`), they are included; otherwise
   * the field is omitted so list endpoints stay lean.
   */
  static fromEntity(order: Order): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = order.id;
    dto.customerId = order.customerId;
    dto.status = order.status;
    dto.totalAmount = Number(order.totalAmount);
    if (order.items) {
      dto.items = order.items.map((item) =>
        OrderItemResponseDto.fromEntity(item),
      );
    }
    dto.createdAt = order.createdAt;
    dto.updatedAt = order.updatedAt;
    return dto;
  }
}
