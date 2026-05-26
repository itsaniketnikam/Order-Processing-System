import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { SortOrder } from '../common/enums/sort-order.enum';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderItemDto } from './dto/create-order-item.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';

/** Valid fulfillment transitions enforced by updateOrderStatus. */
const FULFILLMENT_TRANSITIONS: Readonly<
  Partial<Record<OrderStatus, OrderStatus>>
> = {
  [OrderStatus.PROCESSING]: OrderStatus.SHIPPED,
  [OrderStatus.SHIPPED]: OrderStatus.DELIVERED,
};

interface InventoryItem {
  productName: string;
  availableQuantity: number;
  price: number;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  /**
   * Temporary in-memory inventory backing item-availability checks.
   * Swap with a real ProductsModule / external service when one exists.
   */
  private readonly inventory: ReadonlyArray<InventoryItem> = [
    { productName: 'iPhone 16', availableQuantity: 5, price: 80000 },
    { productName: 'AirPods Pro', availableQuantity: 0, price: 20000 },
    { productName: 'MacBook Pro', availableQuantity: 3, price: 150000 },
  ];

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Create a new order in a single ACID transaction:
   *   1. Validate the items against inventory (no DB writes, fail-fast).
   *   2. Calculate the total.
   *   3. Inside a transaction, persist the Order, then its OrderItems.
   *
   * Any error after the Order is inserted rolls the row back automatically
   * so we never leave an empty order in the DB.
   */
  async createOrder(customerId: string, dto: CreateOrderDto): Promise<Order> {
    this.validateAvailability(dto.items);

    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    const savedOrder = await this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {
        customerId,
        status: OrderStatus.PENDING,
        totalAmount,
      });
      const persistedOrder = await manager.save(order);

      const items = dto.items.map((item) =>
        manager.create(OrderItem, {
          orderId: persistedOrder.id,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        }),
      );
      const persistedItems = await manager.save(items);

