import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { SortOrder } from '../../common/enums/sort-order.enum';
import { OrderStatus } from '../enums/order-status.enum';

export const DEFAULT_SKIP = 0;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const DEFAULT_ORDER = SortOrder.DESC;

/**
 * Query envelope for `GET /orders`.
 *
 * Offset-based pagination only (skip + limit) — simple, matches SQL OFFSET,
 * and is sufficient for the dataset sizes this endpoint targets. Results are
 * always ordered by `createdAt` with direction `order`, plus an `id`
 * tiebreaker (handled in the service) for stable pages.
 */
export class GetOrdersQueryDto {
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter orders by lifecycle status',
  })
  @IsOptional()
  @IsEnum(OrderStatus, {
    message: `status must be one of: ${Object.values(OrderStatus).join(', ')}`,
  })
  status?: OrderStatus;

  @ApiPropertyOptional({
    minimum: 0,
    default: DEFAULT_SKIP,
    description: 'Number of rows to skip (SQL OFFSET)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'skip must be >= 0' })
  skip?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_LIMIT,
    default: DEFAULT_LIMIT,
    description: `Page size (capped at ${MAX_LIMIT})`,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'limit must be >= 1' })
  @Max(MAX_LIMIT, { message: `limit cannot exceed ${MAX_LIMIT}` })
  limit?: number;

  @ApiPropertyOptional({
    enum: SortOrder,
    default: DEFAULT_ORDER,
    description: 'Sort direction applied to createdAt',
  })
  @IsOptional()
  @IsEnum(SortOrder, {
    message: `order must be one of: ${Object.values(SortOrder).join(', ')}`,
  })
  order?: SortOrder;
}
