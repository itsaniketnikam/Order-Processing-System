import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminApiKeyGuard } from '../common/guards/admin-api-key.guard';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

/**
 * Fulfillment-facing routes — no JWT. Protected by a shared admin API key
 * so warehouse / internal tooling can advance orders without a customer login.
 */
@ApiTags('orders-fulfillment')
@Controller('orders')
export class OrdersFulfillmentController {
  constructor(private readonly ordersService: OrdersService) {}

  @Patch(':id/status')
  @UseGuards(AdminApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Advance order status (fulfillment / admin)',
    description:
      'Promotes an order along the fulfillment pipeline. Allowed transitions: ' +
      '`PROCESSING → SHIPPED → DELIVERED`. Requires `X-Admin-Key` header — ' +
      'not a customer JWT route.',
  })
  @ApiHeader({
    name: 'X-Admin-Key',
    description: 'Shared fulfillment secret (ADMIN_API_KEY env var)',
    required: true,
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid status transition for the current order state',
  })
  @ApiNotFoundResponse({ description: 'Order does not exist' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing X-Admin-Key' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.updateOrderStatus(id, dto.status);
    return OrderResponseDto.fromEntity(order);
  }
}
