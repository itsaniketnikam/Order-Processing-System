import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 0, description: 'Rows skipped (SQL OFFSET)' })
  skip!: number;

  @ApiProperty({ example: 20, description: 'Page size used for this query' })
  limit!: number;

  @ApiProperty({ example: 250, description: 'Total rows matching the filter' })
  total!: number;

  @ApiProperty({ example: true })
  hasNextPage!: boolean;

  @ApiProperty({ example: false })
  hasPreviousPage!: boolean;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  data!: OrderResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  pagination!: PaginationMetaDto;
}
