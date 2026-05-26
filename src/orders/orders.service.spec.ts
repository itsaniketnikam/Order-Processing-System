import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderStatus } from './enums/order-status.enum';
import { OrdersService } from './orders.service';

/**
 * Lightweight Repository mock - only the methods the service actually calls
 * are typed in. Keeps tests focused without re-typing the whole TypeORM API.
 */
type MockRepo = {
  findOne: jest.Mock;
  findAndCount: jest.Mock;
  save: jest.Mock;
  update: jest.Mock;
};

const buildRepoMock = (): MockRepo => ({
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
});

/**
 * Mocks a DataSource whose `transaction(cb)` immediately invokes `cb` with a
 * fake EntityManager. `manager.create` echoes the input, `manager.save`
 * returns it back (assigning an id when missing) so the service code path is
 * fully exercised without a real DB.
 */
const buildDataSourceMock = (): {
  dataSource: DataSource;
  manager: EntityManager;
  transactionMock: jest.Mock;
} => {
  let counter = 0;
  const manager = {
    create: jest.fn((_entity: unknown, payload: unknown) => payload),
    save: jest.fn((entityOrArray: unknown) => {
      if (Array.isArray(entityOrArray)) {
        return entityOrArray.map((e: Record<string, unknown>) => ({
          id: `item-${++counter}`,
          ...e,
        }));
      }
      const e = entityOrArray as Record<string, unknown>;
      return { id: `order-${++counter}`, ...e };
    }),
  } as unknown as EntityManager;

  // Hoisted so assertions can reference the mock directly without going
  // through `dataSource.transaction` (avoids `unbound-method` lint).
  const transactionMock = jest.fn(
    <T>(cb: (m: EntityManager) => Promise<T>): Promise<T> => cb(manager),
  );

  const dataSource = {
    transaction: transactionMock,
  } as unknown as DataSource;

  return { dataSource, manager, transactionMock };
};

