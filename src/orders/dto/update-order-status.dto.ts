import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum';

/** Fulfillment-only targets — customers cannot set these via JWT routes. */
export const FULFILLMENT_TARGET_STATUSES = [
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
] as const;

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: FULFILLMENT_TARGET_STATUSES,
    example: OrderStatus.SHIPPED,
    description: 'Next lifecycle state (PROCESSING → SHIPPED → DELIVERED only)',
  })
  @IsEnum(FULFILLMENT_TARGET_STATUSES, {
    message: `status must be one of: ${FULFILLMENT_TARGET_STATUSES.join(', ')}`,
  })
  status!: OrderStatus.SHIPPED | OrderStatus.DELIVERED;
}