      persistedOrder.items = persistedItems;
      return persistedOrder;
    });

    this.logger.log(
      `Order created id=${savedOrder.id} customer=${customerId} total=${totalAmount}`,
    );
    return savedOrder;
  }

  /**
   * Paginated list of orders for a single customer.
   *
   * Offset-based pagination: `skip` rows are dropped, then `limit` rows are
   * returned. Results are ordered by `createdAt` in the requested direction,
   * with an `id ASC` tiebreaker so pages stay stable when two orders share
   * the same timestamp.
   *
   * Uses `findAndCount` to fetch the page and the total in the same round
   * trip, which is what makes the pagination metadata trustworthy under a
   * changing filter.
   */
  async getOrders(
    customerId: string,
    options: {
      status?: OrderStatus;
      skip: number;
      limit: number;
      order: SortOrder;
    },
  ): Promise<{ data: Order[]; total: number }> {
    const { status, skip, limit, order } = options;

    const [data, total] = await this.ordersRepository.findAndCount({
      where: {
        customerId,
        ...(status ? { status } : {}),
      },
      order: { createdAt: order, id: 'ASC' },
      skip,
      take: limit,
    });

    return { data, total };
  }

  /**
   * Fetch a single order including its line items.
   *
   * Throws:
   *   - NotFoundException if no row matches the id
   *   - ForbiddenException if the row belongs to a different customer
   *     (intentionally distinguishable from 404 per the spec)
   */
  async getOrderById(customerId: string, orderId: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }
    if (order.customerId !== customerId) {
      throw new ForbiddenException('You can only access your own orders');
    }

    return order;
  }

  /**
   * Cancel an order on behalf of its owner.
   *
   * Business rules:
   *   - Only the customer who placed the order can cancel it (else 403).
   *   - Only PENDING orders are cancellable. Anything further along the
   *     pipeline (PROCESSING / SHIPPED / DELIVERED / already CANCELLED) is
   *     a 400 — the operation is invalid for that state, not an auth issue.
   *
   * Returns the updated order (with line items loaded) so the caller can
   * echo the new state straight back to the client.
   */
  async cancelOrder(customerId: string, orderId: string): Promise<Order> {
    const order = await this.getOrderById(customerId, orderId);

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Order in status "${order.status}" cannot be cancelled. ` +
          `Only PENDING orders can be cancelled.`,
      );
    }

    order.status = OrderStatus.CANCELLED;
    const saved = await this.ordersRepository.save(order);

    this.logger.log(`Order cancelled id=${saved.id} customer=${customerId}`);
    return saved;
  }

  /**
   * Fulfillment entry point: advance an order one step along the pipeline.
   *
   * Allowed transitions (strictly forward-only):
   *   PROCESSING → SHIPPED → DELIVERED
   *
   * Protected at the HTTP layer by AdminApiKeyGuard — no customer ownership
   * check because warehouse staff act on any order id.
   */
  async updateOrderStatus(
    orderId: string,
    targetStatus: OrderStatus.SHIPPED | OrderStatus.DELIVERED,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with id "${orderId}" not found`);
    }

    const expectedNext = FULFILLMENT_TRANSITIONS[order.status];
    if (expectedNext !== targetStatus) {
      throw new BadRequestException(
        `Cannot transition order from "${order.status}" to "${targetStatus}". ` +
          (expectedNext
            ? `Expected next status is "${expectedNext}".`
            : 'No further fulfillment transitions are allowed.'),
      );
    }

    order.status = targetStatus;
    const saved = await this.ordersRepository.save(order);

    this.logger.log(
      `Order status updated id=${saved.id} status=${targetStatus}`,
    );
    return saved;
  }

  /**
   * Background-job entry point: bulk-promote every PENDING order to
   * PROCESSING in a single UPDATE statement.
   *
   * Implementation notes:
   *   - We use `.update()` instead of fetching rows first so the work stays
   *     O(1) round trips regardless of how many orders are pending.
   *   - The WHERE clause is narrowed to status=PENDING so terminal states
   *     (CANCELLED / SHIPPED / DELIVERED) are never touched even if a future
   *     caller mis-uses this method.
   *   - Returns the affected row count so the scheduler can log meaningful
   *     metrics ("processed N orders").
   */
  async processPendingOrders(): Promise<number> {
    const result = await this.ordersRepository.update(
      { status: OrderStatus.PENDING },
      { status: OrderStatus.PROCESSING },
    );

    const affected = result.affected ?? 0;
    if (affected > 0) {
      this.logger.log(
        `Promoted ${affected} order(s) from PENDING to PROCESSING`,
      );
    }
    return affected;
  }

  /**
   * Validates a set of order items against the temporary in-memory inventory.
   * Aggregates by productName first so two separate lines for the same
   * product still count toward the same stock pool.
   *
   * Throws BadRequestException for:
   *   - unknown product
   *   - zero availability (out of stock)
   *   - aggregate requested quantity exceeds availability
   */
  private validateAvailability(items: CreateOrderItemDto[]): void {
    const requestedByProduct = new Map<string, number>();
    for (const item of items) {
      requestedByProduct.set(
        item.productName,
        (requestedByProduct.get(item.productName) ?? 0) + item.quantity,
      );
    }

    for (const [productName, requestedQty] of requestedByProduct) {
      const stock = this.inventory.find((i) => i.productName === productName);

      if (!stock) {
        throw new BadRequestException(
          `Item "${productName}" does not exist in inventory`,
        );
      }
      if (stock.availableQuantity === 0) {
        throw new BadRequestException(`Item "${productName}" is out of stock`);
      }
      if (requestedQty > stock.availableQuantity) {
        throw new BadRequestException(
          `Requested quantity (${requestedQty}) exceeds available stock ` +
            `(${stock.availableQuantity}) for "${productName}"`,
        );
      }
    }
  }
}
