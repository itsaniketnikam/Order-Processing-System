import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  DEFAULT_LIMIT,
  DEFAULT_ORDER,
  DEFAULT_SKIP,
  GetOrdersQueryDto,
} from './dto/get-orders-query.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/paginated-orders-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place a new order for the authenticated customer' })
  @ApiCreatedResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({
    description:
      'Validation failed, item missing from inventory, or insufficient stock',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.createOrder(user.id, dto);
    return OrderResponseDto.fromEntity(order);
  }

  @Get()
  @ApiOperation({
    summary: "List the authenticated customer's orders (paginated)",
    description:
      'Returns a page of orders. Supports `?status=`, `?skip=`, `?limit=`, and `?order=ASC|DESC`. ' +
      'Results are ordered by `createdAt` in the requested direction.',
  })
  @ApiOkResponse({ type: PaginatedOrdersResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async list(
    @CurrentUser() user: User,
    @Query() query: GetOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const skip = query.skip ?? DEFAULT_SKIP;
    const limit = query.limit ?? DEFAULT_LIMIT;
    const order = query.order ?? DEFAULT_ORDER;

    const { data, total } = await this.ordersService.getOrders(user.id, {
      status: query.status,
      skip,
      limit,
      order,
    });

    return {
      data: data.map((o) => OrderResponseDto.fromEntity(o)),
      pagination: {
        skip,
        limit,
        total,
        hasNextPage: skip + data.length < total,
        hasPreviousPage: skip > 0,
      },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one of the customer’s orders by id' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order does not exist' })
  @ApiForbiddenResponse({ description: 'Order belongs to another customer' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async findOne(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.getOrderById(user.id, id);
    return OrderResponseDto.fromEntity(order);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel one of the customer’s own PENDING orders',
    description:
      'Transitions an order from PENDING to CANCELLED. Orders in any other ' +
      'state (PROCESSING, SHIPPED, DELIVERED, CANCELLED) cannot be cancelled.',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OrderResponseDto })
  @ApiBadRequestResponse({
    description: 'Order is not in PENDING state and cannot be cancelled',
  })
  @ApiNotFoundResponse({ description: 'Order does not exist' })
  @ApiForbiddenResponse({ description: 'Order belongs to another customer' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  async cancel(
    @CurrentUser() user: User,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersService.cancelOrder(user.id, id);
    return OrderResponseDto.fromEntity(order);
  }
}