const CUSTOMER_ID = '11111111-1111-1111-1111-111111111111';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: MockRepo;
  let dataSource: DataSource;
  let transactionMock: jest.Mock;

  beforeEach(async () => {
    ordersRepo = buildRepoMock();
    ({ dataSource, transactionMock } = buildDataSourceMock());

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(OrdersService);
  });

  // -----------------------------------------------------------------------
  // createOrder
  // -----------------------------------------------------------------------
  describe('createOrder', () => {
    it('persists the order + line items and returns the saved aggregate', async () => {
      const dto: CreateOrderDto = {
        items: [
          { productName: 'iPhone 16', quantity: 2, price: 80000 },
          { productName: 'MacBook Pro', quantity: 1, price: 150000 },
        ],
      };

      const result = await service.createOrder(CUSTOMER_ID, dto);

      // transaction was used for atomicity
      expect(transactionMock).toHaveBeenCalledTimes(1);

      expect(result).toMatchObject({
        customerId: CUSTOMER_ID,
        status: OrderStatus.PENDING,
        totalAmount: 80000 * 2 + 150000,
      });
      expect(result.items).toHaveLength(2);
      expect(result.items?.[0]).toMatchObject({
        productName: 'iPhone 16',
        quantity: 2,
        price: 80000,
      });
    });

    it('rejects items that are not present in the inventory', async () => {
      const dto: CreateOrderDto = {
        items: [{ productName: 'Unknown Phone', quantity: 1, price: 100 }],
      };

      await expect(service.createOrder(CUSTOMER_ID, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.createOrder(CUSTOMER_ID, dto)).rejects.toThrow(
        /does not exist in inventory/,
      );
      expect(transactionMock).not.toHaveBeenCalled();
    });

    it('rejects items that are out of stock', async () => {
      const dto: CreateOrderDto = {
        items: [{ productName: 'AirPods Pro', quantity: 1, price: 20000 }],
      };

      await expect(service.createOrder(CUSTOMER_ID, dto)).rejects.toThrow(
        /out of stock/,
      );
    });

    it('rejects items whose requested quantity exceeds available stock', async () => {
      const dto: CreateOrderDto = {
        items: [{ productName: 'iPhone 16', quantity: 999, price: 80000 }],
      };

      await expect(service.createOrder(CUSTOMER_ID, dto)).rejects.toThrow(
        /exceeds available stock/,
      );
    });

    it('aggregates duplicate product lines when validating availability', async () => {
      // iPhone 16 stock is 5; two lines for 3 each = 6 total -> should fail.
      const dto: CreateOrderDto = {
        items: [
          { productName: 'iPhone 16', quantity: 3, price: 80000 },
          { productName: 'iPhone 16', quantity: 3, price: 80000 },
        ],
      };

      await expect(service.createOrder(CUSTOMER_ID, dto)).rejects.toThrow(
        /exceeds available stock/,
      );
    });
  });

  // -----------------------------------------------------------------------
  // cancelOrder
  // -----------------------------------------------------------------------
  describe('cancelOrder', () => {
    const ORDER_ID = '22222222-2222-2222-2222-222222222222';

    const pendingOrder = (): Order =>
      ({
        id: ORDER_ID,
        customerId: CUSTOMER_ID,
        status: OrderStatus.PENDING,
        totalAmount: 100,
        items: [] as OrderItem[],
      }) as Order;

    it('transitions a PENDING order to CANCELLED and persists it', async () => {
      const order = pendingOrder();
      ordersRepo.findOne.mockResolvedValue(order);
      ordersRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const result = await service.cancelOrder(CUSTOMER_ID, ORDER_ID);

      expect(result.status).toBe(OrderStatus.CANCELLED);
      expect(ordersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ORDER_ID,
          status: OrderStatus.CANCELLED,
        }),
      );
    });

    it('throws NotFoundException when the order does not exist', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      await expect(service.cancelOrder(CUSTOMER_ID, ORDER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the order belongs to another customer', async () => {
      const order = pendingOrder();
      order.customerId = 'someone-else';
      ordersRepo.findOne.mockResolvedValue(order);

      await expect(service.cancelOrder(CUSTOMER_ID, ORDER_ID)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it.each([
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ])('rejects cancelling an order in %s status', async (status) => {
      const order = pendingOrder();
      order.status = status;
      ordersRepo.findOne.mockResolvedValue(order);

      await expect(service.cancelOrder(CUSTOMER_ID, ORDER_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(ordersRepo.save).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // updateOrderStatus (fulfillment)
  // -----------------------------------------------------------------------
  describe('updateOrderStatus', () => {
    const ORDER_ID = '33333333-3333-3333-3333-333333333333';

    const orderWithStatus = (status: OrderStatus): Order =>
      ({
        id: ORDER_ID,
        customerId: CUSTOMER_ID,
        status,
        totalAmount: 100,
        items: [] as OrderItem[],
      }) as Order;

    it('transitions PROCESSING to SHIPPED', async () => {
      const order = orderWithStatus(OrderStatus.PROCESSING);
      ordersRepo.findOne.mockResolvedValue(order);
      ordersRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const result = await service.updateOrderStatus(
        ORDER_ID,
        OrderStatus.SHIPPED,
      );

      expect(result.status).toBe(OrderStatus.SHIPPED);
    });

    it('transitions SHIPPED to DELIVERED', async () => {
      const order = orderWithStatus(OrderStatus.SHIPPED);
      ordersRepo.findOne.mockResolvedValue(order);
      ordersRepo.save.mockImplementation((o: Order) => Promise.resolve(o));

      const result = await service.updateOrderStatus(
        ORDER_ID,
        OrderStatus.DELIVERED,
      );

      expect(result.status).toBe(OrderStatus.DELIVERED);
    });

    it('throws NotFoundException when order does not exist', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus(ORDER_ID, OrderStatus.SHIPPED),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects invalid transition from PENDING to SHIPPED', async () => {
      ordersRepo.findOne.mockResolvedValue(
        orderWithStatus(OrderStatus.PENDING),
      );

      await expect(
        service.updateOrderStatus(ORDER_ID, OrderStatus.SHIPPED),
      ).rejects.toThrow(BadRequestException);
      expect(ordersRepo.save).not.toHaveBeenCalled();
    });

    it('rejects skipping SHIPPED when going PROCESSING to DELIVERED', async () => {
      ordersRepo.findOne.mockResolvedValue(
        orderWithStatus(OrderStatus.PROCESSING),
      );

      await expect(
        service.updateOrderStatus(ORDER_ID, OrderStatus.DELIVERED),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // -----------------------------------------------------------------------
  // processPendingOrders (scheduler hook)
  // -----------------------------------------------------------------------
  describe('processPendingOrders', () => {
    it('bulk-updates PENDING orders and returns the affected count', async () => {
      ordersRepo.update.mockResolvedValue({ affected: 7 });

      const count = await service.processPendingOrders();

      expect(count).toBe(7);
      expect(ordersRepo.update).toHaveBeenCalledWith(
        { status: OrderStatus.PENDING },
        { status: OrderStatus.PROCESSING },
      );
    });

    it('returns 0 (not undefined) when no rows matched', async () => {
      ordersRepo.update.mockResolvedValue({ affected: undefined });
      await expect(service.processPendingOrders()).resolves.toBe(0);
    });
  });
});
